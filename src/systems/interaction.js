// What E does: open doors, board windows, toggle lights, extract.

import { PLAYER, POINTS, COLORS } from '../config.js';
import { addFloater, awardPoints } from './scoring.js';
import { toggleLight } from './lighting.js';
import { allWindowsBoarded, nearEntrance } from './objectives.js';

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

  for (const win of world.windows) {
    if (win.boarded) continue;
    const d = Math.hypot(win.insideCenter.x - player.x, win.insideCenter.y - player.y);
    if (d > range) continue;
    const hasPlank = player.inventory.plank > 0;
    consider(d, { type: 'board', window: win, disabled: !hasPlank, prompt: hasPlank ? 'Board up window (1 plank)' : 'Board up window (need a plank)' });
  }

  for (const light of world.lights) {
    if (light.broken) continue;
    const d = Math.hypot(light.x - player.x, light.y - player.y);
    if (d <= range) consider(d, { type: 'light', light, prompt: light.on ? 'Turn light off' : 'Turn light on' });
  }

  if (nearEntrance(game)) {
    const ready = allWindowsBoarded(world);
    const d = Math.hypot(world.entrance.insideCenter.x - player.x, world.entrance.insideCenter.y - player.y);
    consider(d, { type: 'extract', disabled: !ready, prompt: ready ? 'Extract' : 'Extract (board every window first)' });
  }

  return best;
}

export function interact(game, item) {
  if (!item) return;
  const { player, world } = game;
  switch (item.type) {
    case 'door':
      world.openDoor(item.door);
      game.onWorldChanged();
      return;
    case 'board':
      if (player.inventory.plank <= 0) return refuse(game, 'No planks');
      player.inventory.plank--;
      world.boardWindow(item.window);
      game.onWorldChanged();
      awardPoints(game, POINTS.BOARD_WINDOW, item.window.insideCenter.x, item.window.insideCenter.y, { color: COLORS.FLOATER_PICKUP, big: true });
      return;
    case 'light':
      toggleLight(game, item.light);
      return;
    case 'extract':
      if (!allWindowsBoarded(world)) return refuse(game, 'Board every window first');
      game.extract();
      return;
    default:
  }
}

function refuse(game, text) {
  addFloater(game, text, game.player.x, game.player.y - game.player.radius * 2, { color: COLORS.FLOATER_BAD });
}
