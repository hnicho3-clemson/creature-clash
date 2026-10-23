// POST /api/shop {partId}: buy an unlocked part with DNA. Price and balance are checked here, not in the game.
import { route, bad } from '../lib/http.js';
import { requireUser } from '../lib/session.js';
import { hit } from '../lib/ratelimit.js';
import { updateProgress } from '../lib/save.js';
import { buy } from '../lib/economy.js';

export default route(['POST'], async ({ req, body }) => {
  const user = await requireUser(req);
  await hit('shopUser', user.id);
  let outcome;
  const saved = await updateProgress(user.id, p => { outcome = buy(p, body.partId); return outcome.ok ? {} : { abort: true }; });
  if (!outcome.ok) throw bad(outcome.code, outcome.message, { public: { progress: saved.progress } });
  return { ok: true, price: outcome.price, progress: saved.progress, rev: saved.rev };
});
