// One-time codes (8 digits, 20 minutes) and parent approval links (7 days). Single use, attempt-limited.
import { sql } from './db.js';
import { bad } from './http.js';
import { codeHash, eightDigitCode, newToken } from './security.js';

export const CODE_MINUTES = 20;
export const PARENT_DAYS = 7;
const MAX_ATTEMPTS = 5;

// Issues a fresh 8-digit code and cancels any earlier unused one for the same purpose.
export async function issueCode(userId, purpose) {
  const code = eightDigitCode();
  await sql`UPDATE user_codes SET used_at = now() WHERE user_id = ${userId} AND purpose = ${purpose} AND used_at IS NULL`;
  await sql`INSERT INTO user_codes (user_id, purpose, code_hash, expires_at)
            VALUES (${userId}, ${purpose}, ${codeHash(purpose, code)}, now() + make_interval(mins => ${CODE_MINUTES}))`;
  return code;
}

// Checks a code. Wrong guesses count against the code; after 5 it stops working.
export async function consumeCode(userId, purpose, code) {
  const rows = await sql`SELECT id, code_hash, attempts FROM user_codes
    WHERE user_id = ${userId} AND purpose = ${purpose} AND used_at IS NULL AND expires_at > now()
    ORDER BY id DESC LIMIT 1`;
  const row = rows[0];
  const expired = bad('code_expired', 'That code has expired or was used too many times. Ask for a new one.');
  if (!row || row.attempts >= MAX_ATTEMPTS) throw expired;
  const ok = row.code_hash === codeHash(purpose, code);
  if (!ok) {
    const upd = await sql`UPDATE user_codes SET attempts = attempts + 1 WHERE id = ${row.id} RETURNING attempts`;
    const left = MAX_ATTEMPTS - upd[0].attempts;
    if (left <= 0) throw expired;
    throw bad('wrong_code', `That code is not right. ${left} ${left === 1 ? 'try' : 'tries'} left.`);
  }
  const used = await sql`UPDATE user_codes SET used_at = now() WHERE id = ${row.id} AND used_at IS NULL RETURNING id`;
  if (!used.length) throw expired; // lost a race with another request
}

export async function issueParentLink(userId) {
  const token = newToken();
  await sql`UPDATE user_codes SET used_at = now() WHERE user_id = ${userId} AND purpose = 'parent' AND used_at IS NULL`;
  await sql`INSERT INTO user_codes (user_id, purpose, code_hash, expires_at)
            VALUES (${userId}, 'parent', ${codeHash('parent', token)}, now() + make_interval(days => ${PARENT_DAYS}))`;
  return token;
}

// Finds the pending child account a parent link belongs to, without using it up.
export async function lookupParentLink(token) {
  const rows = await sql`SELECT c.id AS code_id, u.id AS user_id, u.username, u.created_at
    FROM user_codes c JOIN users u ON u.id = c.user_id
    WHERE c.code_hash = ${codeHash('parent', token)} AND c.purpose = 'parent'
      AND c.used_at IS NULL AND c.expires_at > now() AND u.status = 'pending'
    LIMIT 1`;
  return rows[0] || null;
}

export async function useParentLink(codeId) {
  const r = await sql`UPDATE user_codes SET used_at = now() WHERE id = ${codeId} AND used_at IS NULL RETURNING id`;
  return r.length > 0;
}
