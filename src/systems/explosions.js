// Area damage: zombies take full damage with distance falloff, the player a
// reduced, capped amount.

import { EXPLOSION } from '../config.js';
import { damageZombie } from './combat.js';

export function explode(game, x, y, radius, damage, { source = 'explosive' } = {}) {
  for (const z of game.zombies) {
    if (z.dead) continue;
    const f = falloff(x, y, z.x, z.y, radius + z.radius);
    if (f > 0) damageZombie(game, z, damage * f, { source, angle: Math.atan2(z.y - y, z.x - x) });
  }

  const p = game.player;
  const fp = falloff(x, y, p.x, p.y, radius + p.radius);
  if (fp > 0) {
    p.takeDamage(Math.min(EXPLOSION.PLAYER_MAX_DAMAGE, damage * EXPLOSION.PLAYER_DAMAGE_FACTOR * fp));
  }

  game.effects.rings.push({ x, y, radius, life: EXPLOSION.RING_TIME, maxLife: EXPLOSION.RING_TIME });
  game.particles.explosion(x, y, EXPLOSION.PARTICLES);
  game.shake = Math.max(game.shake, EXPLOSION.SHAKE);
}

// 1 at the centre, EDGE_DAMAGE_FRACTION at the edge, 0 outside.
function falloff(x, y, tx, ty, reach) {
  const d = Math.hypot(tx - x, ty - y);
  if (d >= reach) return 0;
  return 1 - (d / reach) * (1 - EXPLOSION.EDGE_DAMAGE_FRACTION);
}

export function updateRings(game, dt) {
  const rings = game.effects.rings;
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].life -= dt;
    if (rings[i].life <= 0) rings.splice(i, 1);
  }
}
