// Sign-in sessions: a random token in an HttpOnly cookie, its hash in the database, revocable on the server.
import { sql } from './db.js';
import { ApiError, parseCookies, setCookie } from './http.js';
import { newToken, sha256 } from './security.js';
import { isAdmin } from './admin.js';

export const COOKIE = 'cc_session';
const DAYS = 30;
const IDLE_DAYS = 14;

export async function startSession(res, userId) {
  const token = newToken();
  await sql`INSERT INTO sessions (token_hash, user_id, expires_at)
            VALUES (${sha256(token)}, ${userId}, now() + make_interval(days => ${DAYS}))`;
  setCookie(res, COOKIE, token, { maxAge: DAYS * 86400 });
}

export function clearSessionCookie(res) { setCookie(res, COOKIE, '', { maxAge: 0 }); }

// Returns the signed-in user, or null. Expired, idle, revoked or pending accounts count as signed out.
export async function currentUser(req) {
  const token = parseCookies(req)[COOKIE];
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const rows = await sql`
    UPDATE sessions s SET last_seen = now()
    FROM users u
    WHERE s.token_hash = ${sha256(token)} AND u.id = s.user_id
      AND s.revoked_at IS NULL AND s.expires_at > now()
      AND s.last_seen > now() - make_interval(days => ${IDLE_DAYS})
      AND u.status = 'active'
    RETURNING u.id, u.username, u.is_child, u.created_at, u.display_name, u.portrait, s.token_hash`;
  return rows[0] || null;
}

export async function requireUser(req) {
  const u = await currentUser(req);
  if (!u) throw new ApiError(401, 'signed_out', 'Please sign in again.');
  return u;
}

export async function revokeCurrent(req) {
  const token = parseCookies(req)[COOKIE];
  if (token) await sql`UPDATE sessions SET revoked_at = now() WHERE token_hash = ${sha256(token)} AND revoked_at IS NULL`;
}

export async function revokeAllFor(userId) {
  await sql`UPDATE sessions SET revoked_at = now() WHERE user_id = ${userId} AND revoked_at IS NULL`;
}

// What the pages may know about the signed-in player. needsProfile asks the game to show the player card setup.
export const publicUser = u => u && {
  username: u.username, isChild: !!u.is_child,
  displayName: u.display_name || null, portrait: u.portrait || null, needsProfile: !u.display_name || !u.portrait,
  ...(isAdmin(u) ? { isAdmin: true } : {}),
};
