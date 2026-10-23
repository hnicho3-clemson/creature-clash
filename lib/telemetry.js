// First-party usage counts and error reports. Nothing here identifies a player or a browser:
// counts are per day and event, and error text is scrubbed before it is stored.
import { sql } from './db.js';
import { sha256 } from './security.js';

export const EVENTS = ['page_view', 'daily_visitor', 'battle_start', 'challenge_start', 'match_end'];
const MAX_MINUTES = 30;          // one match report counts at most this much play time
const MAX_ERROR_ROWS = 500;      // stop adding new kinds of error past this; existing ones still count up

export async function countEvent(event, minutes) {
  const m = event === 'match_end' && typeof minutes === 'number' && Number.isFinite(minutes)
    ? Math.round(Math.min(MAX_MINUTES, Math.max(0, minutes)) * 100) / 100 : 0;
  await sql`INSERT INTO daily_stats (day, event, count, minutes)
    VALUES ((now() AT TIME ZONE 'UTC')::date, ${event}, 1, ${m})
    ON CONFLICT (day, event) DO UPDATE SET count = daily_stats.count + 1, minutes = daily_stats.minutes + EXCLUDED.minutes`;
}

// Removes anything that could be personal or secret from error text.
export function scrub(v, max) {
  let s = typeof v === 'string' ? v : v == null ? '' : String(v);
  s = s.slice(0, max * 4)
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ')
    .replace(/[^\s@<>"']+@[^\s@<>"']+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/(https?:\/\/[^\s?#"')]+)[?#][^\s"')]*/g, '$1')          // keep the address, drop query and hash
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[token]')
    .replace(/\b\d{6,}\b/g, '[number]')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
  return s.slice(0, max);
}

export async function recordError({ source, message, location, stack, requestId }) {
  const msg = scrub(message, 300) || 'Unknown error';
  const loc = scrub(location, 160) || null;
  const stk = scrub(stack, 1200) || null;
  // Numbers vary between occurrences of the same bug (sizes, ids), so they don't split the group.
  const fp = sha256([source, msg.replace(/\d+/g, '#'), (loc || '').replace(/:\d+(:\d+)?$/, '')].join('|')).slice(0, 40);
  const rid = typeof requestId === 'string' ? requestId.slice(0, 64) : null;
  // The privacy policy promises error reports are kept 90 days at most.
  if (Math.random() < 0.05) await sql`DELETE FROM error_reports WHERE first_seen < now() - interval '90 days'`;
  const upd = await sql`UPDATE error_reports SET count = count + 1, last_seen = now(), request_id = COALESCE(${rid}, request_id),
      location = COALESCE(${loc}, location), stack = COALESCE(${stk}, stack)
    WHERE fingerprint = ${fp} RETURNING fingerprint`;
  if (upd.length) return;
  await sql`INSERT INTO error_reports (fingerprint, source, message, location, stack, request_id)
    SELECT ${fp}, ${source}, ${msg}, ${loc}, ${stk}, ${rid}
    WHERE (SELECT count(*) FROM error_reports) < ${MAX_ERROR_ROWS}
    ON CONFLICT (fingerprint) DO UPDATE SET count = error_reports.count + 1, last_seen = now()`;
}

// Called for unexpected server errors. Never throws: a broken error log must not break the reply.
export async function recordServerError(req, e, requestId) {
  try {
    const route = `${req.method} ${(req.url || '').split('?')[0]}`;
    const top = (e && e.stack ? String(e.stack).split('\n').slice(1, 6).map(l => l.trim()).join('\n') : '');
    await recordError({ source: 'server', message: `${e && e.name}: ${e && e.message}`, location: route, stack: top, requestId });
  } catch { /* ignore */ }
}
