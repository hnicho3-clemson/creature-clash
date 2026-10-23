// /api/match/start: the game tells the server a battle or challenge began.
// /api/match/end: the game reports what happened; the server pays XP, DNA and part drops by its own rules.
import { sql } from '../../lib/db.js';
import { route, ApiError, bad } from '../../lib/http.js';
import { requireUser } from '../../lib/session.js';
import { hit } from '../../lib/ratelimit.js';
import { updateProgress } from '../../lib/save.js';
import { applyMatchReport, CAMPAIGN } from '../../lib/economy.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function start(user, body) {
  const mode = body.mode === 'challenge' ? 'challenge' : body.mode === 'battle' ? 'battle' : null;
  if (!mode) throw bad('invalid_mode', 'Unknown match type.');
  const teamSize = Number.isInteger(body.teamSize) && body.teamSize >= 1 && body.teamSize <= 4 ? body.teamSize : null;
  if (!teamSize) throw bad('invalid_team', 'Teams are 1 to 4 creatures.');
  const challengeId = mode === 'challenge' && typeof body.challengeId === 'string' && Object.prototype.hasOwnProperty.call(CAMPAIGN, body.challengeId) ? body.challengeId : null;
  if (mode === 'challenge' && !challengeId) throw bad('invalid_challenge', 'Unknown challenge.');
  const rotKey = mode === 'battle' && typeof body.rotKey === 'string' && /^[dw]\d{1,7}$/.test(body.rotKey) ? body.rotKey : null;
  // Only one open match at a time: starting a new one closes any earlier unreported match without rewards.
  await sql`UPDATE matches SET ended_at = now() WHERE user_id = ${user.id} AND ended_at IS NULL AND reported_at IS NULL`;
  const rows = await sql`INSERT INTO matches (user_id, mode, team_size, challenge_id, rot_key)
    VALUES (${user.id}, ${mode}, ${teamSize}, ${challengeId}, ${rotKey}) RETURNING id`;
  return { matchId: rows[0].id };
}

async function end(user, body) {
  if (typeof body.matchId !== 'string' || !UUID.test(body.matchId)) throw bad('invalid_match', 'Unknown match.');
  const rows = await sql`SELECT *, extract(epoch FROM now() - started_at)::float AS elapsed FROM matches
    WHERE id = ${body.matchId} AND user_id = ${user.id}`;
  const m = rows[0];
  if (!m) throw new ApiError(404, 'invalid_match', 'Unknown match.');
  if (m.ended_at) throw new ApiError(409, 'match_closed', 'This match was already counted.');

  // Claim the report first so two requests for the same match cannot both pay out.
  const final = body.final === true;
  const claim = await sql`UPDATE matches SET
      reported_at = COALESCE(reported_at, now()),
      ended_at = CASE WHEN ${final} THEN now() ELSE ended_at END,
      reports = reports + 1
    WHERE id = ${m.id} AND ended_at IS NULL
      AND (reported_at IS NULL OR ${final})
      AND reports = ${m.reports}
    RETURNING id`;
  if (!claim.length) throw new ApiError(409, 'match_closed', 'This match was already counted.');

  let outcome;
  const saved = await updateProgress(user.id, p => { outcome = applyMatchReport(p, m, body, m.elapsed); return {}; });
  const u = outcome.update, e = outcome.earned;
  await sql`UPDATE matches SET eliminated = ${!!u.eliminated}, won = ${u.won ?? null}, kills = ${u.kills ?? 0}, nests = ${u.nests ?? 0},
      dna_awarded = dna_awarded + ${e.dna}, xp_awarded = xp_awarded + ${e.xp}, ended_at = CASE WHEN ${!!u.expired} THEN now() ELSE ended_at END
    WHERE id = ${m.id}`;
  return { earned: e, progress: saved.progress, rev: saved.rev };
}

export default route(['POST'], async ({ req, body, query }) => {
  const user = await requireUser(req);
  await hit('matchUser', user.id);
  if (query.action === 'start') return start(user, body);
  if (query.action === 'end') return end(user, body);
  throw new ApiError(404, 'not_found', 'Not found.');
});
