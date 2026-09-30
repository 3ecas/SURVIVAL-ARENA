// Pure data for floor pickups. `stack` items go into the inventory by count;
// `use` items apply immediately when picked up.

export const ITEM_TYPES = {
  plank: { id: 'plank', name: 'Wood plank', color: '#c9955a', shape: 'bar', kind: 'stack' },
  scrap: { id: 'scrap', name: 'Scrap metal', color: '#9aa4b0', shape: 'gear', kind: 'stack' },
  cloth: { id: 'cloth', name: 'Cloth', color: '#e0d6c2', shape: 'square', kind: 'stack' },
  parts: { id: 'parts', name: 'Weapon parts', color: '#ce93d8', shape: 'gear', kind: 'stack' },
  ammo: { id: 'ammo', name: 'Ammo box', color: '#ffe28a', shape: 'box', kind: 'use' },
  medkit: { id: 'medkit', name: 'Medkit', color: '#ef5350', shape: 'cross', kind: 'use' },
  grenade: { id: 'grenade', name: 'Grenade', color: '#7cb342', shape: 'circle', kind: 'use' },
  decoy: { id: 'decoy', name: 'Decoy', color: '#4dd0e1', shape: 'circle', kind: 'use' },
};

export const INVENTORY_TYPES = ['plank', 'scrap', 'cloth', 'parts'];
