import assert from 'node:assert/strict';
import { test } from 'node:test';

const storage = await import('../lib/collection-storage.ts').catch(() => null);
const mergeCharacterIds = storage?.mergeCharacterIds ?? (() => undefined);
const normalizeCharacterIds = storage?.normalizeCharacterIds ?? (() => undefined);

test('merges account and cached collections without duplicates, preserving order', () => {
  assert.deepEqual(
    mergeCharacterIds(['tanjiro-kamado', 'levi-ackerman'], ['levi-ackerman', 'killua-zoldyck']),
    ['tanjiro-kamado', 'levi-ackerman', 'killua-zoldyck'],
  );
});

test('normalizes malformed and duplicate character IDs', () => {
  assert.deepEqual(
    normalizeCharacterIds(['naruto', 'naruto', null, 42, 'BAD ID', '__proto__', 'saitama']),
    ['naruto', 'saitama'],
  );
});
