// Pure data for floor pickups. `stack` items go into the inventory by count;
// `use` items apply immediately when picked up.

export const ITEM_TYPES = {
  scrap: { id: 'scrap', short: 'Scrap', name: 'Scrap metal', color: '#9aa4b0', shape: 'gear', kind: 'stack' },
  cloth: { id: 'cloth', short: 'Cloth', name: 'Cloth', color: '#e0d6c2', shape: 'square', kind: 'stack' },
  parts: { id: 'parts', short: 'Parts', name: 'Weapon parts', color: '#ce93d8', shape: 'gear', kind: 'stack' },
  ammo: { id: 'ammo', short: 'Ammo', name: 'Ammo box', color: '#ffe28a', shape: 'box', kind: 'use' },
  medkit: { id: 'medkit', short: 'Medkit', name: 'Medkit', color: '#ef5350', shape: 'cross', kind: 'use' },
  grenade: { id: 'grenade', short: 'Grenade', name: 'Grenade', color: '#7cb342', shape: 'circle', kind: 'use' },
  decoy: { id: 'decoy', short: 'Decoy', name: 'Decoy', color: '#4dd0e1', shape: 'circle', kind: 'use' },
};

export const INVENTORY_TYPES = ['scrap', 'cloth', 'parts'];
