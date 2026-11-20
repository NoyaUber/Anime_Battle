import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_MYTHIC_PITY, pityAfterPull, resolveRarity } from '../lib/gacha-pity.ts';

test('each non-Mythic summon increments pity by one', () => {
  assert.equal(pityAfterPull(7, 'Rare'), 8);
});

test('pulling a Mythic resets pity', () => {
  assert.equal(pityAfterPull(59, 'Mythic'), 0);
});

test('the 60th summon is guaranteed Mythic after 59 misses', () => {
  assert.equal(MAX_MYTHIC_PITY, 60);
  assert.equal(resolveRarity(99.9, 59), 'Mythic');
});

test('pity applies within a ten-pull and resets at a Mythic', () => {
  let pity = 58;
  let rarity = resolveRarity(99.9, pity);
  assert.equal(rarity, 'Common');
  pity = pityAfterPull(pity, rarity);
  assert.equal(pity, 59);

  rarity = resolveRarity(99.9, pity);
  assert.equal(rarity, 'Mythic');
  pity = pityAfterPull(pity, rarity);
  assert.equal(pity, 0);

  rarity = resolveRarity(99.9, pity);
  pity = pityAfterPull(pity, rarity);
  assert.equal(pity, 1);
});
