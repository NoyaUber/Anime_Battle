import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_MYTHIC_PITY, normalizePity, pityAfterPull, resolveInitialPity, resolveRarity } from '../lib/gacha-pity.ts';

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

test('remote pity wins over per-account cache and legacy browser data', () => {
  assert.equal(resolveInitialPity(4, 20, 30, true), 4);
});

test('uses the account cache before a permitted legacy import', () => {
  assert.equal(resolveInitialPity(null, 20, 30, true), 20);
  assert.equal(resolveInitialPity(null, null, 30, true), 30);
});

test('does not import legacy pity into a later account and clamps invalid values', () => {
  assert.equal(resolveInitialPity(null, null, 30, false), 0);
  assert.equal(normalizePity(-1), 0);
  assert.equal(normalizePity(999), MAX_MYTHIC_PITY);
  assert.equal(normalizePity('not-a-number'), 0);
});
