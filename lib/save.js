// Cloud saves. progress is changed only through updateProgress() by server rules; slots and settings are
// cleaned with the same sanitiser the game uses (public/js/security.js) before they are stored.
import '../public/js/security.js';
import { sql } from './db.js';
import { ApiError } from './http.js';
import { PARTS, PATTERNS, BUDGET, defaultProgress, slotCount } from './economy.js';

const Sec = globalThis.Sec;
const DESIGN_CTX = { partIds: PARTS, patterns: PATTERNS, maxParts: BUDGET.parts * 2 };
const MAX_SETTINGS_BYTES = 8 * 1024;

export async function loadSave(userId) {
  await sql`INSERT INTO saves (user_id, progress) VALUES (${userId}, ${JSON.stringify(defaultProgress())}::jsonb) ON CONFLICT (user_id) DO NOTHING`;
  const rows = await sql`SELECT progress, slots, settings, rev FROM saves WHERE user_id = ${userId}`;
  const r = rows[0];
  return { progress: normalizeProgress(r.progress), slots: r.slots, settings: r.settings, rev: r.rev };
}

// Fills in any fields an older save lacks.
function normalizeProgress(p) {
  const d = defaultProgress();
  const out = Object.assign(d, p || {});
  out.stats = Object.assign(defaultProgress().stats, (p && p.stats) || {});
  out.unlocked = Array.isArray(out.unlocked) ? out.unlocked : d.unlocked;
  out.owned = Array.isArray(out.owned) ? out.owned : d.owned;
  out.campaign = out.campaign && typeof out.campaign === 'object' ? out.campaign : {};
  out.daily = out.daily && typeof out.daily === 'object' ? out.daily : {};
  return out;
}

// Runs fn(progress) and stores the result, retrying if another request changed the save meanwhile.
export async function updateProgress(userId, fn) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const save = await loadSave(userId);
    const p = save.progress;
    const result = fn(p);
    if (result && result.abort) return { ...result, progress: p, rev: save.rev };
    const rows = await sql`UPDATE saves SET progress = ${JSON.stringify(p)}::jsonb, rev = rev + 1, updated_at = now()
      WHERE user_id = ${userId} AND rev = ${save.rev} RETURNING rev`;
    if (rows.length) return { ...result, progress: p, rev: rows[0].rev };
  }
  throw new ApiError(409, 'busy', 'Your save is busy. Please try again.');
}

export function cleanSlots(raw, level) {
  const s = Sec.slots(raw, DESIGN_CTX, slotCount(level));
  if (!s) throw new ApiError(400, 'invalid_slots', 'Those creatures could not be saved.');
  return s;
}

export function cleanSettings(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ApiError(400, 'invalid_settings', 'Those settings could not be saved.');
  const out = {};
  if (raw.a11y && typeof raw.a11y === 'object' && !Array.isArray(raw.a11y)) out.a11y = flatClean(raw.a11y, 2);
  if (raw.game && typeof raw.game === 'object' && !Array.isArray(raw.game)) out.game = flatClean(raw.game, 2);
  if (Number.isInteger(raw.studioLight) && raw.studioLight >= 0 && raw.studioLight < 16) out.studioLight = raw.studioLight;
  if (JSON.stringify(out).length > MAX_SETTINGS_BYTES) throw new ApiError(413, 'too_large', 'Those settings are too big to save.');
  return out;
}

// Keeps only short scalar values and shallow objects of them. The game re-checks every value on load.
function flatClean(o, depth) {
  const out = {};
  for (const k of Object.keys(o).slice(0, 60)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,31}$/.test(k)) continue;
    const v = o[k];
    if (typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v;
    else if (typeof v === 'string' && v.length <= 40) out[k] = v;
    else if (depth > 1 && v && typeof v === 'object' && !Array.isArray(v)) out[k] = flatClean(v, depth - 1);
  }
  return out;
}

export async function storeSlotsAndSettings(userId, { slots, settings, lastSlot }, level) {
  const s = slots === undefined ? null : JSON.stringify(cleanSlots(slots, level));
  const st = settings === undefined ? null : JSON.stringify(cleanSettings(settings));
  const ls = Number.isInteger(lastSlot) && lastSlot >= -1 && lastSlot < 64 ? lastSlot : null;
  const rows = await sql`UPDATE saves SET
      slots = COALESCE(${s}::jsonb, slots),
      settings = COALESCE(${st}::jsonb, settings),
      progress = CASE WHEN ${ls}::int IS NULL THEN progress ELSE jsonb_set(progress, '{lastSlot}', to_jsonb(${ls}::int)) END,
      rev = rev + 1, updated_at = now()
    WHERE user_id = ${userId} RETURNING rev`;
  return rows[0];
}
