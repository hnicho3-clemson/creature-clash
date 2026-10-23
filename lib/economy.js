// Server-side game economy: XP, levels, part unlocks, DNA, part drops, purchases, campaign and daily rewards.
// The numbers come from lib/catalog.json, which is generated from the game's own source (npm run catalog).
// Matches are simulated in the player's browser, so the server cannot watch them; it checks every report
// for plausibility (kill and nest counts against team size and elapsed time, one payout per match).
import { createRequire } from 'node:module';
const catalog = createRequire(import.meta.url)('./catalog.json');

export const { parts: PARTS, prices: PRICES, rewards: RW, campaign: CAMPAIGN, constraints: CONSTRAINTS, goals: GOALS } = catalog;
export const BUDGET = catalog.budget, PATTERNS = catalog.patterns;

const DAILY_XP = 150, WEEKLY_XP = 500;   // match campaign.js (SUGGESTION values there)
const MIN_SECONDS_FOR_MATCH_XP = 30;     // a match shorter than this pays no base XP (stops start/end farming)
const SECONDS_PER_KILL = 4;              // no creature can be beaten faster than this
const SECONDS_PER_NEST = 8;
const MAX_MATCH_SECONDS = 40 * 60;       // 10-minute battle, slowed to 55% game speed, plus slack
const MAX_NESTS = 7;                     // 6 lane nests + 1 main nest

export const xpNeeded = l => 200 + 100 * (l - 1);
export const slotCount = level => Math.min(64, 6 + Math.floor((level - 1) / 5));

export function defaultProgress() {
  const basics = Object.keys(PARTS).filter(k => PARTS[k].tier === 'Basic');
  return { v: 2, dna: 0, xp: 0, level: 1, unlocked: basics.slice(), owned: basics.slice(), campaign: {}, daily: {}, lastSlot: -1,
    stats: { matches: 0, wins: 0, kills: 0 }, imported: false };
}

export const isUnlocked = (p, id) => !!PARTS[id] && (PARTS[id].tier === 'Free' || p.level >= PARTS[id].lv || p.unlocked.includes(id));
export const isOwned = (p, id) => !!PARTS[id] && (PARTS[id].tier === 'Free' || p.owned.includes(id));

export function grantXP(p, n) {
  n = Math.max(0, Math.min(1e6, Math.round(n) || 0));
  p.xp = Math.min(1e9, p.xp + n);
  const fresh = [];
  while (p.xp >= xpNeeded(p.level) && p.level < 999) {
    p.xp -= xpNeeded(p.level); p.level++;
    for (const k of Object.keys(PARTS)) {
      const d = PARTS[k];
      if (d.tier !== 'Free' && d.lv <= p.level && !p.unlocked.includes(k)) { p.unlocked.push(k); fresh.push(d.name); }
    }
  }
  return fresh;
}

export function buy(p, id) {
  if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(PARTS, id)) return { ok: false, code: 'unknown_part', message: 'That part does not exist.' };
  if (PARTS[id].tier === 'Free' || isOwned(p, id)) return { ok: false, code: 'owned', message: 'You already have that part.' };
  if (!isUnlocked(p, id)) return { ok: false, code: 'locked', message: 'That part is still locked. Level up to unlock it.' };
  const price = PRICES[PARTS[id].tier];
  if (p.dna < price) return { ok: false, code: 'need_dna', message: `You need ${price - p.dna} more DNA.` };
  p.dna -= price; p.owned.push(id);
  return { ok: true, price };
}

// Daily and weekly challenge rotation, identical to rotating() in campaign.js.
export function rotating(kind, dayIndex) {
  const di = dayIndex, wi = Math.floor((di + 3) / 7);
  const ks = CONSTRAINTS, gs = GOALS;
  return kind === 'daily'
    ? { kind, key: 'd' + di, constraint: ks[di % ks.length], goal: gs[(di * 7 + 3) % gs.length], xp: DAILY_XP }
    : { kind, key: 'w' + wi, constraint: ks[(wi * 5 + 2) % ks.length], goal: ['win', 'nests2', 'kills3'][wi % 3], xp: WEEKLY_XP };
}
export const utcDayIndex = (now = Date.now()) => Math.floor(now / 86400000);

// The game builds keys from the player's local date, so accept today's key give or take one day.
export function resolveRotKey(key, now = Date.now()) {
  if (typeof key !== 'string' || !/^[dw]\d{1,7}$/.test(key)) return null;
  const today = utcDayIndex(now);
  for (const di of [today - 1, today, today + 1]) {
    for (const kind of ['daily', 'weekly']) { const r = rotating(kind, di); if (r.key === key) return r; }
  }
  return null;
}

function goalMet(goal, s) {
  if (goal === 'win') return s.final && s.won;
  if (goal === 'kills3') return s.kills >= 3;
  if (goal === 'nests2') return s.nests >= 2;
  if (goal === 'survive') return s.final && !s.eliminated;
  return false;
}

// Applies one match report to progress. `m` is the matches row, `elapsed` seconds since the server saw it start.
// Returns what was earned and the fields to store on the match row.
export function applyMatchReport(p, m, report, elapsed) {
  const earned = { xp: 0, dna: 0, drops: [], levels: [], rot: null, campaign: null, adjusted: false };
  if (elapsed > MAX_MATCH_SECONDS) return { earned, update: { final: true, expired: true } };
  const final = report.final === true;
  const won = final && report.won === true;
  const firstReport = !m.reported_at;
  let kills = m.kills, nests = m.nests, eliminated = m.eliminated;

  if (m.mode === 'battle') {
    if (firstReport) {
      const count = v => (Number.isInteger(v) && v > 0 ? Math.min(v, 1000) : 0);
      const claimedKills = count(report.kills), claimedNests = count(report.nests);
      kills = Math.min(claimedKills, m.team_size, Math.floor(elapsed / SECONDS_PER_KILL));
      nests = Math.min(claimedNests, MAX_NESTS, Math.floor(elapsed / SECONDS_PER_NEST));
      if (kills !== claimedKills || nests !== claimedNests) earned.adjusted = true;
      eliminated = report.eliminated === true;

      earned.dna = kills * RW.dnaBot;           // every opponent is a bot until online play exists
      p.dna = Math.min(1e7, p.dna + earned.dna);

      // Part drops: one per kill at most, only real parts the player has not unlocked.
      const claimed = Array.isArray(report.drops) ? report.drops.slice(0, 8) : [];
      for (const id of claimed) {
        if (earned.drops.length >= kills) { earned.adjusted = true; break; }
        if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(PARTS, id) || PARTS[id].tier === 'Free' || isUnlocked(p, id)) { earned.adjusted = true; continue; }
        p.unlocked.push(id); if (!p.owned.includes(id)) p.owned.push(id); earned.drops.push(id);
      }

      let xp = kills * RW.xpKill + nests * RW.xpNest + (won ? RW.xpWin : 0);
      if (elapsed >= MIN_SECONDS_FOR_MATCH_XP) xp += RW.xpMatch; else earned.adjusted = true;
      earned.xp += xp;
      p.stats.matches++; p.stats.kills += kills; if (won) p.stats.wins++;
    } else if (final && won && m.eliminated && !m.ended_at) {
      // The team won after the player was knocked out: the game pays the win bonus then.
      earned.xp += RW.xpWin; p.stats.wins++;
    }
    if (m.rot_key) {
      const r = resolveRotKey(m.rot_key);
      if (r && !p.daily[r.key] && goalMet(r.goal, { final, won, kills, nests, eliminated })) {
        p.daily[r.key] = true; earned.xp += r.xp; earned.rot = r.key;
      }
    }
  } else if (m.mode === 'challenge') {
    const id = m.challenge_id;
    if (final && report.challengeWin === true && id && Object.prototype.hasOwnProperty.call(CAMPAIGN, id) && !p.campaign[id] && elapsed >= 5) {
      p.campaign[id] = true; earned.xp += CAMPAIGN[id]; earned.campaign = id;
    }
  }

  earned.levels = grantXP(p, earned.xp);
  return { earned, update: { final, won: final ? won : null, kills, nests, eliminated } };
}

// Creatures and campaign completion carried over from a guest save on first sign-in. DNA, XP and parts are not,
// because a browser save can be edited.
export function importGuest(p, campaignFlags) {
  if (p.imported) return false;
  if (campaignFlags && typeof campaignFlags === 'object') {
    for (const id of Object.keys(campaignFlags)) if (campaignFlags[id] === true && Object.prototype.hasOwnProperty.call(CAMPAIGN, id)) p.campaign[id] = true;
  }
  p.imported = true;
  return true;
}
