// What E does: open doors and toggle lights.

import { PLAYER } from '../config.js';
import { toggleLight } from './lighting.js';

// The closest usable thing within reach, with its prompt text, or null.
export function findInteractable(game) {
  const { player, world } = game;
  const range = PLAYER.INTERACT_RANGE;
  const half = world.tileSize / 2;
  let best = null;
  const consider = (d, item) => {
    if (!best || d < best.distance) best = { ...item, distance: d };
  };

  for (const door of world.doors) {
    if (door.open) continue;
    for (const t of door.tiles) {
      const c = world.tileCenter(t.x, t.y);
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      if (d <= range + half) consider(d, { type: 'door', door, prompt: 'Open door' });
    }
  }

  for (const light of world.lights) {
    if (light.broken) continue;
    const d = Math.hypot(light.x - player.x, light.y - player.y);
    if (d <= range) consider(d, { type: 'light', light, prompt: light.on ? 'Turn light off' : 'Turn light on' });
  }

  return best;
}

export function interact(game, item) {
  if (!item) return;
  switch (item.type) {
    case 'door':
      game.world.openDoor(item.door);
      game.onWorldChanged();
      return;
    case 'light':
      toggleLight(game, item.light);
      return;
    default:
  }
}
