// Transactional email through Resend's HTTP API. The API key stays on the server.
// Without RESEND_API_KEY (local development only), emails are written to the server log instead.

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const outbox = []; // filled in tests

async function send({ to, subject, text, html }) {
  const key = process.env.RESEND_API_KEY;
  if (process.env.NODE_ENV === 'test') { outbox.push({ to, subject, text }); return; }
  if (!key) {
    if (process.env.VERCEL_ENV === 'production') throw new Error('RESEND_API_KEY is not set');
    console.log(`[email to ${to.replace(/(.).*@/, '$1***@')}] ${subject}\n${text}`);
    return;
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM || 'Creature Clash <noreply@example.com>', to: [to], subject, text, html }),
  });
  if (!r.ok) throw new Error(`Email provider returned ${r.status}`);
}

const shell = (title, inner) => `<!doctype html><html><body style="margin:0;background:#0a0f2a;font-family:Arial,sans-serif;color:#e9f2ff">
<div style="max-width:520px;margin:0 auto;padding:28px 20px"><p style="font-size:12px;letter-spacing:3px;color:#55f0ff;text-transform:uppercase;margin:0 0 6px">Creature Clash</p>
<h1 style="font-size:22px;margin:0 0 16px">${esc(title)}</h1>${inner}
<p style="font-size:12px;color:#97a9cf;margin-top:28px">You got this email because someone used this address on Creature Clash. If that wasn't you or your child, you can ignore it.</p></div></body></html>`;
const codeBox = code => `<p style="font-size:30px;letter-spacing:6px;font-weight:bold;background:#1a2454;border-radius:10px;padding:14px;text-align:center;margin:18px 0">${esc(code)}</p>`;

export function sendVerifyCode(to, username, code) {
  return send({ to, subject: `Your Creature Clash code: ${code}`,
    text: `Hi ${username},\n\nYour code to confirm your email is ${code}. It works for 20 minutes.\n\nIf you didn't make a Creature Clash account, ignore this email.`,
    html: shell('Confirm your email', `<p>Hi ${esc(username)}, enter this code in Creature Clash. It works for 20 minutes.</p>${codeBox(code)}`) });
}

export function sendResetCode(to, username, code, isChild) {
  const who = isChild ? `your child's account "${username}"` : `your account "${username}"`;
  return send({ to, subject: `Creature Clash password reset code: ${code}`,
    text: `Someone asked to reset the password for ${who}.\n\nThe code is ${code}. It works for 20 minutes.\n\nIf nobody asked for this, ignore this email; the password stays the same.`,
    html: shell('Reset a password', `<p>Someone asked to reset the password for ${esc(who)}. The code works for 20 minutes.</p>${codeBox(code)}<p>If nobody asked for this, ignore this email; the password stays the same.</p>`) });
}

export function sendParentRequest(to, username, link) {
  const text = `Hello,\n\nA child wants to make a Creature Clash account with the username "${username}" and gave this email as their parent's or guardian's.\n\n` +
    `Creature Clash is a creature-building battle game played against computer bots. Players cannot chat with or message anyone.\n\n` +
    `If you approve, we store: the username, a scrambled (hashed) password, this email address, and game progress (creatures, levels and in-game DNA). ` +
    `We use this email only for approving the account and resetting the password. We never show it to anyone, sell it, or send marketing.\n\n` +
    `Approve or decline here (the link works for 7 days):\n${link}\n\n` +
    `If you do nothing, the request and everything in it is deleted after 7 days. You can ask us to delete the account at any time.\n\nPrivacy policy: ${new URL('/privacy', link).href}`;
  return send({ to, subject: `Your child asked to join Creature Clash`, text,
    html: shell('Your child asked to join Creature Clash', `<p>A child wants to make an account with the username <b>${esc(username)}</b> and gave this email as their parent's or guardian's.</p>
<p>Creature Clash is a creature-building battle game played against computer bots. Players cannot chat with or message anyone.</p>
<p>If you approve, we store the username, a scrambled (hashed) password, this email address, and game progress. We use this email only for approving the account and password resets. We never show it to anyone, sell it, or send marketing.</p>
<p style="margin:22px 0"><a href="${esc(link)}" style="background:#55f0ff;color:#021018;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Review the request</a></p>
<p style="font-size:13px;color:#97a9cf">The link works for 7 days. If you do nothing, the request and everything in it is deleted. <a href="${esc(new URL('/privacy', link).href)}" style="color:#55f0ff">Privacy policy</a></p>`) });
}

export function sendParentApproved(to, username) {
  return send({ to, subject: `Creature Clash account "${username}" is approved`,
    text: `You approved the Creature Clash account "${username}". They can sign in now.\n\nTo delete the account later, sign in and open Account > Delete account.`,
    html: shell('Account approved', `<p>You approved the account <b>${esc(username)}</b>. They can sign in now.</p><p>To delete it later, sign in and open Account, then Delete account.</p>`) });
}
