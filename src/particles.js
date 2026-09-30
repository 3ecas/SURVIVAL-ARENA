// Simple particle pool: data and update only. Drawing lives in render/effects.js.

import { PARTICLES, COLORS } from './config.js';
import { randRange, randSpread } from './utils/math.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  emit(x, y, { count, speed, life, color, size = 3, angle = null, spread = Math.PI * 2, drag = PARTICLES.DRAG }) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= PARTICLES.MAX) this.particles.shift();
      const a = angle === null ? randRange(0, Math.PI * 2) : angle + randSpread(spread / 2);
      const s = speed * randRange(0.4, 1);
      const l = life * randRange(0.6, 1);
      this.particles.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: l, maxLife: l, color, size, drag,
      });
    }
  }

  blood(x, y, angle) {
    this.emit(x, y, {
      count: PARTICLES.BLOOD_COUNT, speed: PARTICLES.BLOOD_SPEED, life: PARTICLES.BLOOD_LIFE,
      color: COLORS.BLOOD, size: 3, angle, spread: Math.PI * 0.8,
    });
  }

  headshot(x, y) {
    this.emit(x, y, {
      count: PARTICLES.HEADSHOT_COUNT, speed: PARTICLES.HEADSHOT_SPEED, life: PARTICLES.HEADSHOT_LIFE,
      color: COLORS.HEADSHOT, size: 3,
    });
  }

  death(x, y, color = COLORS.DEATH) {
    this.emit(x, y, {
      count: PARTICLES.DEATH_COUNT, speed: PARTICLES.DEATH_SPEED, life: PARTICLES.DEATH_LIFE, color, size: 4,
    });
  }

  muzzle(x, y, angle) {
    this.emit(x, y, {
      count: PARTICLES.MUZZLE_COUNT, speed: PARTICLES.MUZZLE_SPEED, life: PARTICLES.MUZZLE_LIFE,
      color: COLORS.MUZZLE, size: 3, angle, spread: Math.PI * 0.3, drag: 0,
    });
  }

  explosion(x, y, count) {
    this.emit(x, y, {
      count, speed: PARTICLES.EXPLOSION_SPEED, life: PARTICLES.EXPLOSION_LIFE, color: COLORS.EXPLOSION_RING, size: 4,
    });
  }

  update(dt) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps[i] = ps[ps.length - 1];
        ps.pop();
        continue;
      }
      const k = Math.max(0, 1 - p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
}
