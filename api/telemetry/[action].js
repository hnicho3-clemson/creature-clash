// /api/telemetry/stat  {event, minutes?}: counts one anonymous usage event for today.
// /api/telemetry/error {message, location, stack}: records a game error, scrubbed and grouped.
// No sign-in, no cookies read, nothing that identifies the player. Read the results with db/reports.sql.
import { route, ApiError, bad, clientIp } from '../../lib/http.js';
import { hit } from '../../lib/ratelimit.js';
import { EVENTS, countEvent, recordError } from '../../lib/telemetry.js';

const actions = {
  async stat({ req, body }) {
    if (typeof body.event !== 'string' || !EVENTS.includes(body.event)) throw bad('invalid_event', 'Unknown event.');
    await hit('statIp', clientIp(req));
    await countEvent(body.event, body.minutes);
    return { ok: true };
  },
  async error({ req, body }) {
    if (typeof body.message !== 'string' || !body.message.trim()) throw bad('invalid_error', 'Missing message.');
    await hit('errorIp', clientIp(req));
    await recordError({ source: 'client', message: body.message, location: body.location, stack: body.stack });
    return { ok: true };
  },
};

export default route(['POST'], async (ctx) => {
  const name = ctx.query.action;
  const fn = Object.prototype.hasOwnProperty.call(actions, name) ? actions[name] : null;
  if (!fn) throw new ApiError(404, 'not_found', 'Not found.');
  return fn(ctx);
});
