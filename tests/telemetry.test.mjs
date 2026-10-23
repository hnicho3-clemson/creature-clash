// Anonymous stats, error reports and row level security. Run: npm test
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { setupDb, teardownDb, rawQuery, Client } from './helpers.mjs';

setupDb();
const telemetry = (await import('../api/telemetry/[action].js')).default;
const { scrub } = await import('../lib/telemetry.js');
const { route } = await import('../lib/http.js');
after(teardownDb);

const T = (c, action, body, opts = {}) => c.call(telemetry, { body, query: { action }, ...opts });
const q = text => rawQuery(text).trim();

test('stat counts events per day and adds up match minutes', async () => {
  const c = new Client();
  for (const e of ['page_view', 'page_view', 'daily_visitor', 'battle_start']) assert.equal((await T(c, 'stat', { event: e })).status, 200);
  assert.equal((await T(c, 'stat', { event: 'match_end', minutes: 7.5 })).status, 200);
  assert.equal((await T(c, 'stat', { event: 'match_end', minutes: 2.25 })).status, 200);
  assert.equal(q(`SELECT count FROM daily_stats WHERE event = 'page_view'`), '2');
  assert.equal(q(`SELECT count || '/' || minutes FROM daily_stats WHERE event = 'match_end'`), '2/9.75');
});

test('stat rejects unknown events and clamps silly minutes', async () => {
  const c = new Client();
  for (const e of ['admin', '', null, 'page_view; DROP TABLE users', '__proto__']) assert.equal((await T(c, 'stat', { event: e })).status, 400);
  await T(c, 'stat', { event: 'match_end', minutes: 1e9 });
  await T(c, 'stat', { event: 'match_end', minutes: -50 });
  await T(c, 'stat', { event: 'match_end', minutes: 'lots' });
  assert.equal(q(`SELECT minutes FROM daily_stats WHERE event = 'match_end'`), '39.75'); // 9.75 + 30 cap + 0 + 0
  await T(c, 'stat', { event: 'page_view', minutes: 50 });
  assert.equal(q(`SELECT minutes FROM daily_stats WHERE event = 'page_view'`), '0.00');
});

test('stat needs the CSRF header and is rate limited per IP', async () => {
  assert.equal((await T(new Client(), 'stat', { event: 'page_view' }, { headers: { 'x-cc-request': '0' } })).status, 403);
  const c = new Client(); let last;
  for (let i = 0; i < 201; i++) last = await T(c, 'stat', { event: 'page_view' });
  assert.equal(last.status, 429);
});

test('stats store nothing that identifies a player', async () => {
  const cols = q(`SELECT string_agg(column_name, ',' ORDER BY column_name) FROM information_schema.columns WHERE table_name = 'daily_stats'`);
  assert.equal(cols, 'count,day,event,minutes');
});

test('client errors are scrubbed, grouped and counted', async () => {
  const c = new Client();
  const body = { message: 'TypeError: x is undefined for kid@example.com code 12345678 token ' + 'a'.repeat(43), location: '/js/match.js:120:5',
    stack: 'at f (https://clash.test/js/match.js?v=secret#frag:120:5)' };
  assert.equal((await T(c, 'error', body)).status, 200);
  assert.equal((await T(c, 'error', { ...body, location: '/js/match.js:120:9' })).status, 200);
  const rows = JSON.parse(q(`SELECT json_agg(e) FROM error_reports e WHERE source = 'client'`));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].count, 2);
  assert.ok(!/kid@example|12345678|aaaaaaaaaa|secret|frag/.test(JSON.stringify(rows[0])), JSON.stringify(rows[0]));
  assert.ok(rows[0].message.includes('[email]') && rows[0].message.includes('[number]') && rows[0].message.includes('[token]'));
});

test('error reports reject junk and are capped in size', async () => {
  const c = new Client();
  assert.equal((await T(c, 'error', { message: '' })).status, 400);
  assert.equal((await T(c, 'error', { message: 42 })).status, 400);
  await T(c, 'error', { message: 'Long ' + 'word '.repeat(5000), location: 'x'.repeat(5000), stack: 'y '.repeat(10000) });
  const r = JSON.parse(q(`SELECT json_build_object('m', length(message), 'l', length(location), 's', length(stack)) FROM error_reports WHERE message LIKE 'Long%'`));
  assert.ok(r.m <= 300 && r.l <= 160 && r.s <= 1200, JSON.stringify(r));
});

test('unexpected server errors are recorded with a request id, and the reply stays generic', async () => {
  const boom = route(['POST'], async () => { throw new Error('db said no for kid@example.com'); });
  const r = await new Client().call(boom, { body: {} });
  assert.equal(r.status, 500);
  assert.equal(r.data.error.code, 'server');
  assert.ok(!JSON.stringify(r.data).includes('db said no'));
  const row = JSON.parse(q(`SELECT json_agg(e) FROM error_reports e WHERE source = 'server'`))[0];
  assert.equal(row.request_id, r.data.error.requestId);
  assert.equal(row.message, 'Error: db said no for [email]');
});

test('scrub removes emails, query strings, tokens and long numbers but keeps the useful part', () => {
  assert.equal(scrub('Failed at https://x.test/a.js?t=abc for me@x.io pin 99887766', 200), 'Failed at https://x.test/a.js for [email] pin [number]');
  assert.equal(scrub('Cannot read properties of null (reading \'x\') at line 12', 200), 'Cannot read properties of null (reading \'x\') at line 12');
});

test('row level security is on for every table', () => {
  const off = q(`SELECT string_agg(relname, ',') FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND NOT relrowsecurity`);
  assert.equal(off, '');
});

test('a database role other than the owner sees no rows even when granted access', () => {
  rawQuery(`INSERT INTO users (username, username_key, pass_hash, contact_email) VALUES ('Probe', 'probe', 'x', 'p@example.com') ON CONFLICT DO NOTHING;`);
  const role = 'cc_probe_' + randomBytes(4).toString('hex');
  try {
    rawQuery(`CREATE ROLE ${role} NOLOGIN; GRANT USAGE ON SCHEMA public TO ${role}; GRANT SELECT, UPDATE, DELETE ON users, saves, sessions TO ${role};`);
    const out = q(`SET ROLE ${role}; SELECT count(*) FROM users; DELETE FROM users; RESET ROLE; SELECT count(*) > 0 FROM users;`);
    assert.deepEqual(out.split('\n'), ['0', 't']);
  } finally {
    rawQuery(`REVOKE ALL ON ALL TABLES IN SCHEMA public FROM ${role}; REVOKE USAGE ON SCHEMA public FROM ${role}; DROP ROLE IF EXISTS ${role};`);
  }
});

test('the game counts battles and challenges once each, with minutes, and skips Test Drive', async () => {
  const { default: vm } = await import('node:vm');
  const { readFileSync } = await import('node:fs');
  const sent = [], listeners = {}; let now = 0;
  const ctx = { Telemetry: { stat: (e, m) => sent.push(m == null ? e : `${e}:${m}`) }, performance: { now: () => now },
    addEventListener: (k, f) => { listeners[k] = f; } };
  vm.createContext(ctx);
  vm.runInContext(`
    let match=null;
    function startMatch(o){match={mode:o.mode};} function endMatch(){} function finishChallenge(){}
    function onPlayerEliminated(){} function openMenu(){match=null;} function openChallenges(){match=null;}
    ${readFileSync(new URL('../public/js/usage.js', import.meta.url), 'utf8')}
    this.api={start:m=>startMatch({mode:m}),end:()=>endMatch(),elim:()=>onPlayerEliminated(),chal:()=>finishChallenge(),menu:()=>openMenu()};`, ctx);
  const g = ctx.api;
  g.start('battle'); now = 3 * 60000; g.elim(); now = 5 * 60000; g.end(); g.menu();   // knocked out at 3 min, counted once
  g.start('test'); now = 9 * 60000; g.menu();                                         // Test Drive: nothing
  now = 0; g.start('challenge'); now = 60000; g.chal();
  now = 0; g.start('battle'); now = 120000; g.start('battle'); now = 180000; listeners.pagehide();  // replaced, then page closed
  assert.deepEqual(sent, ['battle_start', 'match_end:3', 'challenge_start', 'match_end:1', 'battle_start', 'match_end:2', 'battle_start', 'match_end:1']);
});
