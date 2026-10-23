// Server-side input rules. The pages check the same rules for quick feedback, but only these count.
import { bad } from './http.js';

const USERNAME = /^[A-Za-z0-9_]{3,20}$/;
// A pragmatic email shape check; real proof is the code we send.
const EMAIL = /^[^\s@<>()[\]\\,;:"]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export const PASSWORD_MIN = 8, PASSWORD_MAX = 128;

export function str(v, field) {
  if (typeof v !== 'string') throw bad('invalid_' + field, 'Please fill in your ' + field.replace('_', ' ') + '.');
  return v;
}

export function username(v) {
  const s = str(v, 'username').trim();
  if (!USERNAME.test(s)) throw bad('invalid_username', 'Usernames are 3 to 20 letters, numbers or underscores.');
  return { display: s, key: s.toLowerCase() };
}

export function usernameForLookup(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  return USERNAME.test(s) ? s.toLowerCase() : null;
}

export function password(v, usernameKey) {
  if (typeof v !== 'string' || !v.length) throw bad('invalid_password', 'Please enter a password.');
  const len = [...v].length;
  if (len < PASSWORD_MIN) throw bad('weak_password', `Passwords need at least ${PASSWORD_MIN} characters.`);
  if (len > PASSWORD_MAX) throw bad('weak_password', `Passwords can be at most ${PASSWORD_MAX} characters.`);
  if (usernameKey && v.toLowerCase().includes(usernameKey)) throw bad('weak_password', 'Your password cannot contain your username.');
  if (/^(.)\1+$/.test(v) || /^(?:12345678|password|qwerty|letmein|11111111|creatureclash)/i.test(v)) throw bad('weak_password', 'That password is too easy to guess. Try a few words together.');
  return v;
}

export function email(v) {
  const s = str(v, 'email').trim();
  if (s.length > 254 || !EMAIL.test(s)) throw bad('invalid_email', 'Please enter a real email address.');
  return s.toLowerCase();
}

export function birthYear(v, now = new Date()) {
  const y = typeof v === 'string' ? +v : v;
  const thisYear = now.getUTCFullYear();
  if (!Number.isInteger(y) || y < thisYear - 120 || y > thisYear) throw bad('invalid_birth_year', 'Please pick the year you were born.');
  // Under 13 by year alone, erring toward "child" for anyone who could still be 12.
  return { isChild: thisYear - y <= 13 };
}

export function code(v) {
  const s = typeof v === 'string' ? v.replace(/\s|-/g, '') : '';
  if (!/^\d{8}$/.test(s)) throw bad('invalid_code', 'Codes are 8 digits.');
  return s;
}

export function token(v) {
  const s = typeof v === 'string' ? v : '';
  if (!/^[A-Za-z0-9_-]{43}$/.test(s)) throw bad('invalid_link', 'This link is not valid. Ask for a new one.');
  return s;
}
