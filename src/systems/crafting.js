// Hub actions on the run state: craft consumables, unlock and equip guns,
// spend attribute points.

import { PLAYER } from '../config.js';
import { WEAPONS } from '../data/weapons.js';
import { UNLOCKS } from '../data/armory.js';
import { ATTRIBUTES, MAX_ATTRIBUTE } from '../data/attributes.js';

const afford = (run, cost) => Object.entries(cost).every(([type, n]) => (run.inventory[type] || 0) >= n);

// ---- consumables --------------------------------------------------------

export function craftBlocker(run, recipe) {
  if (!afford(run, recipe.cost)) return 'missing resources';
  if (recipe.kind === 'bandage') return run.bandages >= PLAYER.MAX_BANDAGES ? 'bandages full' : null;
  if (recipe.item === 'grenade') return run.grenades >= PLAYER.MAX_GRENADES ? 'grenades full' : null;
  return run.decoys >= PLAYER.MAX_DECOYS ? 'decoys full' : null;
}

export function craft(run, recipe) {
  if (craftBlocker(run, recipe)) return false;
  for (const [type, n] of Object.entries(recipe.cost)) run.inventory[type] -= n;
  if (recipe.kind === 'bandage') run.bandages++;
  else if (recipe.item === 'grenade') run.grenades++;
  else run.decoys++;
  return true;
}

// ---- armory -------------------------------------------------------------

export function isUnlocked(run, weaponId) {
  return run.unlocked.includes(weaponId);
}

export function unlockBlocker(run, weaponId) {
  const u = UNLOCKS[weaponId];
  if (isUnlocked(run, weaponId)) return 'unlocked';
  if (run.playerLevel < u.level) return `needs player level ${u.level}`;
  if (run.points < u.cost) return `needs ${u.cost} score`;
  if ((run.inventory.parts || 0) < u.parts) return `needs ${u.parts} weapon parts`;
  return null;
}

export function unlockWeapon(run, weaponId) {
  if (unlockBlocker(run, weaponId)) return false;
  const u = UNLOCKS[weaponId];
  run.points -= u.cost;
  run.inventory.parts -= u.parts;
  run.unlocked.push(weaponId);
  equipWeapon(run, weaponId);
  return true;
}

export function isEquipped(run, weaponId) {
  return run.weapons.some((w) => w.id === weaponId);
}

// Equips an unlocked gun: fills an empty slot, else replaces the slot that
// is not the active one (or the active one if only one gun is carried).
export function equipWeapon(run, weaponId) {
  if (!isUnlocked(run, weaponId)) return false;
  const def = WEAPONS[weaponId];
  const idx = run.weapons.findIndex((w) => w.id === weaponId);
  if (idx >= 0) {
    // Already carried: unequip when another gun remains.
    if (run.weapons.length > 1) {
      run.weapons.splice(idx, 1);
      run.weaponIndex = 0;
    }
    return true;
  }
  const entry = { id: weaponId, mag: def.magazine, reserve: def.reserve };
  if (run.weapons.length < PLAYER.MAX_WEAPONS) {
    run.weapons.push(entry);
    run.weaponIndex = run.weapons.length - 1;
  } else {
    const replace = run.weapons.length > 1 ? (run.weaponIndex + 1) % run.weapons.length : 0;
    run.weapons[replace] = entry;
    run.weaponIndex = replace;
  }
  return true;
}

// ---- attributes -----------------------------------------------------------

export function attributeBlocker(run, attributeId) {
  if (run.attributePoints <= 0) return 'no points';
  if ((run.attributes[attributeId] || 0) >= MAX_ATTRIBUTE) return 'maxed';
  return null;
}

export function spendAttribute(run, attributeId) {
  if (attributeBlocker(run, attributeId)) return false;
  if (!ATTRIBUTES.some((a) => a.id === attributeId)) return false;
  run.attributePoints--;
  run.attributes[attributeId] = (run.attributes[attributeId] || 0) + 1;
  return true;
}
