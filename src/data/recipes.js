// Crafting recipes used in the hub. cost is { itemType: count }.
// kind 'ammo' refills the chosen weapon's reserve by `amount` magazines,
// 'bandage' adds one bandage, 'weapon' unlocks the weapon in a slot,
// 'throwable' adds a grenade or decoy.

export const RECIPES = [
  { id: 'ammo', name: 'Ammo (2 magazines)', kind: 'ammo', amount: 2, cost: { scrap: 2 } },
  { id: 'bandage', name: 'Bandage', kind: 'bandage', cost: { cloth: 2 } },
  { id: 'grenade', name: 'Grenade', kind: 'throwable', item: 'grenade', cost: { scrap: 2, cloth: 1 } },
  { id: 'decoy', name: 'Decoy', kind: 'throwable', item: 'decoy', cost: { scrap: 3, parts: 1 } },
  { id: 'shotgun', name: 'Pump Shotgun', kind: 'weapon', weapon: 'shotgun', cost: { parts: 1, scrap: 3 } },
  { id: 'smg', name: 'Vector SMG', kind: 'weapon', weapon: 'smg', cost: { parts: 2, scrap: 3 } },
  { id: 'burst', name: 'Trident Burst', kind: 'weapon', weapon: 'burst', cost: { parts: 2, scrap: 5 } },
  { id: 'ar', name: 'Commando AR', kind: 'weapon', weapon: 'ar', cost: { parts: 3, scrap: 6 } },
  { id: 'dmr', name: 'Marksman DMR', kind: 'weapon', weapon: 'dmr', cost: { parts: 3, scrap: 5 } },
  { id: 'lmg', name: 'Hammer LMG', kind: 'weapon', weapon: 'lmg', cost: { parts: 5, scrap: 10 } },
  { id: 'blaster', name: 'Plasma Blaster', kind: 'weapon', weapon: 'blaster', cost: { parts: 5, scrap: 8, cloth: 2 } },
  { id: 'rocket', name: 'Thunder Rocket', kind: 'weapon', weapon: 'rocket', cost: { parts: 6, scrap: 12 } },
];
