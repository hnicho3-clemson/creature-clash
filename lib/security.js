// Passwords, tokens and one-time codes.
import { scrypt as scryptCb, randomBytes, randomInt, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCb);
// scrypt N=2^15, r=8, p=1 (~32 MB, OWASP-recommended baseline). Parameters are stored with each hash so they can be raised later.
const N = 2 ** 15, R = 8, P = 1, KEYLEN = 64, MAXMEM = 96 * 1024 * 1024;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${key.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, n, r, p, saltB64, keyB64] = parts;
  const expected = Buffer.from(keyB64, 'base64');
  const key = await scrypt(password.normalize('NFKC'), Buffer.from(saltB64, 'base64'), expected.length, { N: +n, r: +r, p: +p, maxmem: MAXMEM });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Used when the username does not exist, so a wrong username takes as long as a wrong password.
let dummyHash = null;
export async function burnPasswordCheck(password) {
  if (!dummyHash) dummyHash = await hashPassword('not-a-real-password-' + randomBytes(8).toString('hex'));
  await verifyPassword(password, dummyHash);
  return false;
}

export const newToken = () => randomBytes(32).toString('base64url');
export const sha256 = s => createHash('sha256').update(String(s)).digest('hex');

function secret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error('APP_SECRET must be set to at least 32 random characters');
  return s;
}
// Keyed hash for codes, so a leaked database does not reveal live codes (8 digits are cheap to brute-force unkeyed).
export const codeHash = (purpose, value) => createHmac('sha256', secret()).update(purpose + ':' + value).digest('hex');
// Keyed hash for rate-limit keys, so the table never holds IP addresses or usernames.
export const limitKey = (action, value) => action + ':' + createHmac('sha256', secret()).update('rl:' + String(value).toLowerCase()).digest('hex').slice(0, 32);

export const eightDigitCode = () => String(randomInt(0, 100_000_000)).padStart(8, '0');

export function safeEqualHex(a, b) {
  const x = Buffer.from(String(a), 'hex'), y = Buffer.from(String(b), 'hex');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
