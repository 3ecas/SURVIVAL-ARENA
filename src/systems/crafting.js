// Applies hub recipes to the run state (not to a live Player).

import { PLAYER } from '../config.js';
import { WEAPONS } from '../data/weapons.js';

export function canAfford(run, recipe) {
  return Object.entries(recipe.cost).every(([type, n]) => (run.inventory[type] || 0) >= n);
}

// Why a recipe cannot be crafted right now, or null when it can.
export function craftBlocker(run, recipe) {
  if (!canAfford(run, recipe)) return 'missing resources';
  switch (recipe.kind) {
    case 'ammo': {
      const w = run.weapons[run.weaponIndex];
      if (w.reserve >= WEAPONS[w.id].reserve) return 'reserve full';
      return null;
    }
    case 'bandage':
      return run.bandages >= PLAYER.MAX_BANDAGES ? 'bandages full' : null;
    case 'throwable':
      if (recipe.item === 'grenade') return run.grenades >= PLAYER.MAX_GRENADES ? 'grenades full' : null;
      return run.decoys >= PLAYER.MAX_DECOYS ? 'decoys full' : null;
    case 'weapon': {
      const owned = run.weapons.find((w) => w.id === recipe.weapon);
      if (owned && owned.reserve >= WEAPONS[recipe.weapon].reserve && owned.mag >= WEAPONS[recipe.weapon].magazine) return 'owned, ammo full';
      return null;
    }
    default:
      return 'unknown recipe';
  }
}

// What crafting will do, for the hub's list.
export function craftEffect(run, recipe) {
  if (recipe.kind === 'weapon') {
    if (run.weapons.some((w) => w.id === recipe.weapon)) return 'refill ammo';
    return run.weapons.length >= PLAYER.MAX_WEAPONS ? `replaces ${WEAPONS[run.weapons[run.weaponIndex].id].name}` : 'new slot';
  }
  if (recipe.kind === 'ammo') return `for ${WEAPONS[run.weapons[run.weaponIndex].id].name}`;
  return '';
}

export function craft(run, recipe) {
  if (craftBlocker(run, recipe)) return false;
  for (const [type, n] of Object.entries(recipe.cost)) run.inventory[type] -= n;
  switch (recipe.kind) {
    case 'ammo': {
      const w = run.weapons[run.weaponIndex];
      const def = WEAPONS[w.id];
      w.reserve = Math.min(def.reserve, w.reserve + def.magazine * recipe.amount);
      break;
    }
    case 'bandage':
      run.bandages++;
      break;
    case 'throwable':
      if (recipe.item === 'grenade') run.grenades++;
      else run.decoys++;
      break;
    case 'weapon': {
      const def = WEAPONS[recipe.weapon];
      const owned = run.weapons.find((w) => w.id === def.id);
      if (owned) {
        owned.mag = def.magazine;
        owned.reserve = def.reserve;
      } else if (run.weapons.length < PLAYER.MAX_WEAPONS) {
        run.weapons.push({ id: def.id, mag: def.magazine, reserve: def.reserve });
        run.weaponIndex = run.weapons.length - 1;
      } else {
        run.weapons[run.weaponIndex] = { id: def.id, mag: def.magazine, reserve: def.reserve };
      }
      break;
    }
    default:
  }
  return true;
}
