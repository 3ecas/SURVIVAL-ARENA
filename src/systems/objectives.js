// Level objectives: board every window, then extract at the entrance.

import { OBJECTIVES } from '../config.js';

export function objectiveList(game) {
  const world = game.world;
  const boarded = world.windows.filter((w) => w.boarded).length;
  const total = world.windows.length;
  return [
    { id: 'board', text: `Board up the windows  ${boarded}/${total}`, done: boarded === total },
    { id: 'extract', text: 'Return to the entrance and extract', done: game.state === 'extracted' },
  ];
}

export function allWindowsBoarded(world) {
  return world.windows.every((w) => w.boarded);
}

export function nearEntrance(game) {
  const e = game.world.entrance;
  if (!e) return false;
  const p = game.player;
  return Math.hypot(e.insideCenter.x - p.x, e.insideCenter.y - p.y) <= OBJECTIVES.EXTRACT_RANGE;
}

export function canExtract(game) {
  return allWindowsBoarded(game.world) && nearEntrance(game);
}
