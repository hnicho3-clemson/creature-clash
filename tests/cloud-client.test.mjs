// Runs the game's real cloud.js and parts.js in a sandbox, with fetch wired straight to the real API handlers
// and Postgres. Checks that a signed-in player's rewards and purchases come from the server, that guests
// are untouched, and that dev cheats can't change an account.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { setupDb, teardownDb, rawQuery, Client } from './helpers.mjs';

setupDb();
after(teardownDb);
const H = {
  '/api/me': (await import('../api/me.js')).default,
  '/api/save': (await import('../api/save.js')).default,
  '/api/shop': (await import('../api/shop.js')).default,
  '/api/match': (await import('../api/match/[action].js')).default,
  '/api/auth': (await import('../api/auth/[action].js')).default,
};
const { outbox } = await import('../lib/email.js');
const src = f => readFileSync(new URL('../public/js/' + f, import.meta.url), 'utf8');
const core = src('core.js');
const coreBits = ['const esc=', 'const clone=', 'const norm3=', 'const store=', 'const SaveKey=', 'const A11Y_DEFAULT=', 'const A11Y=', 'const RW=']
  .map(p => { const i = core.indexOf(p); assert.ok(i >= 0, p); let j = core.indexOf('\n', i); if (p === 'const A11Y_DEFAULT=') j = core.indexOf('\n', j + 1); return core.slice(i, j); }).join('\n');

async function signedInClient() {
  const c = new Client(), name = 'cloud_' + Math.random().toString(36).slice(2, 8);
  await c.call(H['/api/auth'], { query: { action: 'signup' }, body: { username: name, password: 'green frogs jump', birthYear: 1990, email: 'c@example.com', agree: true } });
  await c.call(H['/api/auth'], { query: { action: 'verify' }, body: { username: name, code: outbox[outbox.length - 1].text.match(/\b(\d{8})\b/)[1] } });
  return { c, name };
}

function makeGame(client, localStore = {}) {
  const banners = [], devlog = [], els = {};
  const el = id => (els[id] ||= { id, textContent: '', innerHTML: '', hidden: false, href: '', classList: { toggle() {} }, append(...a) { this.textContent += a.map(x => x.textContent ?? x).join(''); } });
  const timers = [];
  const ctx = {
    console, Math, JSON, Object, Array, String, Number, Set, Error, Promise, URL,
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: k => (k in localStore ? localStore[k] : null), setItem(k, v) { localStore[k] = v; } },
    document: { getElementById: el, visibilityState: 'visible', createElement: () => ({ textContent: '' }) },
    addEventListener() {}, setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout() {},
    async fetch(path, opts = {}) {
      const [base, action] = path.startsWith('/api/match/') ? ['/api/match', path.split('/')[3]] : [path, undefined];
      const r = await client.call(H[base], { method: opts.method || 'GET', raw: opts.body, query: action ? { action } : {}, headers: opts.headers ? Object.fromEntries(Object.entries(opts.headers).map(([k, v]) => [k.toLowerCase(), v])) : {} });
      return { ok: r.status < 400, status: r.status, json: async () => r.data };
    },
  };
  ctx.window = ctx; ctx.globalThis = ctx; vm.createContext(ctx);
  const game = `
    ${src('security.js')}
    const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
    ${coreBits}
    ${src('parts.js')}
    function saveA11y(){store.set(SaveKey('a11y'),A11Y);}
    const PALETTES={default:{},deutan:{},tritan:{}};
    let phase='menu', match=null, world={creatures:[]};
    const COMMANDS={addDNA:()=>{progress.dna+=10;}, addXP:()=>{}};
    function dlog(s){__devlog.push(s);} function banner(t){__banners.push(t);} function applyA11y(){} function refreshMenu(){} function renderPalette(){} function renderStats(){} function renderSlots(){}
    function earnChips(){return 'chips';} function openMenu(){phase='menu';}
    function startMatch(opts){match={mode:opts.mode,earned:{xp:0,dna:0,drops:[],levels:[]},player:{team:'blue',kills:0,nestsKilled:0},rot:opts.rot||null,challenge:opts.challenge||null};world.creatures=[{team:'red'},{team:'red'},{team:'red'},{team:'blue'}];}
    function onPlayerEliminated(){match.eliminated=true;}
    function endMatch(w){match.over=true;match.winner=w;}
    function finishChallenge(win){match.over=true;match.chWin=win;}
    ${src('cloud.js')}
    globalThis.G={get progress(){return progress;}, get slots(){return slots;}, get match(){return match;}, Cloud, startMatch:(o)=>startMatch(o), kill:()=>{match.player.kills++;}, nest:()=>{match.player.nestsKilled++;}, drop:(id)=>grantDroppedPart(id),
      eliminate:()=>onPlayerEliminated(), end:(w)=>endMatch(w), finishChallenge:(w)=>finishChallenge(w), buy:(id)=>tryBuyPart(id), dev:(k)=>COMMANDS[k](), init:cloudInit, flush:()=>cloudFlush(), saveSlots:()=>saveSlots(), setSlots:(s)=>{slots=s;}};
  `;
  ctx.__devlog = devlog; ctx.__banners = banners;
  vm.runInContext(game, ctx);
  return { G: ctx.G, banners, devlog, els, localStore, settle: async () => { for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)); } };
}
const backdate = (seconds) => rawQuery(`UPDATE matches SET started_at = now() - interval '${seconds} seconds' WHERE ended_at IS NULL;`);

test('guest: no server calls change anything, progress saves to the browser', async () => {
  const g = makeGame(new Client());
  await g.settle();
  assert.equal(g.G.Cloud.on, false); assert.equal(g.G.Cloud.state, 'guest');
  assert.match(g.els.mAcctText.textContent, /guest/);
  g.G.dev('addDNA'); assert.equal(g.G.progress.dna, 10, 'dev commands still work for guests');
});

test('signed in: guest creatures import once, guest DNA does not', async () => {
  const { c } = await signedInClient();
  const guest = { 'dev_cc_progress2': JSON.stringify({ dna: 5000, level: 30, campaign: { wobbles: true } }),
    'dev_cc_slots': JSON.stringify([{ name: 'Guesty', color: '#123456', accent: '#654321', pattern: 'spots', body: { w: 1, h: 1, l: 1 }, parts: [] }]) };
  const g = makeGame(c, { ...guest });
  await g.settle();
  assert.equal(g.G.Cloud.on, true);
  assert.equal(g.G.progress.dna, 0); assert.equal(g.G.progress.level, 1); assert.equal(g.G.progress.campaign.wobbles, true);
  assert.ok(g.G.slots.some(s => s && s.name === 'Guesty'));
  assert.equal(g.localStore['dev_cc_progress2'], guest['dev_cc_progress2'], 'guest save in the browser is left alone');
});

test('signed in: match rewards come from the server, including capping impossible kills', async () => {
  const { c } = await signedInClient();
  const g = makeGame(c); await g.settle();
  g.G.startMatch({ mode: 'battle' }); await g.settle();
  backdate(300);
  for (let i = 0; i < 9; i++) g.G.kill();             // a tampered client claims 9 kills in a 3v3
  g.G.nest(); g.G.nest();
  g.G.end('blue'); await g.settle();
  assert.equal(g.G.match.earned.dna, 45, '3 kills max');
  assert.equal(g.G.match.earned.xp, 100 + 30 + 30 + 50);
  assert.equal(g.G.progress.dna, 45);
  const db = JSON.parse(rawQuery(`SELECT progress FROM saves s JOIN users u ON u.id = s.user_id WHERE u.username LIKE 'cloud_%' AND (progress->>'dna')::int = 45 LIMIT 1;`));
  assert.equal(db.dna, 45);
});

test('signed in: knocked out, then team wins: two reports in order, win bonus once', async () => {
  const { c } = await signedInClient();
  const g = makeGame(c); await g.settle();
  g.G.startMatch({ mode: 'battle' }); await g.settle(); backdate(200);
  g.G.kill(); g.G.eliminate(); g.G.end('blue'); await g.settle();
  assert.equal(g.G.match.earned.xp, 100 + 10 + 50); assert.equal(g.G.match.earned.dna, 15);
});

test('signed in: part drops are kept only if the server accepts them', async () => {
  const { c } = await signedInClient();
  const g = makeGame(c); await g.settle();
  g.G.startMatch({ mode: 'battle' }); await g.settle(); backdate(120);
  g.G.kill(); g.G.drop('wings'); g.G.drop('stinger'); // second drop has no kill to back it
  g.G.end('red'); await g.settle();
  assert.ok(g.G.progress.owned.includes('wings')); assert.ok(!g.G.progress.owned.includes('stinger'));
});

test('signed in: buying is decided by the server and the game is corrected', async () => {
  const { c } = await signedInClient();
  const g = makeGame(c); await g.settle();
  // Pretend the client was tampered with to show lots of DNA and an unlocked rare part.
  g.G.progress.dna = 999; g.G.progress.unlocked.push('wings');
  assert.equal(g.G.buy('wings'), true, 'the game shows the purchase straight away');
  await g.settle();
  assert.equal(g.G.progress.dna, 0, 'server answer replaces the fake balance');
  assert.ok(!g.G.progress.owned.includes('wings'));
  assert.ok(g.banners.some(b => /locked|DNA/.test(b)));
});

test('signed in: dev cheats do nothing to an account', async () => {
  const { c } = await signedInClient();
  const g = makeGame(c); await g.settle();
  g.G.dev('addDNA');
  assert.equal(g.G.progress.dna, 0); assert.match(g.devlog.join(' '), /signed in/);
});

test('signed in: creature edits sync up after a short pause', async () => {
  const { c } = await signedInClient();
  const g = makeGame(c); await g.settle();
  const s = g.G.slots.slice(); s[1] = { name: 'Synced Sam', color: '#aabbcc', accent: '#ccbbaa', pattern: 'stripes', body: { w: 1, h: 1, l: 1 }, parts: [] };
  g.G.setSlots(s); g.G.saveSlots(); g.G.flush(); await g.settle();
  const r = await c.call(H['/api/save'], { method: 'GET' });
  assert.equal(r.data.slots[1].name, 'Synced Sam');
});

test('signed in: campaign clear pays XP once, from the server', async () => {
  const { c } = await signedInClient();
  const g = makeGame(c); await g.settle();
  const play = async () => { g.G.startMatch({ mode: 'challenge', challenge: { id: 'snack' } }); await g.settle(); backdate(60); g.G.finishChallenge(true); await g.settle(); return g.G.match; };
  assert.equal((await play()).earned.xp, 60);
  const second = await play();
  assert.equal(second.earned.xp, 0); assert.equal(second.firstClear, false);
});
