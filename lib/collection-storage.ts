const CHARACTER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]{0,79}$/;

export function normalizeCharacterIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const result: string[] = [];
  for (const candidate of value) {
    if (typeof candidate !== 'string' || !CHARACTER_ID_PATTERN.test(candidate) || seen.has(candidate)) continue;
    seen.add(candidate);
    result.push(candidate);
  }
  return result;
}

export function mergeCharacterIds(...collections: unknown[]): string[] {
  return normalizeCharacterIds(collections.flatMap((collection) =>
    Array.isArray(collection) ? collection : [],
  ));
}
