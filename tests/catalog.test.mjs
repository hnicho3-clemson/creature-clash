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
