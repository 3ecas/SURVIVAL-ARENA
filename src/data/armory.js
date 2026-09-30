// Guns unlocked in the hub armory with score and weapon parts, gated by
// player level. Unlocked guns can be equipped in either loadout slot.

export const UNLOCKS = {
  pistol: { cost: 0, parts: 0, level: 1 },
  shotgun: { cost: 600, parts: 1, level: 2 },
  smg: { cost: 900, parts: 1, level: 2 },
  burst: { cost: 1400, parts: 2, level: 3 },
  ar: { cost: 1800, parts: 2, level: 4 },
  dmr: { cost: 2000, parts: 2, level: 4 },
  lmg: { cost: 3000, parts: 3, level: 6 },
  blaster: { cost: 3500, parts: 3, level: 7 },
  rocket: { cost: 4000, parts: 4, level: 8 },
};

export const ARMORY_ORDER = ['pistol', 'shotgun', 'smg', 'burst', 'ar', 'dmr', 'lmg', 'blaster', 'rocket'];
