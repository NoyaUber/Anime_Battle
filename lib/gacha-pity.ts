import type { Rarity } from '@/lib/characters';

export const MAX_MYTHIC_PITY = 60;

export function normalizePity(value: unknown): number {
  const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(MAX_MYTHIC_PITY, Math.max(0, Math.floor(parsed)));
}

export function resolveInitialPity(
  serverPity: unknown,
  cachedPity: unknown,
  legacyPity: unknown,
  allowLegacyImport: boolean,
): number {
  if (serverPity !== null && serverPity !== undefined) return normalizePity(serverPity);
  if (cachedPity !== null && cachedPity !== undefined) return normalizePity(cachedPity);
  return allowLegacyImport ? normalizePity(legacyPity) : 0;
}

export function resolveRarity(roll: number, currentPity: number): Rarity {
  const pity = normalizePity(currentPity);
  if (pity >= MAX_MYTHIC_PITY - 1) return 'Mythic';

  const value = Number.isFinite(roll) ? Math.max(0, Math.min(roll, 99.999999)) : 99.999999;
  if (value < 1) return 'Mythic';
  if (value < 6) return 'Legendary';
  if (value < 20) return 'Epic';
  if (value < 55) return 'Rare';
  return 'Common';
}

export function pityAfterPull(currentPity: number, rarity: Rarity): number {
  if (rarity === 'Mythic') return 0;
  const pity = normalizePity(currentPity);
  return Math.min(MAX_MYTHIC_PITY, pity + 1);
}
