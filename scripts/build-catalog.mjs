// Builds lib/catalog.json from the game's own source, so the server's part prices, unlock levels
// and campaign rewards always match what the game shows. Run: npm run catalog
// tests/catalog.test.mjs fails if the committed catalog is out of date.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = f => readFileSync(join(root, f), 'utf8');

export function buildCatalog() {
  const parts = read('public/js/parts.js');
  const body = parts.slice(parts.indexOf('const PARTS={'), parts.indexOf('};', parts.indexOf('const PARTS={')));
  const lines = [...body.matchAll(/^\s*(\w+):\{name:'([^']*)',fam:'(\w+)',tier:'(\w+)',lv:(\d+)(.*)$/gm)];
  const catalog = {};
  for (const [, id, name, fam, tier, lv, rest] of lines) {
    catalog[id] = { name, fam, tier, lv: +lv, mirror: !/mirror:false/.test(rest) };
  }
  const prices = JSON.parse(parts.match(/const TIER_PRICE=(\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":'));
  const budget = JSON.parse(parts.match(/const BUDGET=(\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":'));
  const patterns = JSON.parse(parts.match(/const PATTERNS=(\[[^\]]+\])/)[1].replace(/'/g, '"'));

  const core = read('public/js/core.js');
  const rw = JSON.parse(core.match(/const RW=(\{[^}]+\})/)[1].replace(/(\w+):/g, '"$1":').replace(/:\./g, ':0.'));

  const camp = read('public/js/campaign.js');
  const campaign = Object.fromEntries([...camp.matchAll(/\{id:'(\w+)',name:'[^']*',xp:(\d+)/g)].map(m => [m[1], +m[2]]));
  const block = (name) => { const i = camp.indexOf('const ' + name + '={'); return camp.slice(i, camp.indexOf('\n};', i)); };
  const constraints = [...block('CONSTRAINTS').matchAll(/^\s*(\w+):\{name:/gm)].map(m => m[1]);
  const goals = [...block('GOALS').matchAll(/^\s*(\w+):\{name:/gm)].map(m => m[1]);

  return { parts: catalog, prices, budget, patterns, rewards: rw, campaign, constraints, goals };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const c = buildCatalog();
  writeFileSync(join(root, 'lib/catalog.json'), JSON.stringify(c, null, 2) + '\n');
  console.log('Wrote lib/catalog.json:', Object.keys(c.parts).length, 'parts,', Object.keys(c.campaign).length, 'campaign challenges');
}
