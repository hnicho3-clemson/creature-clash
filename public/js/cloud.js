'use strict';
/* Creature Clash — online accounts and cloud saves.
   Guests play exactly as before, with progress in this browser.
   Signed-in players: the server owns DNA, XP, levels and parts. The game still shows rewards instantly,
   then replaces its numbers with the server's answer after each match or purchase.
   Creatures and accessibility settings sync up to the server as they change. */
const Cloud = { user: null, on: false, state: 'loading', pendingApply: null, putTimer: 0, putBody: {} };

async function cloudApi(path, method, body) {
  let r;
  try {
    r = await fetch(path, { method: method || 'GET', credentials: 'same-origin', keepalive: !!(body && body.__keepalive),
      headers: method && method !== 'GET' ? { 'Content-Type': 'application/json', 'X-CC-Request': '1' } : {},
      body: body ? JSON.stringify(body, (k, v) => (k === '__keepalive' ? undefined : v)) : undefined });
  } catch (e) { throw Object.assign(new Error("Couldn't reach the server."), { code: 'network' }); }
  let d = null; try { d = await r.json(); } catch (e) { /* not JSON */ }
  if (!r.ok) throw Object.assign(new Error((d && d.error && d.error.message) || 'Something went wrong.'), { status: r.status, code: d && d.error && d.error.code, data: d && d.error });
  return d;
}

/* ---------- applying server data ---------- */
function cloudApplyProgress(p) { progress = Sec.progress(p, defaultProgress(), PARTS); }
function cloudApplySlots(raw) {
  const s = Sec.slots(raw, DESIGN_CTX, 64) || [];
  const n = Math.max(SLOT_BASE, slotCount());
  const out = s.slice(0, n); while (out.length < n) out.push(null);
  if (!out.some(Boolean)) { out[0] = clone(PRESETS[0]); out[0].name = 'My Chompsworth'; }
  slots = out;
}
function cloudApplySettings(st) {
  if (st && st.a11y) { const keepWelcomed = A11Y.welcomed; Object.assign(A11Y, Sec.a11y(st.a11y, A11Y_DEFAULT, PALETTES)); A11Y.welcomed = A11Y.welcomed || keepWelcomed; applyA11y(); }
}
function cloudApplySave(s) {
  // Don't swap data under the player mid-match or mid-build; wait for the menu.
  if (phase === 'battle' || phase === 'workshop' || phase === 'build') { Cloud.pendingApply = s; return; }
  cloudApplyProgress(s.progress); cloudApplySlots(s.slots); cloudApplySettings(s.settings);
  if (phase === 'menu') refreshMenu();
}
function cloudAfterProgress() {
  if (phase === 'workshop') { try { renderPalette(); renderStats(); renderSlots(); } catch (e) { /* not open */ } }
  if (phase === 'menu') refreshMenu();
}

/* ---------- account chip on the main menu ---------- */
function renderAccountChip() {
  const box = document.getElementById('mAcct'); if (!box) return;
  const text = document.getElementById('mAcctText'), btn = document.getElementById('mAcctBtn');
  box.classList.toggle('on', Cloud.on);
  if (Cloud.state === 'loading') { text.textContent = 'Checking your account…'; btn.hidden = true; return; }
  btn.hidden = false;
  if (Cloud.on) {
    text.textContent = ''; const b = document.createElement('b'); b.textContent = Cloud.user.displayName || Cloud.user.username;
    const src = Cloud.user.portrait && typeof Profile !== 'undefined' ? Profile.imgFor(Cloud.user.portrait) : '';
    if (src) { const img = document.createElement('img'); img.className = 'apor'; img.alt = ''; img.src = src; text.append(img, ' '); }
    text.append('Saving online as ', b); btn.textContent = 'Account'; btn.href = '/account';
  }
  else if (Cloud.state === 'offline') { text.textContent = "Couldn't reach the server. Playing as a guest; progress stays in this browser."; btn.textContent = 'Try again'; btn.href = '/'; }
  else { text.textContent = 'Playing as a guest. Progress stays in this browser.'; btn.textContent = 'Save online'; btn.href = '/signin'; }
}
function cloudSignedOut() {
  if (!Cloud.on) return;
  Cloud.on = false; Cloud.state = 'guest'; Cloud.user = null;
  banner('You were signed out. Sign in again to keep saving online.', 'bad'); renderAccountChip();
}

/* ---------- sync up: creatures and settings (debounced), never progress ---------- */
function cloudQueuePut(part) {
  if (!Cloud.on) return;
  Object.assign(Cloud.putBody, part);
  clearTimeout(Cloud.putTimer);
  Cloud.putTimer = setTimeout(cloudFlush, 1500);
}
function cloudFlush(keepalive) {
  clearTimeout(Cloud.putTimer);
  const body = Cloud.putBody; Cloud.putBody = {};
  if (!Cloud.on || !Object.keys(body).length) return;
  if (keepalive) body.__keepalive = true;
  cloudApi('/api/save', 'PUT', body).catch(e => {
    if (e.status === 401) return cloudSignedOut();
    if (!keepalive) banner("Couldn't save your creatures online. We'll try again.", 'bad');
    Object.assign(Cloud.putBody, body); delete Cloud.putBody.__keepalive;
    Cloud.putTimer = setTimeout(cloudFlush, 15000);
  });
}
addEventListener('pagehide', () => cloudFlush(true));
addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') cloudFlush(true); });

/* ---------- wrap the game's save functions ---------- */
{
  const localProgress = saveProgress, localSlots = saveSlots, localA11y = saveA11y;
  let lastSlotSent = null;
  saveProgress = function () {
    if (!Cloud.on) return localProgress();
    if (progress.lastSlot !== lastSlotSent) { lastSlotSent = progress.lastSlot; cloudQueuePut({ lastSlot: progress.lastSlot }); }
  };
  saveSlots = function () { if (!Cloud.on) return localSlots(); cloudQueuePut({ slots: slots }); };
  saveA11y = function () { localA11y(); cloudQueuePut({ settings: { a11y: A11Y } }); };

  // Purchases: show it right away, then let the server decide.
  const localBuy = tryBuyPart;
  tryBuyPart = function (id) {
    if (!Cloud.on) return localBuy(id);
    const ok = localBuy(id);
    if (ok) cloudApi('/api/shop', 'POST', { partId: id })
      .then(d => { cloudApplyProgress(d.progress); cloudAfterProgress(); })
      .catch(e => {
        if (e.status === 401) cloudSignedOut();
        if (e.data && e.data.progress) cloudApplyProgress(e.data.progress);
        banner(e.message || "Couldn't buy that part.", 'bad'); cloudAfterProgress();
      });
    return ok;
  };

  // Dev commands only touch guest saves; the server ignores them for accounts.
  for (const k of ['addDNA', 'resetDNA', 'unlockAllParts', 'addXP']) {
    const f = COMMANDS[k]; if (!f) continue;
    COMMANDS[k] = function () { if (Cloud.on) { dlog('You are signed in, so the server keeps your DNA, XP and parts. Sign out to test with dev commands.'); return; } return f.apply(this, arguments); };
  }
}

/* ---------- matches: tell the server when they start and what happened ---------- */
{
  const localStart = startMatch, localDrop = grantDroppedPart, localElim = onPlayerEliminated, localEnd = endMatch, localFinish = finishChallenge, localMenu = openMenu;

  startMatch = function () {
    const r = localStart.apply(this, arguments);
    const m = match;
    if (Cloud.on && m && (m.mode === 'battle' || m.mode === 'challenge')) {
      const enemies = world.creatures.filter(c => c.team !== m.player.team && !c.isDummy).length;
      m.cloud = { drops: [], xp: 0, dna: 0, levels: [], queue: Promise.resolve(),
        start: cloudApi('/api/match/start', 'POST', { mode: m.mode, teamSize: Math.max(1, Math.min(4, m.mode === 'battle' ? enemies : 1)),
          challengeId: m.challenge ? m.challenge.id : undefined, rotKey: m.rot ? m.rot.key : undefined })
          .then(d => d.matchId).catch(e => { if (e.status === 401) cloudSignedOut(); return null; }) };
    }
    return r;
  };
  grantDroppedPart = function (id) { localDrop(id); if (match && match.cloud) match.cloud.drops.push(id); };

  function report(m, final) {
    const c = m && m.cloud; if (!c || c.closed) return;
    if (final) c.closed = true;
    const p = m.player;
    const body = { final, won: final && !!m.winner && m.winner === p.team, eliminated: !!m.eliminated, kills: p.kills | 0, nests: p.nestsKilled | 0,
      drops: c.drops.slice(0, 8), challengeWin: m.mode === 'challenge' && final && !!m.chWin };
    c.queue = c.queue.then(async () => {
      const id = await c.start; if (!id) return;
      try {
        const d = await cloudApi('/api/match/end', 'POST', Object.assign({ matchId: id }, body));
        cloudApplyProgress(d.progress);
        const e = d.earned;
        c.xp += e.xp; c.dna += e.dna; c.levels = c.levels.concat(e.levels);
        m.earned.xp = c.xp; m.earned.dna = c.dna; m.earned.levels = c.levels;
        m.earned.drops = (c.serverDrops = (c.serverDrops || []).concat(e.drops)).map(x => PARTS[x] ? PARTS[x].name : x);
        if (m.rot) m.earned.rot = e.rot ? m.rot : (final ? null : m.earned.rot);
        if (m.mode === 'challenge') { m.firstClear = !!e.campaign; }
        if (match === m) {
          if (m.resultsShown) { if (m.mode === 'challenge' && typeof showChallengeResults === 'function') showChallengeResults(); else { const el = document.getElementById('rEarn'); if (el) el.innerHTML = earnChips(); } }
          const dEl = document.getElementById('dEarn'); if (dEl && !document.getElementById('death').hidden) dEl.innerHTML = earnChips();
        }
      } catch (e) {
        if (e.status === 401) return cloudSignedOut();
        if (e.status !== 409) banner("Couldn't save this match's rewards online.", 'bad');
      }
    });
  }
  onPlayerEliminated = function () { const r = localElim.apply(this, arguments); if (match && match.mode === 'battle' && !match.over) report(match, false); return r; };
  endMatch = function () { const r = localEnd.apply(this, arguments); if (match && match.mode === 'battle') report(match, true); return r; };
  finishChallenge = function () { const r = localFinish.apply(this, arguments); if (match && match.mode === 'challenge') report(match, true); return r; };

  openMenu = function () {
    const r = localMenu.apply(this, arguments);
    if (Cloud.pendingApply) { const s = Cloud.pendingApply; Cloud.pendingApply = null; cloudApplySave(s); }
    renderAccountChip();
    return r;
  };
}

/* ---------- start-up ---------- */
async function cloudInit() {
  renderAccountChip();
  let me;
  try { me = await cloudApi('/api/me'); }
  catch (e) { Cloud.state = 'offline'; renderAccountChip(); return; }
  if (!me.user) { Cloud.state = 'guest'; renderAccountChip(); return; }
  try {
    let save = await cloudApi('/api/save');
    if (!save.progress.imported) {
      // First sign-in on this account: bring over the guest's creatures and cleared challenges (not DNA or parts).
      const guestSlots = Sec.slots(store.get(SaveKey('slots'), null), DESIGN_CTX, 64) || [];
      const guestProg = Sec.progress(store.get(SaveKey('progress2'), null), defaultProgress(), PARTS);
      save = await cloudApi('/api/save', 'POST', { slots: guestSlots.filter(Boolean), campaign: guestProg.campaign });
    }
    Cloud.user = me.user; Cloud.on = true; Cloud.state = 'online';
    cloudApplySave(save);
  } catch (e) {
    Cloud.state = e.status === 401 ? 'guest' : 'offline';
  }
  renderAccountChip();
  if (Cloud.on && typeof Profile !== 'undefined') Profile.signedIn();
}
cloudInit();
