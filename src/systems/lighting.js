// Light sources and line-of-sight polygons. Rendering is in render/lighting.js.

import { LIGHTING, COLORS } from '../config.js';
import { addFloater } from './scoring.js';

// Grid traversal along a ray: returns the distance to the first tile that
// blocks light and that tile, or the radius when nothing is hit.
function castRay(world, x, y, dx, dy, radius) {
  const ts = world.tileSize;
  let tx = Math.floor(x / ts);
  let ty = Math.floor(y / ts);
  const stepX = dx > 0 ? 1 : -1;
  const stepY = dy > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(ts / dx) : Infinity;
  const tDeltaY = dy !== 0 ? Math.abs(ts / dy) : Infinity;
  let tMaxX = dx !== 0 ? (dx > 0 ? (tx + 1) * ts - x : x - tx * ts) / Math.abs(dx) : Infinity;
  let tMaxY = dy !== 0 ? (dy > 0 ? (ty + 1) * ts - y : y - ty * ts) / Math.abs(dy) : Infinity;
  let t = 0;
  for (let i = 0; i < 400; i++) {
    if (tMaxX < tMaxY) {
      t = tMaxX;
      tMaxX += tDeltaX;
      tx += stepX;
    } else {
      t = tMaxY;
      tMaxY += tDeltaY;
      ty += stepY;
    }
    if (t >= radius) return { t: radius, tx: -1, ty: -1 };
    if (world.blocksLight(tx, ty)) return { t, tx, ty };
  }
  return { t: radius, tx: -1, ty: -1 };
}

// Casts `rays` rays from (x, y) between the two angles. Returns the fan of
// hit points (the lit floor) and the wall tiles the rays ran into, so those
// wall pieces can be lit as whole blocks.
export function castLight(world, x, y, radius, rays, startAngle = 0, endAngle = Math.PI * 2) {
  const polygon = [];
  const walls = [];
  const seen = new Set();
  const full = endAngle - startAngle >= Math.PI * 2 - 1e-6;
  const n = full ? rays : rays + 1;
  for (let i = 0; i < n; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / rays;
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    const hit = castRay(world, x, y, dx, dy, radius);
    // Reach a little into the wall so the face is covered without a seam.
    const d = Math.min(radius, hit.t + LIGHTING.WALL_LIGHT_DEPTH);
    polygon.push({ x: x + dx * d, y: y + dy * d });
    if (hit.tx >= 0) {
      const key = hit.ty * world.width + hit.tx;
      if (!seen.has(key)) {
        seen.add(key);
        walls.push({ tx: hit.tx, ty: hit.ty });
      }
    }
  }
  return { polygon, walls };
}

export class LightingSystem {
  constructor(game) {
    this.game = game;
    this.lampCache = new Map(); // light index -> { version, polygon }
  }

  // Everything that lights the map this frame.
  sources() {
    const { player, world } = this.game;
    const list = [];
    if (!player.dead) {
      list.push({ kind: 'glow', x: player.x, y: player.y, radius: LIGHTING.PLAYER_GLOW_RADIUS, polygon: null });
      if (player.flashlightOn) {
        const half = LIGHTING.FLASHLIGHT_ANGLE / 2;
        const cast = castLight(world, player.x, player.y, LIGHTING.FLASHLIGHT_LENGTH, LIGHTING.FLASHLIGHT_RAYS, player.aim - half, player.aim + half);
        list.push({ kind: 'cone', x: player.x, y: player.y, radius: LIGHTING.FLASHLIGHT_LENGTH, polygon: cast.polygon, walls: cast.walls, apex: true });
      }
    }
    for (const light of world.lights) {
      if (!light.on || light.broken) continue;
      const cached = this.lampCache.get(light.index);
      let cast = cached && cached.version === world.version ? cached.cast : null;
      if (!cast) {
        cast = castLight(world, light.x, light.y, light.lightRadius, LIGHTING.ROOM_LIGHT_RAYS);
        this.lampCache.set(light.index, { version: world.version, cast });
      }
      list.push({ kind: 'lamp', x: light.x, y: light.y, radius: light.lightRadius, polygon: cast.polygon, walls: cast.walls });
    }
    return list;
  }
}

export function toggleLight(game, light) {
  if (light.broken) return;
  light.on = !light.on;
}

export function damageLight(game, light, amount) {
  if (light.broken) return;
  light.hp -= amount;
  game.particles.glass(light.x, light.y);
  if (light.hp <= 0) {
    light.broken = true;
    light.on = false;
    addFloater(game, 'Light destroyed', light.x, light.y - light.radius, { color: COLORS.FLOATER_BAD });
  }
}
