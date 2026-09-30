// Loot on the floor: placement from the level data and pickup by the player.

import { PLAYER, LEVELS, COLORS } from '../config.js';
import { ITEM_TYPES } from '../data/items.js';
import { Item } from '../entities/item.js';
import { addFloater } from './scoring.js';

export function spawnItems(game, levelItems) {
  for (const it of levelItems) {
    const c = game.world.tileCenter(it.x, it.y);
    game.items.push(new Item(it.type, c.x, c.y));
  }
}

export function updateItems(game, dt) {
  const p = game.player;
  const list = game.items;
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i];
    it.update(dt);
    if (p.dead) continue;
    const d = Math.hypot(it.x - p.x, it.y - p.y);
    if (d > PLAYER.PICKUP_RANGE + it.radius) continue;
    if (!pickUp(game, it)) continue;
    list[i] = list[list.length - 1];
    list.pop();
  }
}

// Returns false when the item is of no use right now and stays on the floor.
function pickUp(game, item) {
  const p = game.player;
  const def = ITEM_TYPES[item.type];
  let text = `+1 ${def.name}`;
  switch (item.type) {
    case 'ammo': {
      const target = p.weapons.find((w) => w.reserve < w.def.reserve) ? [p.weapon, ...p.weapons].find((w) => w.reserve < w.def.reserve) : null;
      if (!target) return false;
      const amount = Math.max(1, Math.round(target.def.magazine * LEVELS.AMMO_BOX_FRACTION));
      target.reserve = Math.min(target.def.reserve, target.reserve + amount);
      text = `+${amount} ${target.def.name} ammo`;
      break;
    }
    case 'medkit':
      if (p.health >= p.maxHealth) return false;
      p.heal(PLAYER.BANDAGE_HEAL);
      text = `+${PLAYER.BANDAGE_HEAL} health`;
      break;
    case 'grenade':
      if (p.grenades >= PLAYER.MAX_GRENADES) return false;
      p.grenades++;
      break;
    case 'decoy':
      if (p.decoys >= PLAYER.MAX_DECOYS) return false;
      p.decoys++;
      break;
    default:
      p.addItem(item.type, 1);
  }
  addFloater(game, text, item.x, item.y - item.radius, { color: COLORS.FLOATER_PICKUP });
  return true;
}
