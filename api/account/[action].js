// /api/account/parent-info | parent-approve | parent-decline : parent approval for under-13 accounts (no sign-in; the emailed link is the key)
// /api/account/delete : the signed-in player deletes their account (password + typing DELETE)
import { sql } from '../../lib/db.js';
import { route, ApiError, bad, clientIp } from '../../lib/http.js';
import * as V from '../../lib/validate.js';
import { hit } from '../../lib/ratelimit.js';
import { lookupParentLink, useParentLink } from '../../lib/codes.js';
import { sendParentApproved } from '../../lib/email.js';
import { requireUser, clearSessionCookie } from '../../lib/session.js';
import { verifyPassword } from '../../lib/security.js';

const LINK_GONE = new ApiError(410, 'link_expired', 'This link has expired or was already used. If your child still wants an account, they can sign up again.');

async function parentRow(req, body) {
  await hit('parentIp', clientIp(req));
  const row = await lookupParentLink(V.token(body.token));
  if (!row) throw LINK_GONE;
  return row;
}

const actions = {
  async 'parent-info'({ req, body }) {
    const row = await parentRow(req, body);
    return { username: row.username, requestedAt: row.created_at };
  },
  async 'parent-approve'({ req, body }) {
    const row = await parentRow(req, body);
    if (!(await useParentLink(row.code_id))) throw LINK_GONE;
    const rows = await sql`UPDATE users SET status = 'active', verified_at = now() WHERE id = ${row.user_id} AND status = 'pending' RETURNING contact_email, username`;
    if (!rows.length) throw LINK_GONE;
    await sendParentApproved(rows[0].contact_email, rows[0].username);
    return { ok: true, username: rows[0].username };
  },
  async 'parent-decline'({ req, body }) {
    const row = await parentRow(req, body);
    if (!(await useParentLink(row.code_id))) throw LINK_GONE;
    await sql`DELETE FROM users WHERE id = ${row.user_id} AND status = 'pending'`; // cascades to codes
    return { ok: true };
  },
  async delete({ req, res, body }) {
    const user = await requireUser(req);
    await hit('deleteUser', user.id);
    if (body.confirm !== 'DELETE') throw bad('confirm', 'Type DELETE in capital letters to confirm.');
    const rows = await sql`SELECT pass_hash FROM users WHERE id = ${user.id}`;
    const pw = typeof body.password === 'string' ? body.password : '';
    if (!rows.length || !(await verifyPassword(pw, rows[0].pass_hash))) throw new ApiError(401, 'wrong_password', 'That password is not right.');
    await sql`DELETE FROM users WHERE id = ${user.id}`; // sessions, codes, saves and matches go with it
    clearSessionCookie(res);
    return { ok: true };
  },
};

export default route(['POST'], async (ctx) => {
  const name = ctx.query.action;
  const fn = Object.prototype.hasOwnProperty.call(actions, name) ? actions[name] : null;
  if (!fn) throw new ApiError(404, 'not_found', 'Not found.');
  return fn(ctx);
});
