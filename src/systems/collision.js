// Circle-vs-tile-grid resolution and circle-vs-circle separation.

import { ZOMBIE } from '../config.js';

// Pushes a circle out of every solid tile it overlaps.
export function resolveCircleVsWorld(c, world) {
  const ts = world.tileSize;
  for (let pass = 0; pass < 2; pass++) {
    const minX = Math.floor((c.x - c.radius) / ts);
    const maxX = Math.floor((c.x + c.radius) / ts);
    const minY = Math.floor((c.y - c.radius) / ts);
    const maxY = Math.floor((c.y + c.radius) / ts);
    for (let ty = minY; ty <= maxY; ty++) {
      for (let tx = minX; tx <= maxX; tx++) {
        if (!world.isSolid(tx, ty)) continue;
        pushOutOfRect(c, tx * ts, ty * ts, ts, ts);
      }
    }
  }
}

function pushOutOfRect(c, rx, ry, rw, rh) {
  const cx = Math.max(rx, Math.min(c.x, rx + rw));
  const cy = Math.max(ry, Math.min(c.y, ry + rh));
  const dx = c.x - cx;
  const dy = c.y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= c.radius * c.radius) return;
  if (d2 === 0) {
    // Centre is inside the rect: leave through the nearest edge.
    const left = c.x - rx;
    const right = rx + rw - c.x;
    const top = c.y - ry;
    const bottom = ry + rh - c.y;
    const m = Math.min(left, right, top, bottom);
    if (m === left) c.x = rx - c.radius;
    else if (m === right) c.x = rx + rw + c.radius;
    else if (m === top) c.y = ry - c.radius;
    else c.y = ry + rh + c.radius;
    return;
  }
  const d = Math.sqrt(d2);
  const push = c.radius - d;
  c.x += (dx / d) * push;
  c.y += (dy / d) * push;
}

// Moves overlapping circles apart, half each. Uses a spatial hash so it is
// cheap even with the maximum number of zombies alive.
export function separateCircles(circles, cellSize, iterations = ZOMBIE.SEPARATION_ITERATIONS) {
  for (let iter = 0; iter < iterations; iter++) {
    const grid = new Map();
    for (const c of circles) {
      const key = cellKey(Math.floor(c.x / cellSize), Math.floor(c.y / cellSize));
      const bucket = grid.get(key);
      if (bucket) bucket.push(c);
      else grid.set(key, [c]);
    }
    for (const a of circles) {
      const gx = Math.floor(a.x / cellSize);
      const gy = Math.floor(a.y / cellSize);
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const bucket = grid.get(cellKey(gx + ox, gy + oy));
          if (!bucket) continue;
          for (const b of bucket) {
            if (b.id <= a.id) continue;
            separatePair(a, b, 0.5);
          }
        }
      }
    }
  }
}

function cellKey(x, y) {
  return x * 73856093 ^ y * 19349663;
}

// Pushes b out of a; `shareA` is the fraction of the correction applied to a.
export function separatePair(a, b, shareA) {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  let d2 = dx * dx + dy * dy;
  const minD = a.radius + b.radius;
  if (d2 >= minD * minD) return false;
  if (d2 === 0) {
    dx = (Math.random() - 0.5) * 0.01;
    dy = (Math.random() - 0.5) * 0.01;
    d2 = dx * dx + dy * dy;
  }
  const d = Math.sqrt(d2);
  const overlap = minD - d;
  const nx = dx / d;
  const ny = dy / d;
  a.x -= nx * overlap * shareA;
  a.y -= ny * overlap * shareA;
  b.x += nx * overlap * (1 - shareA);
  b.y += ny * overlap * (1 - shareA);
  return true;
}

export function circlesOverlap(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const r = a.radius + b.radius;
  return dx * dx + dy * dy < r * r;
}
