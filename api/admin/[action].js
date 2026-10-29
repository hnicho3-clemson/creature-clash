// GET /api/admin/stats?days=7|30|90 : the numbers behind the Admin Analytics page (/admin).
// Only signed-in players whose username is listed in the ADMIN_USERNAMES environment variable
// (comma-separated) can read it. Everything returned is a daily total or an account count;
// no player is named and no player's data is shown.
import { sql } from '../../lib/db.js';
import { route, ApiError } from '../../lib/http.js';
import { hit } from '../../lib/ratelimit.js';
import { requireUser } from '../../lib/session.js';
import { isAdmin } from '../../lib/admin.js';

const num = v => (v == null ? 0 : Number(v));
const RANGES = [7, 30, 90];

const actions = {
  async stats({ req, query }) {
    const user = await requireUser(req);
    if (!isAdmin(user)) throw new ApiError(403, 'not_admin', 'This page is only for the game\'s admins.');
    await hit('adminUser', user.id);
    const days = RANGES.includes(Number(query.days)) ? Number(query.days) : 30;

    const daily = await sql`
      SELECT to_char(day, 'YYYY-MM-DD') AS day,
             coalesce(sum(count) FILTER (WHERE event IN ('battle_start','challenge_start')), 0) AS games,
             coalesce(sum(minutes) FILTER (WHERE event = 'match_end'), 0)                      AS minutes,
             coalesce(sum(count) FILTER (WHERE event = 'page_view'), 0)                        AS page_views,
             coalesce(sum(count) FILTER (WHERE event = 'daily_visitor'), 0)                    AS players
      FROM daily_stats
      WHERE day > (now() AT TIME ZONE 'UTC')::date - ${days}::int
      GROUP BY day ORDER BY day`;

    const [all] = await sql`
      SELECT coalesce(sum(count) FILTER (WHERE event IN ('battle_start','challenge_start')), 0) AS games,
             coalesce(sum(minutes) FILTER (WHERE event = 'match_end'), 0)                      AS minutes,
             coalesce(sum(count) FILTER (WHERE event = 'page_view'), 0)                        AS page_views
      FROM daily_stats`;

    const [acc] = await sql`
      SELECT (SELECT count(*) FROM users WHERE status = 'active')                                                   AS accounts,
             (SELECT count(*) FROM users WHERE status = 'active' AND created_at > now() - make_interval(days => ${days}::int)) AS new_accounts,
             (SELECT count(DISTINCT user_id) FROM sessions WHERE last_seen > now() - interval '1 day')              AS signed_in_today,
             (SELECT count(DISTINCT user_id) FROM sessions WHERE last_seen > now() - interval '7 days')             AS signed_in_week,
             (SELECT count(DISTINCT user_id) FROM sessions WHERE last_seen > now() - make_interval(days => ${days}::int)) AS signed_in_range`;

    const errors = await sql`
      SELECT source, count, message, location, to_char(last_seen AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI') AS last_seen, request_id
      FROM error_reports ORDER BY last_seen DESC LIMIT 15`;

    // Every day in the range, including quiet days with no row.
    const byDay = new Map(daily.map(r => [r.day, r]));
    const series = [];
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10);
      const r = byDay.get(d);
      series.push({ day: d, games: num(r?.games), hours: Math.round(num(r?.minutes) / 60 * 100) / 100,
        pageViews: num(r?.page_views), players: num(r?.players) });
    }
    const sum = k => series.reduce((a, r) => a + r[k], 0);
    return {
      days,
      totals: {
        games: sum('games'), hours: Math.round(sum('hours') * 10) / 10, pageViews: sum('pageViews'),
        playersToday: series[series.length - 1].players,
        avgDailyPlayers: Math.round(sum('players') / days * 10) / 10,
      },
      allTime: { games: num(all.games), hours: Math.round(num(all.minutes) / 6) / 10, pageViews: num(all.page_views) },
      accounts: { total: num(acc.accounts), new: num(acc.new_accounts), signedInToday: num(acc.signed_in_today),
        signedInWeek: num(acc.signed_in_week), signedInRange: num(acc.signed_in_range) },
      series,
      errors: errors.map(e => ({ source: e.source, count: num(e.count), message: e.message, location: e.location, lastSeen: e.last_seen, requestId: e.request_id })),
    };
  },
};

export default route(['GET'], async (ctx) => {
  const name = ctx.query.action;
  const fn = Object.prototype.hasOwnProperty.call(actions, name) ? actions[name] : null;
  if (!fn) throw new ApiError(404, 'not_found', 'Not found.');
  return fn(ctx);
});
