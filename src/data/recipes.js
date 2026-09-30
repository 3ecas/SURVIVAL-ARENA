// Consumables crafted in the hub from resources. cost is { itemType: count }.

export const RECIPES = [
  { id: 'bandage', name: 'Bandage', kind: 'bandage', cost: { cloth: 2 }, desc: 'Heals 40 over a few seconds (H)' },
  { id: 'grenade', name: 'Grenade', kind: 'throwable', item: 'grenade', cost: { scrap: 2, cloth: 1 }, desc: 'Area damage, hurts you too (G)' },
  { id: 'decoy', name: 'Decoy', kind: 'throwable', item: 'decoy', cost: { scrap: 3, parts: 1 }, desc: 'Draws every zombie for 6 s, then explodes (Q)' },
];
