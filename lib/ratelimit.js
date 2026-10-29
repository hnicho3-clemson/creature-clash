// Fixed-window rate limits stored in Postgres, so they hold across every serverless instance.
import { sql } from './db.js';
import { ApiError } from './http.js';
import { limitKey } from './security.js';

export const LIMITS = {
  signup:        { max: 5,  window: 3600 },  // per IP
  loginIp:       { max: 40, window: 900 },   // per IP
  loginUser:     { max: 8,  window: 900 },   // per username, from any IP
  forgotIp:      { max: 15, window: 3600 },
  forgotUser:    { max: 3,  window: 3600 },
  codeIp:        { max: 30, window: 900 },   // email code / reset code guesses per IP
  resendUser:    { max: 3,  window: 900 },
  parentIp:      { max: 30, window: 900 },
  saveUser:      { max: 120, window: 900 },
  matchUser:     { max: 60, window: 3600 },
  shopUser:      { max: 120, window: 900 },
  deleteUser:    { max: 5,  window: 900 },
  statIp:        { max: 200, window: 3600 }, // anonymous usage counts
  errorIp:       { max: 30, window: 3600 },  // error reports
  adminUser:     { max: 120, window: 900 },  // Admin Analytics page loads
  profileUser:   { max: 30, window: 900 },   // display name and portrait changes
};

export async function hit(name, value) {
  const { max, window } = LIMITS[name];
  const key = limitKey(name, value);
  const rows = await sql`
    INSERT INTO rate_limits (key, window_start, count)
    VALUES (${key}, to_timestamp(floor(extract(epoch FROM now()) / ${window}) * ${window}), 1)
    ON CONFLICT (key, window_start) DO UPDATE SET count = rate_limits.count + 1
    RETURNING count, ceil(${window} - (extract(epoch FROM now()) - extract(epoch FROM window_start)))::int AS retry_after`;
  if (Math.random() < 0.02) await sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`;
  const { count, retry_after } = rows[0];
  if (count > max) {
    const mins = Math.max(1, Math.ceil(retry_after / 60));
    throw new ApiError(429, 'rate_limited', `Too many tries. Please wait ${mins} minute${mins === 1 ? '' : 's'} and try again.`, { retryAfter: Math.max(1, retry_after) });
  }
}
