export type Rarity = 'Common' | 'Rare' | 'Epic' | 'Legendary' | 'Mythic';
export type Fighter = { id: string; name: string; universe: string; rarity: Rarity; power: number; speed: number; durability: number; ability: string; color: string; description: string };

// Demo examples are fictional placeholders, not official VSBW rankings or canon verdicts.
export const characters: Fighter[] = [
  { id:'kai-flare', name:'Kai Flare', universe:'Ember Chronicle', rarity:'Rare', power:64, speed:72, durability:58, ability:'Solar Burst', color:'#ff7a45', description:'A young flame wielder who converts stored heat into explosive attacks.' },
  { id:'mira-veil', name:'Mira Veil', universe:'Moonlit Archive', rarity:'Epic', power:70, speed:81, durability:61, ability:'Lunar Step', color:'#9b8cff', description:'A tactician who bends moonlight to reposition and confuse opponents.' },
  { id:'rook-titan', name:'Rook Titan', universe:'Ironbound Saga', rarity:'Common', power:52, speed:38, durability:88, ability:'Fortress Guard', color:'#8ba3b8', description:'A defensive fighter who specializes in absorbing impact.' },
  { id:'sora-tempest', name:'Sora Tempest', universe:'Skybreakers', rarity:'Legendary', power:89, speed:93, durability:74, ability:'Storm Dominion', color:'#42c7e8', description:'A high-speed aerial combatant who shapes wind and lightning.' },
  { id:'nyx-zero', name:'Nyx Zero', universe:'Null Horizon', rarity:'Mythic', power:98, speed:95, durability:91, ability:'Zero Point', color:'#ed72ca', description:'An elusive entity that can suppress energy within a limited field.' },
  { id:'tera-bloom', name:'Tera Bloom', universe:'Verdant Oath', rarity:'Rare', power:59, speed:56, durability:76, ability:'Root Snare', color:'#7fda9a', description:'A patient fighter who controls terrain and restricts movement.' },
  { id:'vex-arc', name:'Vex Arc', universe:'Neon Divide', rarity:'Epic', power:78, speed:76, durability:67, ability:'Arc Cannon', color:'#ffc45b', description:'A ranged specialist who channels energy into precise shots.' },
  { id:'aurelia-dawn', name:'Aurelia Dawn', universe:'First Light', rarity:'Legendary', power:92, speed:84, durability:86, ability:'Radiant Aegis', color:'#f8df81', description:'A guardian whose light-based barriers can turn defense into offense.' }
];
export const rarityOrder: Rarity[] = ['Common','Rare','Epic','Legendary','Mythic'];
