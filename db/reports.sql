-- Creature Clash stats and error reports.
-- Open Neon > SQL Editor, paste ONE query below, and click Run. These only read data.

-- 1. Last 30 days at a glance: visitors, page views, games played and hours played per day.
SELECT day,
       sum(count) FILTER (WHERE event = 'daily_visitor')                       AS visitors,
       sum(count) FILTER (WHERE event = 'page_view')                           AS page_views,
       sum(count) FILTER (WHERE event = 'battle_start')                        AS battles,
       sum(count) FILTER (WHERE event = 'challenge_start')                     AS challenges,
       round(sum(minutes) FILTER (WHERE event = 'match_end') / 60.0, 1)        AS hours_played
FROM daily_stats
WHERE day > (now() AT TIME ZONE 'UTC')::date - 30
GROUP BY day ORDER BY day DESC;

-- 2. All-time totals.
SELECT sum(count) FILTER (WHERE event IN ('battle_start','challenge_start'))   AS games_played,
       round(sum(minutes) FILTER (WHERE event = 'match_end') / 60.0, 1)        AS hours_played,
       sum(count) FILTER (WHERE event = 'daily_visitor')                       AS visitor_days
FROM daily_stats;

-- 3. Accounts: total, new this week, and signed-in players seen in the last day and week.
SELECT (SELECT count(*) FROM users WHERE status = 'active')                                             AS accounts,
       (SELECT count(*) FROM users WHERE status = 'active' AND created_at > now() - interval '7 days')   AS new_this_week,
       (SELECT count(DISTINCT user_id) FROM sessions WHERE last_seen > now() - interval '1 day')        AS active_today,
       (SELECT count(DISTINCT user_id) FROM sessions WHERE last_seen > now() - interval '7 days')       AS active_this_week;

-- 4. Errors, most frequent first. "server" rows also have a request_id you can search for in Vercel's logs.
SELECT source, count, message, location, last_seen, first_seen, request_id
FROM error_reports ORDER BY last_seen DESC, count DESC LIMIT 50;

-- 5. Full details of one error (paste its message between the quotes).
SELECT * FROM error_reports WHERE message LIKE '%paste part of the message here%';

-- 6. After you fix a bug, clear its reports so you can see if it comes back.
-- DELETE FROM error_reports WHERE message LIKE '%paste part of the message here%';
