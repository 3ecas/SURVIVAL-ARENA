// Screen-space overlay: objectives, health, bandages, score, weapon panel,
// inventory, prompts, announcements and the end-of-level overlay.

import { COLORS, HUD, MELEE } from '../config.js';
import { ITEM_TYPES, INVENTORY_TYPES } from '../data/items.js';

export function drawHud(ctx, game, width, height) {
  ctx.save();
  ctx.textBaseline = 'middle';
  drawObjectives(ctx, game);
  drawTop(ctx, game, width);
  drawHealthAndScore(ctx, game, height);
  drawWeaponPanel(ctx, game, width, height);
  drawInventory(ctx, game, width, height);
  drawPrompt(ctx, game, width, height);
  drawAnnouncement(ctx, game, width, height);
  if (game.state !== 'playing') drawEndOverlay(ctx, game, width, height);
  ctx.restore();
}

function drawObjectives(ctx, game) {
  const m = HUD.MARGIN;
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  ctx.fillText('OBJECTIVES', m, m);
  ctx.font = `bold ${HUD.FONT_SIZE - 1}px ${HUD.FONT}`;
  game.objectives.forEach((o, i) => {
    ctx.fillStyle = o.done ? COLORS.OBJECTIVE_DONE : COLORS.OBJECTIVE_OPEN;
    ctx.fillText(`${o.done ? '✓' : '○'} ${o.text}`, m, m + HUD.FONT_SIZE * 1.4 * (i + 1));
  });
}

function drawTop(ctx, game, width) {
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.ANNOUNCE;
  ctx.font = `bold ${HUD.FONT_SIZE_LARGE}px ${HUD.FONT}`;
  ctx.fillText(`Level ${game.level}`, width / 2, HUD.MARGIN + HUD.FONT_SIZE_LARGE / 2);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  const s = game.spawner;
  const windows = game.world.activeWindows().length;
  const line = windows === 0 ? `${game.zombies.length} zombies left inside` : `${s.remaining} zombies expected  ·  ${windows} open window${windows === 1 ? '' : 's'}`;
  ctx.fillText(line, width / 2, HUD.MARGIN + HUD.FONT_SIZE_LARGE + 6);
}

function drawHealthAndScore(ctx, game, height) {
  const p = game.player;
  const m = HUD.MARGIN;
  const y = height - m - HUD.HEALTH_HEIGHT;
  ctx.fillStyle = COLORS.HEALTH_BACK;
  ctx.fillRect(m, y, HUD.HEALTH_WIDTH, HUD.HEALTH_HEIGHT);
  const frac = Math.max(0, p.health / p.maxHealth);
  ctx.fillStyle = frac <= HUD.LOW_HEALTH_FRACTION ? COLORS.HEALTH_LOW : COLORS.HEALTH;
  ctx.fillRect(m, y, HUD.HEALTH_WIDTH * frac, HUD.HEALTH_HEIGHT);
  if (p.healing > 0) {
    ctx.fillStyle = COLORS.OBJECTIVE_DONE;
    ctx.fillRect(m + HUD.HEALTH_WIDTH * frac, y, HUD.HEALTH_WIDTH * Math.min(1 - frac, p.healing / p.maxHealth), HUD.HEALTH_HEIGHT);
  }
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `bold ${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(`${Math.ceil(p.health)} / ${p.maxHealth}`, m + 8, y + HUD.HEALTH_HEIGHT / 2);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.fillText(`H: bandage x${p.bandages}`, m + HUD.HEALTH_WIDTH + 12, y + HUD.HEALTH_HEIGHT / 2);

  ctx.fillStyle = COLORS.POINTS;
  ctx.font = `bold ${HUD.FONT_SIZE_LARGE}px ${HUD.FONT}`;
  ctx.fillText(`${p.score}`, m, y - HUD.FONT_SIZE_LARGE);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  ctx.fillText('score', m + ctx.measureText(`${p.score}`).width + HUD.FONT_SIZE_LARGE * 1.6, y - HUD.FONT_SIZE_LARGE);
  ctx.fillText(`F: flashlight ${p.flashlightOn ? 'on' : 'off'}`, m, y - HUD.FONT_SIZE_LARGE * 2);
}

function drawWeaponPanel(ctx, game, width, height) {
  const p = game.player;
  const w = p.weapon;
  const m = HUD.MARGIN;
  const x = width - m;
  const y = height - m;
  ctx.textAlign = 'right';

  ctx.fillStyle = w.reloading ? COLORS.HUD_DIM : COLORS.HUD_TEXT;
  ctx.font = `bold ${HUD.FONT_SIZE_LARGE}px ${HUD.FONT}`;
  ctx.fillText(w.reloading ? 'RELOADING' : `${w.mag} / ${w.reserve}`, x, y - HUD.FONT_SIZE_LARGE / 2);

  ctx.fillStyle = w.def.color;
  ctx.font = `bold ${HUD.FONT_SIZE}px ${HUD.FONT}`;
  const nameY = y - HUD.FONT_SIZE_LARGE - HUD.FONT_SIZE;
  ctx.fillText(w.def.name, x, nameY);
  const nameW = ctx.measureText(w.def.name).width;
  drawFireModeIcon(ctx, w.def.fireMode, x - nameW - 22, nameY);

  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 3}px ${HUD.FONT}`;
  const other = p.weapons.find((o) => o !== w);
  ctx.fillText(other ? `[${p.weapons.indexOf(other) + 1}] ${other.def.name}  ${other.mag}/${other.reserve}` : `[2] empty slot  ·  ${MELEE.NAME}: right click`, x, nameY - HUD.FONT_SIZE - 2);

  const iconY = nameY - HUD.FONT_SIZE * 2 - 10;
  drawGrenadeIcon(ctx, x - 10, iconY);
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `bold ${HUD.FONT_SIZE}px ${HUD.FONT}`;
  ctx.fillText(`${p.grenades}`, x - 24, iconY);
  drawDecoyIcon(ctx, x - 62, iconY);
  ctx.fillText(`${p.decoys}`, x - 76, iconY);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 5}px ${HUD.FONT}`;
  ctx.fillText('Q decoy   G grenade', x, iconY - HUD.FONT_SIZE);
}

function drawInventory(ctx, game, width, height) {
  const p = game.player;
  const m = HUD.MARGIN;
  const x = width - m;
  const y = height - m - HUD.FONT_SIZE_LARGE * 2 - HUD.FONT_SIZE * 4 - 24;
  ctx.textAlign = 'right';
  ctx.font = `bold ${HUD.FONT_SIZE - 2}px ${HUD.FONT}`;
  let cx = x;
  for (const type of [...INVENTORY_TYPES].reverse()) {
    const def = ITEM_TYPES[type];
    const label = `${p.inventory[type]}`;
    ctx.fillStyle = COLORS.HUD_TEXT;
    ctx.fillText(label, cx, y);
    cx -= ctx.measureText(label).width + 6;
    ctx.fillStyle = def.color;
    ctx.fillRect(cx - HUD.INVENTORY_ICON, y - HUD.INVENTORY_ICON / 2, HUD.INVENTORY_ICON, HUD.INVENTORY_ICON);
    cx -= HUD.INVENTORY_ICON + 16;
  }
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE - 5}px ${HUD.FONT}`;
  ctx.fillText('planks · scrap · cloth · parts', x, y - HUD.FONT_SIZE);
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
  ctx.fillStyle = item.disabled ? COLORS.FLOATER_BAD : COLORS.HUD_TEXT;
  ctx.fillText(text, width / 2, y);
}

function drawAnnouncement(ctx, game, width, height) {
  const a = game.announce;
  if (a.timer <= 0 || game.state !== 'playing') return;
  const t = a.timer / HUD.ANNOUNCE_TIME;
  const fade = HUD.ANNOUNCE_FADE / HUD.ANNOUNCE_TIME;
  const alpha = t > 1 - fade ? (1 - t) / fade : Math.min(1, t / fade);
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.ANNOUNCE;
  ctx.font = `bold ${HUD.FONT_SIZE_TITLE}px ${HUD.FONT}`;
  ctx.fillText(a.text, width / 2, height * 0.3);
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `${HUD.FONT_SIZE_LARGE - 6}px ${HUD.FONT}`;
  ctx.fillText(a.sub, width / 2, height * 0.3 + HUD.FONT_SIZE_TITLE * 0.8);
  ctx.globalAlpha = 1;
}

function drawEndOverlay(ctx, game, width, height) {
  const won = game.state === 'extracted';
  ctx.fillStyle = COLORS.OVERLAY;
  ctx.fillRect(0, 0, width, height);
  ctx.textAlign = 'center';
  ctx.fillStyle = won ? COLORS.SUCCESS : COLORS.ANNOUNCE;
  ctx.font = `bold ${HUD.FONT_SIZE_TITLE}px ${HUD.FONT}`;
  ctx.fillText(won ? 'Extracted' : 'You died', width / 2, height * 0.35);
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `bold ${HUD.FONT_SIZE_LARGE}px ${HUD.FONT}`;
  const base = height * 0.35 + HUD.FONT_SIZE_TITLE;
  ctx.fillText(won ? `Level ${game.level} cleared` : `Fell on level ${game.level}`, width / 2, base);
  ctx.fillText(`Score: ${game.player.score}`, width / 2, base + HUD.FONT_SIZE_LARGE * 1.4);
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.font = `${HUD.FONT_SIZE}px ${HUD.FONT}`;
  ctx.fillText(`Kills: ${game.player.kills}`, width / 2, base + HUD.FONT_SIZE_LARGE * 2.6);
  ctx.fillText(won ? 'Press Enter to return to the hub' : 'Run over. Press Enter to return to the hub', width / 2, base + HUD.FONT_SIZE_LARGE * 4);
}
