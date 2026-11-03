// /api/auth/signup | verify | resend | login | logout | forgot | reset
import { sql } from '../../lib/db.js';
import { route, ApiError, bad, clientIp, siteOrigin } from '../../lib/http.js';
import * as V from '../../lib/validate.js';
import { hit } from '../../lib/ratelimit.js';
import { hashPassword, verifyPassword, burnPasswordCheck } from '../../lib/security.js';
import { issueCode, consumeCode, issueParentLink, PARENT_DAYS } from '../../lib/codes.js';
import { sendVerifyCode, sendResetCode, sendParentRequest } from '../../lib/email.js';
import { startSession, revokeCurrent, revokeAllFor, clearSessionCookie, publicUser } from '../../lib/session.js';

const GENERIC_FORGOT = { ok: true, message: 'If that account exists, we sent a reset code to its email. It works for 20 minutes.' };
const WRONG_LOGIN = new ApiError(401, 'wrong_login', 'That username and password do not match.');

async function findByUsername(key) {
  if (!key) return null;
  const rows = await sql`SELECT id, username, username_key, pass_hash, contact_email, is_child, status, display_name, portrait FROM users WHERE username_key = ${key}`;
  return rows[0] || null;
}

async function sendPendingMessage(req, user) {
  if (user.is_child) {
    const token = await issueParentLink(user.id);
    await sendParentRequest(user.contact_email, user.username, `${siteOrigin(req)}/parent?t=${token}`);
  } else {
    const code = await issueCode(user.id, 'verify');
    await sendVerifyCode(user.contact_email, user.username, code);
  }
}

const pendingReply = user => ({
  status: 'pending',
  next: user.is_child ? 'parent' : 'verify',
  username: user.username,
  message: user.is_child
    ? `We emailed your grown-up. Once they approve, you can sign in. The email link works for ${PARENT_DAYS} days.`
    : 'We emailed you an 8-digit code. Enter it to finish making your account.',
});

const actions = {
  async signup({ req, res, body }) {
    await hit('signup', clientIp(req));
    const u = V.username(body.username);
    const pw = V.password(body.password, u.key);
    const { isChild } = V.birthYear(body.birthYear);
    const email = V.email(body.email);
    if (body.agree !== true) throw bad('must_agree', isChild ? 'Ask your grown-up to read the rules, then tick the box.' : 'Please agree to the terms and privacy policy.');

    // Unapproved accounts are deleted after the approval window, together with the email address they hold.
    await sql`DELETE FROM users WHERE status = 'pending' AND created_at < now() - make_interval(days => ${PARENT_DAYS})`;

    const hash = await hashPassword(pw);
    const rows = await sql`INSERT INTO users (username, username_key, pass_hash, contact_email, is_child)
      VALUES (${u.display}, ${u.key}, ${hash}, ${email}, ${isChild})
      ON CONFLICT (username_key) DO NOTHING
      RETURNING id, username, contact_email, is_child`;
    if (!rows.length) throw new ApiError(409, 'username_taken', 'That username is taken. Try another one.');
    await sendPendingMessage(req, rows[0]);
    return pendingReply(rows[0]);
  },

  async verify({ req, res, body }) {
    await hit('codeIp', clientIp(req));
    const key = V.usernameForLookup(body.username);
    const code = V.code(body.code);
    const user = await findByUsername(key);
    if (!user || user.status !== 'pending' || user.is_child) throw bad('code_expired', 'That code has expired or was used too many times. Ask for a new one.');
    await consumeCode(user.id, 'verify', code);
    await sql`UPDATE users SET status = 'active', verified_at = now() WHERE id = ${user.id}`;
    await startSession(res, user.id);
    return { ok: true, user: publicUser(user) };
  },

  async resend({ req, body }) {
    const key = V.usernameForLookup(body.username);
    await hit('codeIp', clientIp(req));
    if (key) await hit('resendUser', key);
    const user = await findByUsername(key);
    if (user && user.status === 'pending') await sendPendingMessage(req, user);
    return { ok: true, message: 'If that account is waiting, we sent a new email.' };
  },

  async login({ req, res, body }) {
    const ip = clientIp(req);
    await hit('loginIp', ip);
    const key = V.usernameForLookup(body.username);
    const pw = typeof body.password === 'string' && body.password.length <= V.PASSWORD_MAX * 4 ? body.password : '';
    if (key) await hit('loginUser', key);
    const user = await findByUsername(key);
    const ok = user ? await verifyPassword(pw, user.pass_hash) : await burnPasswordCheck(pw || 'x');
    if (!ok) throw WRONG_LOGIN;
    if (user.status === 'pending') {
      throw new ApiError(403, user.is_child ? 'needs_parent' : 'needs_verify',
        user.is_child ? 'Your grown-up has not approved this account yet. Ask them to check their email.' : 'Please confirm your email first. Enter the code we sent you.',
        { public: { next: user.is_child ? 'parent' : 'verify', username: user.username } });
    }
    await startSession(res, user.id);
    return { ok: true, user: publicUser(user) };
  },

  async logout({ req, res }) {
    await revokeCurrent(req);
    clearSessionCookie(res);
    return { ok: true };
  },

  async forgot({ req, body }) {
    await hit('forgotIp', clientIp(req));
    const key = V.usernameForLookup(body.username);
    if (!key) return GENERIC_FORGOT;
    await hit('forgotUser', key);
    const user = await findByUsername(key);
    if (user && user.status === 'active') {
      const code = await issueCode(user.id, 'reset');
      await sendResetCode(user.contact_email, user.username, code, user.is_child);
    }
    return GENERIC_FORGOT; // same answer either way, so this cannot be used to find accounts
  },

  async reset({ req, res, body }) {
    await hit('codeIp', clientIp(req));
    const key = V.usernameForLookup(body.username);
    const code = V.code(body.code);
    const user = await findByUsername(key);
    if (!user || user.status !== 'active') throw bad('code_expired', 'That code has expired or was used too many times. Ask for a new one.');
    const pw = V.password(body.password, user.username_key);
    await consumeCode(user.id, 'reset', code);
    await sql`UPDATE users SET pass_hash = ${await hashPassword(pw)} WHERE id = ${user.id}`;
    await revokeAllFor(user.id);                // signs out every other device
    await startSession(res, user.id);
    return { ok: true, user: publicUser(user) };
  },
};

export default route(['POST'], async (ctx) => {
  const name = ctx.query.action;
  const fn = Object.prototype.hasOwnProperty.call(actions, name) ? actions[name] : null;
  if (!fn) throw new ApiError(404, 'not_found', 'Not found.');
  return fn(ctx);
});
