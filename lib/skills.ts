import type { Fighter } from '@/lib/characters';

export type BattleSkill = {
  id: string;
  name: string;
  description: string;
  kind: 'attack' | 'special' | 'guard' | 'ultimate';
  damage: number;
  accuracy: number;
  cooldown: number;
};

/**
 * Four game moves per fighter. The signature label comes from the roster's linked
 * profile field; the remaining moves are gameplay adaptations, not verbatim VSBW data.
 * Check each profile before presenting these as verified canon abilities.
 */
export function getSkills(fighter: Fighter): BattleSkill[] {
  const signature = fighter.ability || 'Signature Technique';
  const archetype = /erase|hakai|reality|creation|omnipot|chaos|cosmic|time|space|magic|alchemy|curse|energy|power|instinct|gear|mode|domain|sword|breath|regeneration|necroplasm/i.test(signature);
  return [
    {
      id: 'signature', name: signature, kind: 'special',
      description: `Signature move adapted from the linked character profile. Verify the exact version before competitive use.`,
      damage: Math.round(16 + fighter.power * 0.23), accuracy: 0.88, cooldown: 0
    },
    {
      id: 'rapid', name: archetype ? 'Technique Chain' : 'Rapid Assault', kind: 'attack',
      description: 'A fast, low-commitment attack. Gameplay adaptation; not a claim that this exact move name appears on the source page.',
      damage: Math.round(9 + fighter.speed * 0.17), accuracy: 0.96, cooldown: 0
    },
    {
      id: 'guard', name: 'Defensive Stance', kind: 'guard',
      description: 'Reduce the next incoming hit. This is a generic game mechanic, not a sourced character ability.',
      damage: 0, accuracy: 1, cooldown: 2
    },
    {
      id: 'ultimate', name: `Ultimate: ${signature}`, kind: 'ultimate',
      description: 'A high-impact finisher adapted for this prototype. It is not an official VS Battles Wiki verdict or necessarily a canon named technique.',
      damage: Math.round(25 + fighter.power * 0.32), accuracy: 0.72, cooldown: 3
    }
  ];
}
