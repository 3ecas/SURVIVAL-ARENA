// Particles, floating point numbers, explosion rings and the melee swing arc.

import { COLORS, HUD, MELEE } from '../config.js';

export function drawEffects(ctx, game) {
  drawParticles(ctx, game.particles.particles);
  drawRings(ctx, game.effects.rings);
  drawMeleeArc(ctx, game.player);
  drawFloaters(ctx, game.floaters);
}

function drawParticles(ctx, particles) {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function drawRings(ctx, rings) {
  for (const r of rings) {
    const t = 1 - r.life / r.maxLife;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius * (0.3 + 0.7 * t), 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.EXPLOSION_RING;
    ctx.lineWidth = 6 * (1 - t) + 1;
    ctx.globalAlpha = 1 - t;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawMeleeArc(ctx, p) {
  if (p.meleeSwing <= 0) return;
  const t = p.meleeSwing / MELEE.SWING_TIME;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.arc(p.x, p.y, MELEE.RANGE, p.aim - MELEE.ARC / 2, p.aim + MELEE.ARC / 2);
  ctx.closePath();
  ctx.fillStyle = COLORS.MELEE_ARC;
  ctx.globalAlpha = t;
  ctx.fill();
  ctx.globalAlpha = 1;
}

function drawFloaters(ctx, floaters) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const f of floaters) {
    ctx.globalAlpha = Math.min(1, f.life / (f.maxLife * 0.5));
    ctx.font = `bold ${f.size}px ${HUD.FONT}`;
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
