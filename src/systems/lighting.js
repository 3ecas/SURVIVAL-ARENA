// Light sources and line-of-sight polygons. Rendering is in render/lighting.js.

import { LIGHTING, COLORS } from '../config.js';
import { addFloater } from './scoring.js';

// Casts `rays` rays from (x, y) between the two angles and returns the fan of
// hit points, stopping at anything that blocks light or at `radius`.
export function visibilityPolygon(world, x, y, radius, rays, startAngle = 0, endAngle = Math.PI * 2) {
  const pts = [];
  const step = LIGHTING.RAY_STEP;
  const ts = world.tileSize;
  const full = endAngle - startAngle >= Math.PI * 2 - 1e-6;
  const n = full ? rays : rays + 1;
  for (let i = 0; i < n; i++) {
    const a = startAngle + ((endAngle - startAngle) * i) / (full ? rays : rays);
    const dx = Math.cos(a);
    const dy = Math.sin(a);
    let d = 0;
    let px = x;
    let py = y;
    while (d < radius) {
      const nd = Math.min(radius, d + step);
      const nx = x + dx * nd;
      const ny = y + dy * nd;
      if (world.blocksLight(Math.floor(nx / ts), Math.floor(ny / ts))) {
        // Nudge into the wall a little so the wall face itself is lit.
        const into = Math.min(radius, d + step * 0.6);
        px = x + dx * into;
        py = y + dy * into;
        break;
      }
      d = nd;
      px = nx;
      py = ny;
    }
    pts.push({ x: px, y: py });
  }
  return pts;
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
        list.push({
          kind: 'cone',
          x: player.x,
          y: player.y,
          radius: LIGHTING.FLASHLIGHT_LENGTH,
          polygon: visibilityPolygon(world, player.x, player.y, LIGHTING.FLASHLIGHT_LENGTH, LIGHTING.FLASHLIGHT_RAYS, player.aim - half, player.aim + half),
          apex: true,
        });
      }
    }
    for (const light of world.lights) {
      if (!light.on || light.broken) continue;
      const cached = this.lampCache.get(light.index);
      let polygon = cached && cached.version === world.version ? cached.polygon : null;
      if (!polygon) {
        polygon = visibilityPolygon(world, light.x, light.y, light.lightRadius, LIGHTING.ROOM_LIGHT_RAYS);
        this.lampCache.set(light.index, { version: world.version, polygon });
      }
      list.push({ kind: 'lamp', x: light.x, y: light.y, radius: light.lightRadius, polygon });
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
