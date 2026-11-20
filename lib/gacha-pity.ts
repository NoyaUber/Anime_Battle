import type { Rarity } from '@/lib/characters';

export const MAX_MYTHIC_PITY = 60;

export function resolveRarity(roll: number, currentPity: number): Rarity {
  const pity = Number.isFinite(currentPity) ? Math.max(0, Math.floor(currentPity)) : 0;
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
  const pity = Number.isFinite(currentPity) ? Math.max(0, Math.floor(currentPity)) : 0;
  return Math.min(MAX_MYTHIC_PITY, pity + 1);
}
