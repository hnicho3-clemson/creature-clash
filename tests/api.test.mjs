// End-to-end API tests against a real Postgres database. Run: npm test
// Negative tests send attacks and bad input and expect rejection; positive tests check normal play still works.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { setupDb, teardownDb, rawQuery, Client, queryLog } from './helpers.mjs';

setupDb();
const auth = (await import('../api/auth/[action].js')).default;
const me = (await import('../api/me.js')).default;
const save = (await import('../api/save.js')).default;
const match = (await import('../api/match/[action].js')).default;
const shop = (await import('../api/shop.js')).default;
const account = (await import('../api/account/[action].js')).default;
const admin = (await import('../api/admin/[action].js')).default;
const { outbox } = await import('../lib/email.js');
const { resetDbForTests } = await import('../lib/db.js');
after(teardownDb);

const A = (c, action, body, opts = {}) => c.call(auth, { body, query: { action }, ...opts });
const lastMail = () => outbox[outbox.length - 1];
const codeIn = m => m.text.match(/\b(\d{8})\b/)[1];
const thisYear = new Date().getUTCFullYear();
let n = 0; const uname = (p = 'player') => `${p}_${++n}`;

async function adult(name = uname()) {
  const c = new Client();
  const r = await A(c, 'signup', { username: name, password: 'green frogs jump', birthYear: thisYear - 25, email: `${name}@example.com`, agree: true });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const v = await A(c, 'verify', { username: name, code: codeIn(lastMail()) });
  assert.equal(v.status, 200, JSON.stringify(v.data));
  return { c, name };
}
const ago = (matchId, seconds) => rawQuery(`UPDATE matches SET started_at = now() - interval '${seconds} seconds' WHERE id = '${matchId}';`);

// ---------------------------------------------------------------- sign-up, verification, sign-in
test('adult sign-up: email code, cannot sign in before verifying, then signed in', async () => {
  const c = new Client(), name = uname();
  const r = await A(c, 'signup', { username: name, password: 'green frogs jump', birthYear: thisYear - 30, email: 'Grown.Up@Example.com', agree: true });
  assert.equal(r.status, 200); assert.equal(r.data.next, 'verify');
  assert.equal(lastMail().to, 'grown.up@example.com');
  const early = await A(new Client(), 'login', { username: name, password: 'green frogs jump' });
  assert.equal(early.status, 403); assert.equal(early.data.error.code, 'needs_verify');
  const wrong = await A(c, 'verify', { username: name, code: '00000000' === codeIn(lastMail()) ? '11111111' : '00000000' });
  assert.equal(wrong.data.error.code, 'wrong_code'); assert.match(wrong.data.error.message, /4 tries left/);
  const ok = await A(c, 'verify', { username: name, code: codeIn(lastMail()) });
  assert.equal(ok.status, 200);
  assert.equal((await c.call(me, { method: 'GET' })).data.user.username, name);
});

test('session cookie is HttpOnly, SameSite=Lax, path-wide, and stores only a hash server-side', async () => {
  const c = new Client(), name = uname();
  await A(c, 'signup', { username: name, password: 'green frogs jump', birthYear: thisYear - 30, email: 'a@example.com', agree: true });
  const v = await A(c, 'verify', { username: name, code: codeIn(lastMail()) });
  const cookie = [].concat(v.headers['set-cookie'])[0];
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.match(cookie, /Path=\//);
  const token = c.cookies.cc_session;
  assert.equal(rawQuery(`SELECT count(*) FROM sessions WHERE token_hash = '${token}';`).trim(), '0');
});

test('under-13 sign-up: parent email with link, child cannot sign in until a parent approves', async () => {
  const c = new Client(), name = uname('kid');
  const r = await A(c, 'signup', { username: name, password: 'purple dino roar', birthYear: thisYear - 9, email: 'parent@example.com', agree: true });
  assert.equal(r.data.next, 'parent');
  const mail = lastMail();
  assert.equal(mail.to, 'parent@example.com'); assert.match(mail.text, /cannot chat/);
  const token = mail.text.match(/\/parent\?t=([A-Za-z0-9_-]{43})/)[1];
  const blocked = await A(c, 'login', { username: name, password: 'purple dino roar' });
  assert.equal(blocked.data.error.code, 'needs_parent');
  // The child cannot use the adult email-code route to skip the parent.
  const sneak = await A(c, 'verify', { username: name, code: '12345678' });
  assert.equal(sneak.status, 400);
  const info = await c.call(account, { query: { action: 'parent-info' }, body: { token } });
  assert.equal(info.data.username, name);
  const ok = await c.call(account, { query: { action: 'parent-approve' }, body: { token } });
  assert.equal(ok.status, 200); assert.match(lastMail().subject, /approved/);
  const again = await c.call(account, { query: { action: 'parent-approve' }, body: { token } });
  assert.equal(again.status, 410);
  assert.equal((await A(c, 'login', { username: name, password: 'purple dino roar' })).status, 200);
});

test('parent can decline, which deletes the request and the email address', async () => {
  const c = new Client(), name = uname('kid');
  await A(c, 'signup', { username: name, password: 'purple dino roar', birthYear: thisYear - 8, email: 'decline@example.com', agree: true });
  const token = lastMail().text.match(/t=([A-Za-z0-9_-]{43})/)[1];
  assert.equal((await c.call(account, { query: { action: 'parent-decline' }, body: { token } })).status, 200);
  assert.equal(rawQuery(`SELECT count(*) FROM users WHERE contact_email = 'decline@example.com';`).trim(), '0');
});

test('forged or malformed parent links are rejected', async () => {
  const c = new Client();
  assert.equal((await c.call(account, { query: { action: 'parent-approve' }, body: { token: 'A'.repeat(43) } })).status, 410);
  assert.equal((await c.call(account, { query: { action: 'parent-approve' }, body: { token: "' OR 1=1 --" } })).status, 400);
});

test('unapproved accounts are purged after 7 days', async () => {
  const c = new Client(), name = uname('stale');
  await A(c, 'signup', { username: name, password: 'purple dino roar', birthYear: thisYear - 9, email: 'stale@example.com', agree: true });
  rawQuery(`UPDATE users SET created_at = now() - interval '8 days' WHERE username_key = '${name}';`);
  await A(new Client(), 'signup', { username: uname(), password: 'purple dino roar', birthYear: thisYear - 30, email: 'x@example.com', agree: true });
  assert.equal(rawQuery(`SELECT count(*) FROM users WHERE username_key = '${name}';`).trim(), '0');
});

test('usernames are unique ignoring case', async () => {
  const name = uname('Case');
  await adult(name);
  const r = await A(new Client(), 'signup', { username: name.toUpperCase(), password: 'green frogs jump', birthYear: thisYear - 30, email: 'b@example.com', agree: true });
  assert.equal(r.status, 409); assert.equal(r.data.error.code, 'username_taken');
});

test('SQL injection in usernames, codes and emails is rejected and changes nothing', async () => {
  const c = new Client();
  const before = rawQuery('SELECT count(*) FROM users;').trim();
  for (const username of ["admin'--", "x'); DROP TABLE users;--", 'a" OR "1"="1', '${1+1}', '{"$gt":""}']) {
    const r = await A(new Client(), 'signup', { username, password: 'green frogs jump', birthYear: 1990, email: 'i@example.com', agree: true });
    assert.equal(r.data.error.code, 'invalid_username', username);
    const l = await A(c, 'login', { username, password: "' OR '1'='1" });
    assert.equal(l.status, 401, username);
  }
  assert.equal((await A(c, 'verify', { username: 'someone', code: "1' OR '1'='1" })).data.error.code, 'invalid_code');
  assert.equal((await A(new Client(), 'signup', { username: uname(), password: 'green frogs jump', birthYear: 1990, email: "a@b.com'; DROP TABLE saves;--", agree: true })).data.error.code, 'invalid_email');
  assert.equal(rawQuery('SELECT count(*) FROM users;').trim(), before);
  assert.equal(rawQuery("SELECT to_regclass('saves') IS NOT NULL;").trim(), 't');
});

test('NoSQL-style objects and arrays in fields are rejected', async () => {
  const c = new Client();
  for (const v of [{ $ne: null }, ['a'], 42, null]) {
    const r = await A(c, 'login', { username: v, password: v });
    assert.equal(r.status, 401);
  }
  const r = await A(c, 'signup', { username: { $gt: '' }, password: 'green frogs jump', birthYear: 1990, email: 'i@example.com', agree: true });
  assert.equal(r.status, 400);
});

test('password rules: length, not the username, not obvious', async () => {
  const c = new Client(), name = uname();
  const base = { username: name, birthYear: 1990, email: 'p@example.com', agree: true };
  assert.equal((await A(c, 'signup', { ...base, password: 'short' })).data.error.code, 'weak_password');
  assert.equal((await A(c, 'signup', { ...base, password: name + '12345' })).data.error.code, 'weak_password');
  assert.equal((await A(c, 'signup', { ...base, password: 'password123' })).data.error.code, 'weak_password');
  assert.equal((await A(c, 'signup', { ...base, password: 'x'.repeat(129) })).data.error.code, 'weak_password');
  assert.equal((await A(c, 'signup', { ...base, password: 'green frogs jump', agree: false })).data.error.code, 'must_agree');
});

test('passwords are stored as scrypt hashes, never in plain text', async () => {
  const { name } = await adult();
  const h = rawQuery(`SELECT pass_hash FROM users WHERE username_key = '${name}';`).trim();
  assert.match(h, /^scrypt\$32768\$8\$1\$/); assert.ok(!h.includes('green frogs jump'));
});

test('wrong username and wrong password get the same answer', async () => {
  const { name } = await adult();
  const a = await A(new Client(), 'login', { username: name, password: 'nope nope nope' });
  const b = await A(new Client(), 'login', { username: 'nobody_here_' + n, password: 'nope nope nope' });
  assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.data.error.message, b.data.error.message);
});

test('login is rate limited per username, with Retry-After', async () => {
  const { name } = await adult();
  let last;
  for (let i = 0; i < 9; i++) last = await A(new Client(), 'login', { username: name, password: 'wrong wrong ' + i });
  assert.equal(last.status, 429); assert.ok(+last.headers['retry-after'] > 0);
  // the right password is also refused while limited
  assert.equal((await A(new Client(), 'login', { username: name, password: 'green frogs jump' })).status, 429);
});

test('rate limit table holds hashes, not IPs or usernames', async () => {
  const keys = rawQuery('SELECT key FROM rate_limits;');
  assert.ok(!/203\.0\.113|player_|kid_/.test(keys));
});

test('sign-up is rate limited per IP', async () => {
  const c = new Client('198.51.100.7');
  let last;
  for (let i = 0; i < 6; i++) last = await A(c, 'signup', { username: uname('flood'), password: 'green frogs jump', birthYear: 1990, email: 'f@example.com', agree: true });
  assert.equal(last.status, 429);
});

test('logout revokes the session on the server, not just the cookie', async () => {
  const { c } = await adult();
  const thief = new Client(); thief.cookies = { ...c.cookies };
  assert.ok((await thief.call(me, { method: 'GET' })).data.user);
  await A(c, 'logout', {});
  assert.equal((await thief.call(me, { method: 'GET' })).data.user, null);
});

test('tampered, expired and idle sessions count as signed out', async () => {
  const { c } = await adult();
  const t = new Client(); t.cookies = { cc_session: c.cookies.cc_session.slice(0, -2) + 'AA' };
  assert.equal((await t.call(me, { method: 'GET' })).data.user, null);
  rawQuery(`UPDATE sessions SET last_seen = now() - interval '15 days';`);
  assert.equal((await c.call(me, { method: 'GET' })).data.user, null);
});

test('password reset: generic answer, code by email, revokes old sessions, old password stops working', async () => {
  const { c, name } = await adult();
  const g1 = await A(new Client(), 'forgot', { username: 'does_not_exist' });
  const before = outbox.length;
  const g2 = await A(new Client(), 'forgot', { username: name });
  assert.deepEqual(g1.data, g2.data);
  assert.equal(outbox.length, before + 1);
  const code = codeIn(lastMail());
  const r = new Client();
  assert.equal((await A(r, 'reset', { username: name, code, password: 'short' })).data.error.code, 'weak_password');
  const ok = await A(r, 'reset', { username: name, code, password: 'blue whales sing' });
  assert.equal(ok.status, 200);
  assert.equal((await c.call(me, { method: 'GET' })).data.user, null, 'old device signed out');
  assert.equal((await A(new Client(), 'login', { username: name, password: 'green frogs jump' })).status, 401);
  assert.equal((await A(new Client(), 'login', { username: name, password: 'blue whales sing' })).status, 200);
  assert.equal((await A(new Client(), 'reset', { username: name, code, password: 'another one here' })).data.error.code, 'code_expired', 'codes are single use');
});

test('reset codes stop working after 5 wrong guesses and after 20 minutes', async () => {
  const { name } = await adult();
  await A(new Client(), 'forgot', { username: name });
  const real = codeIn(lastMail());
  const wrong = real === '00000000' ? '11111111' : '00000000';
  for (let i = 0; i < 5; i++) await A(new Client(), 'reset', { username: name, code: wrong, password: 'blue whales sing' });
  assert.equal((await A(new Client(), 'reset', { username: name, code: real, password: 'blue whales sing' })).data.error.code, 'code_expired');
  await A(new Client(), 'forgot', { username: name });
  const fresh = codeIn(lastMail());
  rawQuery(`UPDATE user_codes SET expires_at = now() - interval '1 minute' WHERE used_at IS NULL;`);
  assert.equal((await A(new Client(), 'reset', { username: name, code: fresh, password: 'blue whales sing' })).data.error.code, 'code_expired');
});

test('codes are stored as keyed hashes', async () => {
  const { name } = await adult();
  await A(new Client(), 'forgot', { username: name });
  const code = codeIn(lastMail());
  assert.equal(rawQuery(`SELECT count(*) FROM user_codes WHERE code_hash LIKE '%${code}%';`).trim(), '0');
});

test('a child account\'s reset code goes to the parent', async () => {
  const c = new Client(), name = uname('kid');
  await A(c, 'signup', { username: name, password: 'purple dino roar', birthYear: thisYear - 10, email: 'mom@example.com', agree: true });
  const token = lastMail().text.match(/t=([A-Za-z0-9_-]{43})/)[1];
  await c.call(account, { query: { action: 'parent-approve' }, body: { token } });
  await A(new Client(), 'forgot', { username: name });
  assert.equal(lastMail().to, 'mom@example.com'); assert.match(lastMail().text, /your child's account/);
});

// ---------------------------------------------------------------- request hygiene
test('CSRF: state changes need the custom header and a same-site Origin', async () => {
  const c = new Client();
  const noHeader = await c.call(auth, { query: { action: 'login' }, body: { username: 'a', password: 'b' }, headers: { 'x-cc-request': '0' } });
  assert.equal(noHeader.status, 403); assert.equal(noHeader.data.error.code, 'csrf');
  const evil = await c.call(auth, { query: { action: 'login' }, body: { username: 'a', password: 'b' }, headers: { origin: 'https://evil.example' } });
  assert.equal(evil.status, 403);
  const same = await c.call(auth, { query: { action: 'login' }, body: { username: 'abc', password: 'b' }, headers: { origin: 'https://clash.test' } });
  assert.equal(same.status, 401);
});

test('wrong methods, content types, malformed JSON and unknown actions are refused', async () => {
  const c = new Client();
  assert.equal((await c.call(auth, { method: 'GET', query: { action: 'login' } })).status, 405);
  assert.equal((await c.call(auth, { query: { action: 'login' }, raw: 'username=a', headers: { 'content-type': 'application/x-www-form-urlencoded' } })).status, 415);
  assert.equal((await c.call(auth, { query: { action: 'login' }, raw: '{"username":' })).status, 400);
  assert.equal((await c.call(auth, { query: { action: '__proto__' }, body: {} })).status, 404);
  assert.equal((await c.call(auth, { query: { action: 'constructor' }, body: {} })).status, 404);
});

test('__proto__ in a JSON body does not pollute objects', async () => {
  const c = new Client();
  await c.call(auth, { query: { action: 'login' }, raw: '{"__proto__":{"polluted":true},"username":"abc","password":"x"}' });
  assert.equal(({}).polluted, undefined);
});

test('server errors return a generic message with a request id and no internals', async () => {
  const real = globalThis.__CC_TEST_SQL__;
  globalThis.__CC_TEST_SQL__ = async () => { throw new Error('connection to db.internal:5432 failed password=hunter2'); };
  resetDbForTests();
  const orig = console.error; let logged = ''; console.error = (m) => { logged += m; };
  try {
    const r = await new Client().call(me, { method: 'GET', headers: { cookie: 'cc_session=' + 'A'.repeat(43) } });
    assert.equal(r.status, 500); assert.equal(r.data.error.code, 'server'); assert.ok(r.data.error.requestId);
    assert.ok(!JSON.stringify(r.data).includes('hunter2') && !JSON.stringify(r.data).includes('5432'));
  } finally { console.error = orig; globalThis.__CC_TEST_SQL__ = real; resetDbForTests(); }
  assert.ok(logged.length > 0);
});

// ---------------------------------------------------------------- saves
test('saves need sign-in', async () => {
  assert.equal((await new Client().call(save, { method: 'GET' })).status, 401);
  assert.equal((await new Client().call(save, { method: 'PUT', body: { slots: [] } })).status, 401);
});

test('new save starts with basics only; DNA, XP and parts cannot be written directly', async () => {
  const { c } = await adult();
  const s = await c.call(save, { method: 'GET' });
  assert.equal(s.data.progress.dna, 0); assert.equal(s.data.progress.level, 1);
  for (const body of [{ progress: { dna: 99999 } }, { dna: 5000 }, { slots: [], level: 50 }, { owned: ['wings'] }]) {
    const r = await c.call(save, { method: 'PUT', body });
    assert.equal(r.status, 400, JSON.stringify(body)); assert.equal(r.data.error.code, 'read_only');
  }
  assert.equal((await c.call(save, { method: 'GET' })).data.progress.dna, 0);
});

test('saved creatures are cleaned on the server (XSS names, bad colours, fake parts, huge numbers)', async () => {
  const { c } = await adult();
  const evil = { name: '<img src=x onerror=alert(1)>‮', color: '#fff" onmouseover="alert(1)', accent: 'red', pattern: '<svg/onload=1>',
    body: { w: 1e308, h: 'x', l: -5 }, parts: [{ id: '__proto__', p: [1, 0, 0] }, { id: 'fins', p: [1, 0, 0], s: 1e9 }, { id: 'hax', p: [0, 1, 0] }], isAdmin: true };
  const r = await c.call(save, { method: 'PUT', body: { slots: [evil, null, 'junk'] } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  const s = (await c.call(save, { method: 'GET' })).data.slots;
  assert.equal(s[0].name, '<img src=x onerror=alert'); // kept as text (capped at 24 characters); the game escapes it when shown
  assert.equal(s[0].color, '#55c8ff'); assert.equal(s[0].pattern, 'spots'); assert.equal(s[0].isAdmin, undefined);
  assert.deepEqual(s[0].body, { w: 1.6, h: 1, l: 0.8 }); assert.equal(s[0].parts.length, 1); assert.equal(s[0].parts[0].s, 1.6);
  assert.equal(s[1], null); assert.equal(s[2], null);
});

test('settings are size-limited and only keep simple values', async () => {
  const { c } = await adult();
  const big = { a11y: Object.fromEntries(Array.from({ length: 60 }, (_, i) => ['k' + i, 'x'.repeat(40)])), game: { bloom: false, evil: { deep: { deeper: 1 } }, fn: 'x'.repeat(500) }, studioLight: 2 };
  const r = await c.call(save, { method: 'PUT', body: { settings: big } });
  assert.equal(r.status, 200);
  const st = (await c.call(save, { method: 'GET' })).data.settings;
  assert.equal(st.game.fn, undefined); assert.deepEqual(st.game.evil, {}); assert.equal(st.studioLight, 2);
  const huge = await c.call(save, { method: 'PUT', raw: JSON.stringify({ settings: { a11y: { x: 'y'.repeat(300 * 1024) } } }) });
  assert.equal(huge.status, 413);
});

test('players only ever see their own save, whatever ids they send', async () => {
  const a = await adult(), b = await adult();
  await a.c.call(save, { method: 'PUT', body: { slots: [{ name: 'Secret Alpha', color: '#112233', accent: '#445566', pattern: 'spots', body: { w: 1, h: 1, l: 1 }, parts: [] }] } });
  const bid = rawQuery(`SELECT id FROM users WHERE username_key = '${a.name}';`).trim();
  const r = await b.c.call(save, { method: 'GET', query: { user_id: bid, userId: bid } });
  assert.ok(!JSON.stringify(r.data).includes('Secret Alpha'));
});

test('guest import: creatures and campaign flags once, never DNA or parts', async () => {
  const { c } = await adult();
  const slot = { name: 'Guest Gloop', color: '#55c8ff', accent: '#ffd23d', pattern: 'spots', body: { w: 1, h: 1, l: 1 }, parts: [] };
  const r = await c.call(save, { method: 'POST', body: { slots: [slot], campaign: { wobbles: true, fake: true }, dna: 9999, progress: { dna: 9999, level: 40 } } });
  assert.equal(r.data.imported, true); assert.equal(r.data.progress.dna, 0); assert.equal(r.data.progress.level, 1);
  assert.equal(r.data.progress.campaign.wobbles, true); assert.equal(r.data.progress.campaign.fake, undefined);
  assert.ok(r.data.slots.some(s => s && s.name === 'Guest Gloop'));
  const again = await c.call(save, { method: 'POST', body: { slots: [slot] } });
  assert.equal(again.data.imported, false);
  assert.equal(again.data.slots.filter(s => s && s.name === 'Guest Gloop').length, 1);
});

// ---------------------------------------------------------------- matches and economy
test('a normal battle pays DNA, XP and stats by server rules', async () => {
  const { c } = await adult();
  const { matchId } = (await c.call(match, { query: { action: 'start' }, body: { mode: 'battle', teamSize: 3 } })).data;
  await ago(matchId, 300);
  const r = await c.call(match, { query: { action: 'end' }, body: { matchId, final: true, won: true, kills: 3, nests: 2 } });
  assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.earned.dna, 45);                 // 3 bot kills x 15
  assert.equal(r.data.earned.xp, 100 + 30 + 30 + 50);  // match + kills + nests + win
  assert.equal(r.data.progress.dna, 45); assert.equal(r.data.progress.stats.wins, 1);
  const again = await c.call(match, { query: { action: 'end' }, body: { matchId, final: true, won: true, kills: 3 } });
  assert.equal(again.status, 409, 'paid once');
});

test('impossible results are capped: kills by team size and time, quick matches pay no base XP', async () => {
  const { c } = await adult();
  const { matchId } = (await c.call(match, { query: { action: 'start' }, body: { mode: 'battle', teamSize: 3 } })).data;
  const r = await c.call(match, { query: { action: 'end' }, body: { matchId, final: true, won: false, kills: 500, nests: 99, drops: [] } });
  assert.equal(r.data.earned.dna, 0); assert.equal(r.data.earned.xp, 0); assert.equal(r.data.earned.adjusted, true);
  const m2 = (await c.call(match, { query: { action: 'start' }, body: { mode: 'battle', teamSize: 3 } })).data.matchId;
  await ago(m2, 600);
  const r2 = await c.call(match, { query: { action: 'end' }, body: { matchId: m2, final: true, won: false, kills: 500, nests: 99 } });
  assert.equal(r2.data.earned.dna, 45, 'at most 3 kills in a 3v3');
});

test('knocked out first, team wins later: one payout plus the win bonus', async () => {
  const { c } = await adult();
  const { matchId } = (await c.call(match, { query: { action: 'start' }, body: { mode: 'battle', teamSize: 3 } })).data;
  await ago(matchId, 200);
  const first = await c.call(match, { query: { action: 'end' }, body: { matchId, final: false, eliminated: true, kills: 1, nests: 0 } });
  assert.equal(first.data.earned.xp, 110); assert.equal(first.data.earned.dna, 15);
  const dup = await c.call(match, { query: { action: 'end' }, body: { matchId, final: false, eliminated: true, kills: 3 } });
  assert.equal(dup.status, 409);
  const fin = await c.call(match, { query: { action: 'end' }, body: { matchId, final: true, won: true, kills: 3 } });
  assert.equal(fin.data.earned.xp, 50); assert.equal(fin.data.earned.dna, 0, 'no extra kills after being knocked out');
});

test('part drops: at most one per kill, real locked parts only', async () => {
  const { c } = await adult();
  const { matchId } = (await c.call(match, { query: { action: 'start' }, body: { mode: 'battle', teamSize: 3 } })).data;
  await ago(matchId, 120);
  const r = await c.call(match, { query: { action: 'end' }, body: { matchId, final: true, kills: 1, drops: ['shortLegs', 'googlyEye', 'nope', '__proto__', 'wings', 'spiderLegs'] } });
  assert.deepEqual(r.data.earned.drops, ['wings']);
  assert.ok(r.data.progress.owned.includes('wings')); assert.ok(!r.data.progress.owned.includes('spiderLegs'));
});

test('matches belong to their player', async () => {
  const a = await adult(), b = await adult();
  const { matchId } = (await a.c.call(match, { query: { action: 'start' }, body: { mode: 'battle', teamSize: 3 } })).data;
  assert.equal((await b.c.call(match, { query: { action: 'end' }, body: { matchId, final: true, kills: 3 } })).status, 404);
  assert.equal((await b.c.call(match, { query: { action: 'end' }, body: { matchId: "x' OR '1'='1", final: true } })).status, 400);
});

test('campaign XP is paid once per challenge, and only for real challenge ids', async () => {
  const { c } = await adult();
  const run = async () => { const { matchId } = (await c.call(match, { query: { action: 'start' }, body: { mode: 'challenge', teamSize: 1, challengeId: 'gobbler' } })).data; await ago(matchId, 60); return c.call(match, { query: { action: 'end' }, body: { matchId, final: true, challengeWin: true } }); };
  assert.equal((await run()).data.earned.xp, 200);
  assert.equal((await run()).data.earned.xp, 0);
  assert.equal((await c.call(match, { query: { action: 'start' }, body: { mode: 'challenge', teamSize: 1, challengeId: 'toString' } })).status, 400);
});

test('daily challenge pays once, only for today\'s key and only when the goal is met', async () => {
  const { rotating, utcDayIndex } = await import('../lib/economy.js');
  const today = rotating('daily', utcDayIndex());
  const { c } = await adult();
  const play = async (rotKey, report) => { const { matchId } = (await c.call(match, { query: { action: 'start' }, body: { mode: 'battle', teamSize: 3, rotKey } })).data; await ago(matchId, 400); return c.call(match, { query: { action: 'end' }, body: { matchId, final: true, ...report } }); };
  const meets = { won: true, kills: 3, nests: 2, eliminated: false };
  assert.equal((await play('d1', meets)).data.earned.rot, null, 'old key');
  const r = await play(today.key, meets);
  assert.equal(r.data.earned.rot, today.key);
  assert.equal((await play(today.key, meets)).data.earned.rot, null, 'once');
});

// ---------------------------------------------------------------- shop
test('shop: price and balance checked on the server', async () => {
  const { c } = await adult();
  const post = id => c.call(shop, { body: { partId: id } });
  assert.equal((await post('spiderLegs')).data.error.code, 'locked');
  assert.equal((await post('__proto__')).data.error.code, 'unknown_part');
  assert.equal((await post('shortLegs')).data.error.code, 'owned');
  // earn 45 DNA, then level to 2 so Long Legs (65) unlocks
  for (let i = 0; i < 2; i++) { const { matchId } = (await c.call(match, { query: { action: 'start' }, body: { mode: 'battle', teamSize: 3 } })).data; await ago(matchId, 300); await c.call(match, { query: { action: 'end' }, body: { matchId, final: true, won: true, kills: 3, nests: 2 } }); }
  const ok = await post('longLegs');
  assert.equal(ok.status, 200, JSON.stringify(ok.data)); assert.equal(ok.data.progress.dna, 90 - 65);
  assert.equal((await post('longLegs')).data.error.code, 'owned');
  assert.equal((await post('horns')).data.error.code, 'need_dna');
});

// ---------------------------------------------------------------- account deletion
test('delete account needs DELETE and the password, then removes everything', async () => {
  const { c, name } = await adult();
  await c.call(save, { method: 'GET' });
  assert.equal((await c.call(account, { query: { action: 'delete' }, body: { confirm: 'delete', password: 'green frogs jump' } })).data.error.code, 'confirm');
  assert.equal((await c.call(account, { query: { action: 'delete' }, body: { confirm: 'DELETE', password: 'wrong one here' } })).status, 401);
  const ok = await c.call(account, { query: { action: 'delete' }, body: { confirm: 'DELETE', password: 'green frogs jump' } });
  assert.equal(ok.status, 200);
  assert.equal(rawQuery(`SELECT count(*) FROM users WHERE username_key = '${name}';`).trim(), '0');
  assert.equal(rawQuery(`SELECT count(*) FROM saves s LEFT JOIN users u ON u.id = s.user_id WHERE u.id IS NULL;`).trim(), '0');
  assert.equal((await c.call(me, { method: 'GET' })).data.user, null);
});

// ---------------------------------------------------------------- player card and Admin Analytics
test('player card: new accounts need one; name and portrait are checked on the server', async () => {
  const { c } = await adult();
  let u = (await c.call(me, { method: 'GET' })).data.user;
  assert.equal(u.needsProfile, true); assert.equal(u.displayName, null);
  const P = body => c.call(account, { body, query: { action: 'profile' } });
  for (const bad of [{ displayName: 'x', portrait: 'c1' }, { displayName: '<b>hi</b>', portrait: 'c1' }, { displayName: 'Sh1t Lord', portrait: 'c1' },
    { displayName: '555 123 4567', portrait: 'c1' }, { displayName: 'Good Name', portrait: 'c99' }, { displayName: 'Good Name', portrait: '../x' },
    { displayName: ['a'], portrait: 'c1' }, { displayName: 'Good Name' }]) {
    const r = await P(bad); assert.equal(r.status, 400, JSON.stringify(bad));
  }
  const ok = await P({ displayName: '  Captain   Wobble ', portrait: 'c3' });
  assert.equal(ok.status, 200); assert.equal(ok.data.user.displayName, 'Captain Wobble');
  u = (await c.call(me, { method: 'GET' })).data.user;
  assert.equal(u.needsProfile, false); assert.equal(u.portrait, 'c3');
  assert.equal((await new Client().call(account, { body: { displayName: 'Sneaky', portrait: 'c1' }, query: { action: 'profile' } })).status, 401);
});

test('admin analytics: only ADMIN_USERNAMES can read it, and it only holds totals', async () => {
  const boss = await adult(), other = await adult();
  rawQuery(`INSERT INTO daily_stats (day, event, count, minutes) VALUES ((now() AT TIME ZONE 'UTC')::date, 'battle_start', 4, 0), ((now() AT TIME ZONE 'UTC')::date, 'match_end', 4, 90), ((now() AT TIME ZONE 'UTC')::date - 3, 'page_view', 9, 0), ((now() AT TIME ZONE 'UTC')::date, 'daily_visitor', 2, 0) ON CONFLICT (day, event) DO UPDATE SET count = EXCLUDED.count, minutes = EXCLUDED.minutes;`);
  const prev = process.env.ADMIN_USERNAMES;
  process.env.ADMIN_USERNAMES = ' someone , ' + boss.name.toUpperCase();
  try {
    const G = (c, query) => c.call(admin, { method: 'GET', query: { action: 'stats', ...query } });
    assert.equal((await G(new Client())).status, 401);
    assert.equal((await G(other.c)).status, 403);
    assert.equal((await other.c.call(me, { method: 'GET' })).data.user.isAdmin, undefined);
    assert.equal((await boss.c.call(me, { method: 'GET' })).data.user.isAdmin, true);
    const r = await G(boss.c, { days: '7' });
    assert.equal(r.status, 200, JSON.stringify(r.data));
    assert.equal(r.data.days, 7); assert.equal(r.data.series.length, 7);
    assert.equal(r.data.totals.games, 4); assert.equal(r.data.totals.hours, 1.5);
    assert.equal(r.data.totals.pageViews, 9); assert.equal(r.data.totals.playersToday, 2);
    assert.ok(r.data.accounts.total >= 2);
    assert.equal((await G(boss.c, { days: '9999' })).data.days, 30);
    const text = JSON.stringify(r.data);
    assert.ok(!text.includes('@example.com') && !text.includes(other.name), 'no emails or usernames');
    assert.equal((await boss.c.call(admin, { method: 'POST', body: {}, query: { action: 'stats' } })).status, 405);
  } finally { if (prev === undefined) delete process.env.ADMIN_USERNAMES; else process.env.ADMIN_USERNAMES = prev; }
});

test('every query used bound values (no string-built SQL in the app)', async () => {
  // The test driver records the text it ran; app code only ever passes values through the sql`` tag,
  // so no user-supplied string can appear outside a dollar-quoted literal.
  for (const q of queryLog) assert.ok(!/DROP TABLE users;--'?\s*\)/i.test(q.replace(/\$v[0-9a-f]+\$[\s\S]*?\$v[0-9a-f]+\$/g, '')), q);
});
