// Consumables crafted in the hub from resources. cost is { itemType: count }.

export const RECIPES = [
  { id: 'bandage', name: 'Bandage', kind: 'bandage', icon: 'bandage', cost: { cloth: 2 }, desc: 'Heals 40 over time (H)' },
  { id: 'grenade', name: 'Grenade', kind: 'throwable', item: 'grenade', icon: 'grenade', cost: { scrap: 2, cloth: 1 }, desc: 'Area damage (G)' },
  { id: 'decoy', name: 'Decoy', kind: 'throwable', item: 'decoy', icon: 'decoy', cost: { scrap: 3, parts: 1 }, desc: 'Lures zombies, explodes (Q)' },
];
