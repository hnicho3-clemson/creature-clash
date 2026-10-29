// The server's prices, unlock levels and rewards must match the game's source.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildCatalog } from '../scripts/build-catalog.mjs';

test('lib/catalog.json matches the game source (run npm run catalog after changing parts or rewards)', () => {
  const committed = JSON.parse(readFileSync(new URL('../lib/catalog.json', import.meta.url), 'utf8'));
  assert.deepEqual(committed, buildCatalog());
});

test('catalog sanity: prices and campaign rewards look right', () => {
  const c = buildCatalog();
  assert.deepEqual(c.prices, { Basic: 50, Standard: 65, Advanced: 80, Rare: 90, Free: 0 });
  assert.equal(c.rewards.dnaBot, 15); assert.equal(c.rewards.dnaPlayer, 25); assert.equal(c.rewards.dropChance, 0.5);
  assert.equal(Object.keys(c.campaign).length, 10);
  assert.ok(Object.keys(c.parts).length >= 30);
});

test('play styles: the save sanitiser accepts exactly the styles the game offers', () => {
  const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
  const game = [...read('public/js/parts.js').match(/const STYLES=\{([\s\S]*?)\n\};/)[1].matchAll(/^\s*(\w+):\{name:/gm)].map(m => m[1]);
  const sec = JSON.parse(read('public/js/security.js').match(/const STYLES=(\[[^\]]+\])/)[1].replace(/'/g, '"'));
  assert.deepEqual(sec, game);
});

test('weapons: one weapon family, each with a normal part price', () => {
  const c = buildCatalog();
  const weapons = Object.values(c.parts).filter(p => p.fam === 'Weapon');
  assert.ok(weapons.length >= 6);
  for (const w of weapons) assert.ok([50, 65, 80, 90].includes(c.prices[w.tier]), w.name);
});
