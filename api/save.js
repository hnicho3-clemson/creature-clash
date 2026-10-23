// GET /api/save: the signed-in player's cloud save.
// PUT /api/save: store creatures (slots), settings and the last picked slot. Progress cannot be written here.
// POST /api/save: one-time import of a guest save's creatures and campaign completion on first sign-in.
import { route, bad } from '../lib/http.js';
import { requireUser } from '../lib/session.js';
import { hit } from '../lib/ratelimit.js';
import { loadSave, storeSlotsAndSettings, updateProgress, cleanSlots } from '../lib/save.js';
import { importGuest } from '../lib/economy.js';
import { sql } from '../lib/db.js';

export default route(['GET', 'PUT', 'POST'], async ({ req, body }) => {
  const user = await requireUser(req);
  if (req.method === 'GET') return loadSave(user.id);

  await hit('saveUser', user.id);
  if (req.method === 'PUT') {
    for (const k of Object.keys(body)) if (!['slots', 'settings', 'lastSlot'].includes(k)) throw bad('read_only', 'Only creatures and settings can be saved directly.');
    const { progress } = await loadSave(user.id);
    const r = await storeSlotsAndSettings(user.id, body, progress.level);
    return { ok: true, rev: r.rev };
  }

  // POST: guest import, once per account.
  const res = await updateProgress(user.id, p => (importGuest(p, body.campaign) ? {} : { abort: true, already: true }));
  if (res.already) return { ok: true, imported: false, ...(await loadSave(user.id)) };
  if (body.slots !== undefined) {
    const current = await loadSave(user.id);
    const incoming = cleanSlots(body.slots, res.progress.level).filter(Boolean);
    const merged = current.slots.filter(Boolean).concat(incoming);
    const n = Math.min(64, 6 + Math.floor((res.progress.level - 1) / 5));
    const out = merged.slice(0, n); while (out.length < Math.min(6, n)) out.push(null);
    await sql`UPDATE saves SET slots = ${JSON.stringify(out)}::jsonb, rev = rev + 1, updated_at = now() WHERE user_id = ${user.id}`;
  }
  return { ok: true, imported: true, ...(await loadSave(user.id)) };
});
