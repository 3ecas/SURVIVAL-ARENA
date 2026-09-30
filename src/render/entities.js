// Player, zombies, projectiles, grenades and decoys. Flat colours only.

import { COLORS, PLAYER, DECOY } from '../config.js';

export function drawEntities(ctx, game) {
  for (const g of game.grenades) drawGrenade(ctx, g);
  for (const d of game.decoys) drawDecoy(ctx, d);
  for (const z of game.zombies) drawZombie(ctx, z);
  if (!game.player.dead) drawPlayer(ctx, game.player);
  for (const p of game.projectiles) drawProjectile(ctx, p);
}

function drawPlayer(ctx, p) {
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.PLAYER;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = COLORS.PLAYER_OUTLINE;
  ctx.stroke();
  if (p.damageFlash > 0) {
    ctx.fillStyle = COLORS.PLAYER_DAMAGE;
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.aim) * PLAYER.AIM_LINE_LENGTH, p.y + Math.sin(p.aim) * PLAYER.AIM_LINE_LENGTH);
  ctx.strokeStyle = COLORS.PLAYER_AIM;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function drawZombie(ctx, z) {
  const runner = z.type === 'runner';
  const body = z.flash > 0 ? COLORS.ZOMBIE_FLASH : runner ? COLORS.ZOMBIE_RUNNER : COLORS.ZOMBIE_WALKER;
  const head = z.windingUp ? COLORS.ZOMBIE_WINDUP : runner ? COLORS.ZOMBIE_RUNNER_HEAD : COLORS.ZOMBIE_WALKER_HEAD;
  const alpha = z.isClimbing ? 0.55 + 0.45 * z.climb.t : 1;
  ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(z.x, z.y, z.headRadius, 0, Math.PI * 2);
  ctx.fillStyle = head;
  ctx.fill();
  if (z.hp < z.maxHp) {
    const w = z.radius * 2;
    const y = z.y - z.radius - 6;
    ctx.fillStyle = COLORS.ZOMBIE_HP_BACK;
    ctx.fillRect(z.x - w / 2, y, w, 3);
    ctx.fillStyle = COLORS.ZOMBIE_HP;
    ctx.fillRect(z.x - w / 2, y, w * Math.max(0, z.hp / z.maxHp), 3);
  }
  ctx.globalAlpha = 1;
}

function drawProjectile(ctx, p) {
  ctx.strokeStyle = p.color;
  ctx.lineWidth = p.kind === 'explosive' ? 4 : 2;
  ctx.beginPath();
  ctx.moveTo(p.prevX, p.prevY);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
  if (p.kind === 'explosive') {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
  }
}

function drawGrenade(ctx, g) {
  ctx.beginPath();
  ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.GRENADE;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = COLORS.GRENADE_FUSE;
  ctx.stroke();
  // Fuse spark blinks faster near the end.
  if (Math.floor(g.fuse * 10) % 2 === 0) {
    ctx.beginPath();
    ctx.arc(g.x, g.y - g.radius - 2, 2, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.GRENADE_FUSE;
    ctx.fill();
  }
}

function drawDecoy(ctx, d) {
  if (d.isActive) {
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.radius + DECOY.PULSE_RADIUS * d.pulse, 0, Math.PI * 2);
    ctx.strokeStyle = COLORS.DECOY_PULSE;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 1 - d.pulse;
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.beginPath();
  ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.DECOY;
  ctx.fill();
  ctx.fillStyle = COLORS.BACKGROUND;
  ctx.fillRect(d.x - 1, d.y - d.radius - 4, 2, 5);
  ctx.beginPath();
  ctx.arc(d.x, d.y - d.radius - 4, 1.5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.DECOY;
  ctx.fill();
}
