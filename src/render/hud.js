// Screen-space overlay: health, points, round, weapon panel, prompts,
// round announcements and the game-over screen.

import { COLORS, HUD, ROUNDS } from '../config.js';

export function drawHud(ctx, game, width, height) {
  ctx.save();
  ctx.textBaseline = 'middle';
  drawHealthAndPoints(ctx, game, height);
  drawRound(ctx, game, width);
  drawWeaponPanel(ctx, game, width, height);
  drawPrompt(ctx, game, width, height);
  drawAnnouncement(ctx, game, width, height);
  if (game.state === 'gameover') drawGameOver(ctx, game, width, height);
  ctx.restore();
}

function drawHealthAndPoints(ctx, game, height) {
  const p = game.player;
  const m = HUD.MARGIN;
  const y = height - m - HUD.HEALTH_HEIGHT;
  ctx.fillStyle = COLORS.HEALTH_BACK;
  ctx.fillRect(m, y, HUD.HEALTH_WIDTH, HUD.HEALTH_HEIGHT);
  const frac = Math.max(0, p.health / p.maxHealth);
  ctx.fillStyle = frac <= HUD.LOW_HEALTH_FRACTION ? COLORS.HEALTH_LOW : COLORS.HEALTH;
  ctx.fillRect(m, y, HUD.HEALTH_WIDTH * frac, HUD.HEALTH_HEIGHT);
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `bold ${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.ceil(p.health)} / ${p.maxHealth}`, m + 8, y + HUD.HEALTH_HEIGHT / 2);

  ctx.fillStyle = COLORS.POINTS;
  ctx.font = `bold ${HUD.FONT_SIZE_LARGE}px ${HUD.FONT}`;
  ctx.fillText(`${p.points}`, m, y - HUD.FONT_SIZE_LARGE);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  ctx.fillText('points', m + ctx.measureText(`${p.points}`).width + HUD.FONT_SIZE_LARGE * 1.6, y - HUD.FONT_SIZE_LARGE);
}

function drawRound(ctx, game, width) {
  const r = game.rounds;
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.ROUND_ANNOUNCE;
  ctx.font = `bold ${HUD.FONT_SIZE_LARGE}px ${HUD.FONT}`;
  ctx.fillText(`Round ${r.round || 1}`, width / 2, HUD.MARGIN + HUD.FONT_SIZE_LARGE / 2);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  const alive = game.zombies.length + r.toSpawn;
  const line = r.state === 'active' ? `${alive} remaining` : r.round === 0 ? 'Get ready' : `Next round in ${Math.ceil(r.timer)}`;
  ctx.fillText(line, width / 2, HUD.MARGIN + HUD.FONT_SIZE_LARGE + 6);
}

function drawWeaponPanel(ctx, game, width, height) {
  const p = game.player;
  const w = p.weapon;
  const m = HUD.MARGIN;
  const x = width - m;
  const y = height - m;
  ctx.textAlign = 'right';

  // Ammo
  ctx.fillStyle = w.reloading ? COLORS.HUD_DIM : COLORS.HUD_TEXT;
  ctx.font = `bold ${HUD.FONT_SIZE_LARGE}px ${HUD.FONT}`;
  const ammoText = w.reloading ? 'RELOADING' : `${w.mag} / ${w.reserve}`;
  ctx.fillText(ammoText, x, y - HUD.FONT_SIZE_LARGE / 2);

  // Name + fire mode icon
  ctx.fillStyle = w.def.color;
  ctx.font = `bold ${HUD.FONT_SIZE}px ${HUD.FONT}`;
  const nameY = y - HUD.FONT_SIZE_LARGE - HUD.FONT_SIZE;
  ctx.fillText(w.def.name, x, nameY);
  const nameW = ctx.measureText(w.def.name).width;
  drawFireModeIcon(ctx, w.def.fireMode, x - nameW - 22, nameY);

  // Other slot
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  const other = p.weapons.find((o) => o !== w);
  ctx.fillText(other ? `[${p.weapons.indexOf(other) + 1}] ${other.def.name}  ${other.mag}/${other.reserve}` : '[2] empty slot', x, nameY - HUD.FONT_SIZE - 2);

  // Grenades and decoys
  const iconY = nameY - HUD.FONT_SIZE * 2 - 10;
  drawGrenadeIcon(ctx, x - 10, iconY);
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `bold ${HUD.FONT_SIZE}px ${HUD.FONT}`;
  ctx.fillText(`${p.grenades}`, x - 24, iconY);
  drawDecoyIcon(ctx, x - 62, iconY);
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.fillText(`${p.decoys}`, x - 76, iconY);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 5}px ${HUD.FONT}`;
  ctx.fillText('Q decoy   G grenade', x, iconY - HUD.FONT_SIZE);
}

function drawFireModeIcon(ctx, mode, cx, cy) {
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.strokeStyle = COLORS.HUD_TEXT;
  ctx.lineWidth = 1.5;
  const dot = (dx) => {
    ctx.beginPath();
    ctx.arc(cx + dx, cy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  };
  if (mode === 'single') {
    dot(0);
  } else if (mode === 'burst') {
    dot(-6); dot(0); dot(6);
  } else if (mode === 'auto') {
    dot(-6); dot(0); dot(6);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 6);
    ctx.lineTo(cx + 10, cy + 6);
    ctx.stroke();
  } else if (mode === 'explosive') {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
      ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
      ctx.stroke();
    }
  }
}

function drawGrenadeIcon(ctx, cx, cy) {
  ctx.beginPath();
  ctx.arc(cx, cy + 1, 6, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.GRENADE;
  ctx.fill();
  ctx.strokeStyle = COLORS.GRENADE_FUSE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = COLORS.GRENADE_FUSE;
  ctx.fillRect(cx - 2, cy - 9, 4, 4);
}

function drawDecoyIcon(ctx, cx, cy) {
  ctx.beginPath();
  ctx.arc(cx, cy + 1, 6, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.DECOY;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy + 1, 9, 0, Math.PI * 2);
  ctx.strokeStyle = COLORS.DECOY_PULSE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawPrompt(ctx, game, width, height) {
  const item = game.interactable;
  if (!item || game.state !== 'playing') return;
  const text = `E: ${item.prompt}`;
  ctx.font = `bold ${HUD.FONT_SIZE}px ${HUD.FONT}`;
  ctx.textAlign = 'center';
  const tw = ctx.measureText(text).width + 24;
  const y = height * HUD.PROMPT_Y_FRACTION;
  ctx.fillStyle = COLORS.PROMPT_BACK;
  ctx.fillRect(width / 2 - tw / 2, y - 16, tw, 32);
  ctx.fillStyle = item.price > game.player.points ? COLORS.FLOATER_BAD : COLORS.HUD_TEXT;
  ctx.fillText(text, width / 2, y);
}

function drawAnnouncement(ctx, game, width, height) {
  const r = game.rounds;
  if (r.announceTimer <= 0 || game.state !== 'playing') return;
  const t = r.announceTimer / ROUNDS.ANNOUNCE_TIME;
  const alpha = t > 1 - HUD.ANNOUNCE_FADE / ROUNDS.ANNOUNCE_TIME
    ? (1 - t) * (ROUNDS.ANNOUNCE_TIME / HUD.ANNOUNCE_FADE)
    : Math.min(1, t * (ROUNDS.ANNOUNCE_TIME / HUD.ANNOUNCE_FADE));
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle = COLORS.ROUND_ANNOUNCE;
  ctx.font = `bold ${HUD.FONT_SIZE_TITLE}px ${HUD.FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`Round ${r.round}`, width / 2, height * 0.3);
  ctx.globalAlpha = 1;
}

function drawGameOver(ctx, game, width, height) {
  ctx.fillStyle = COLORS.OVERLAY;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.ROUND_ANNOUNCE;
  ctx.font = `bold ${HUD.FONT_SIZE_TITLE}px ${HUD.FONT}`;
  ctx.fillText('You died', width / 2, height * 0.35);
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `bold ${HUD.FONT_SIZE_LARGE}px ${HUD.FONT}`;
  const survived = Math.max(0, game.rounds.round - (game.rounds.state === 'intermission' ? 0 : 1));
  ctx.fillText(`Rounds survived: ${survived}`, width / 2, height * 0.35 + HUD.FONT_SIZE_TITLE);
  ctx.fillText(`Final score: ${game.player.score}`, width / 2, height * 0.35 + HUD.FONT_SIZE_TITLE + HUD.FONT_SIZE_LARGE * 1.4);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE}px ${HUD.FONT}`;
  ctx.fillText(`Kills: ${game.player.kills}`, width / 2, height * 0.35 + HUD.FONT_SIZE_TITLE + HUD.FONT_SIZE_LARGE * 2.6);
  ctx.fillText('Press Enter or click to play again', width / 2, height * 0.35 + HUD.FONT_SIZE_TITLE + HUD.FONT_SIZE_LARGE * 4);
}
