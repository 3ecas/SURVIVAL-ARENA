// The hub screen: stats and gear, crafting, and the briefing for the next map.

import { COLORS, HUD, HUB, PLAYER, MELEE } from '../config.js';
import { WEAPONS } from '../data/weapons.js';
import { ITEM_TYPES, INVENTORY_TYPES } from '../data/items.js';
import { craftBlocker, craftEffect } from '../systems/crafting.js';

export function drawHub(ctx, hub, width, height) {
  const { run, meta, briefing } = hub;
  ctx.save();
  ctx.fillStyle = COLORS.HUB_BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'middle';

  const pad = HUB.PADDING;
  const colW = (width - pad * 2 - HUB.COLUMN_GAP * 2) / 3;
  const cols = [pad, pad + colW + HUB.COLUMN_GAP, pad + (colW + HUB.COLUMN_GAP) * 2];
  const top = pad + HUB.TITLE_SIZE + 40;

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `bold ${HUB.TITLE_SIZE}px ${HUD.FONT}`;
  ctx.fillText('Survival Arena  ·  Hub', pad, pad + HUB.TITLE_SIZE / 2);
  ctx.font = `${HUB.TEXT_SIZE}px ${HUD.FONT}`;
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.fillText(lastResultLine(meta), pad, pad + HUB.TITLE_SIZE + 14);

  drawStats(ctx, run, meta, cols[0], top, colW);
  drawCrafting(ctx, hub, cols[1], top, colW, height - top - pad - 40);
  drawBriefing(ctx, briefing, cols[2], top, colW);

  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.HUB_ACCENT;
  ctx.font = `bold ${HUB.HEADING_SIZE}px ${HUD.FONT}`;
  ctx.fillText('SPACE: deploy to the next map      W/S: choose recipe      ENTER: craft      Q: switch active weapon      N: new run', width / 2, height - pad);
  ctx.restore();
}

function lastResultLine(meta) {
  const r = meta.lastResult;
  if (!r) return 'New run. You start with a pistol and a knife. Find planks, board every window, extract.';
  if (r.died) return `Last run ended on level ${r.level} with ${r.score} points and ${r.kills} kills. Best: level ${meta.bestLevel}, ${meta.bestScore} points.`;
  return `Level ${r.level} cleared with ${r.kills} kills. Best: level ${meta.bestLevel}, ${meta.bestScore} points.`;
}

function heading(ctx, text, x, y) {
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.HUB_ACCENT;
  ctx.font = `bold ${HUB.HEADING_SIZE}px ${HUD.FONT}`;
  ctx.fillText(text, x, y);
  return y + HUB.LINE * 1.3;
}

function line(ctx, text, x, y, color = COLORS.HUD_TEXT, bold = false) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${HUB.TEXT_SIZE}px ${HUD.FONT}`;
  ctx.fillText(text, x, y);
  return y + HUB.LINE;
}

function drawStats(ctx, run, meta, x, y, w) {
  y = heading(ctx, 'PLAYER', x, y);
  ctx.fillStyle = COLORS.HEALTH_BACK;
  ctx.fillRect(x, y - 8, w, 16);
  ctx.fillStyle = run.health / PLAYER.MAX_HEALTH <= HUD.LOW_HEALTH_FRACTION ? COLORS.HEALTH_LOW : COLORS.HEALTH;
  ctx.fillRect(x, y - 8, (w * run.health) / PLAYER.MAX_HEALTH, 16);
  y = line(ctx, `Health ${run.health} / ${PLAYER.MAX_HEALTH}`, x + 8, y, COLORS.HUD_TEXT, true) + 6;
  y = line(ctx, `Next map: level ${run.level}   ·   levels cleared: ${run.levelsCleared}`, x, y);
  y = line(ctx, `Score ${run.score}   ·   kills ${run.kills}`, x, y);
  y = line(ctx, `Runs ${meta.runs}   ·   best level ${meta.bestLevel}   ·   best score ${meta.bestScore}`, x, y, COLORS.HUD_DIM);

  y = heading(ctx, 'GEAR', x, y + HUB.LINE);
  run.weapons.forEach((w, i) => {
    const def = WEAPONS[w.id];
    const active = i === run.weaponIndex;
    y = line(ctx, `${active ? '▶ ' : '   '}[${i + 1}] ${def.name}   ${w.mag} / ${w.reserve}   (${def.fireMode})`, x, y, active ? def.color : COLORS.HUD_DIM, active);
  });
  if (run.weapons.length < PLAYER.MAX_WEAPONS) y = line(ctx, '   [2] empty slot', x, y, COLORS.HUD_DIM);
  y = line(ctx, `   ${MELEE.NAME} (right click)   ·   ${run.bandages} bandage${run.bandages === 1 ? '' : 's'}   ·   ${run.grenades} grenade${run.grenades === 1 ? '' : 's'}   ·   ${run.decoys} decoy${run.decoys === 1 ? '' : 's'}`, x, y, COLORS.HUD_DIM);

  y = heading(ctx, 'RESOURCES', x, y + HUB.LINE);
  for (const type of INVENTORY_TYPES) {
    const def = ITEM_TYPES[type];
    ctx.fillStyle = def.color;
    ctx.fillRect(x, y - 6, 12, 12);
    y = line(ctx, `${run.inventory[type]}  ${def.name}`, x + 20, y);
  }
}

function drawCrafting(ctx, hub, x, y, w, h) {
  const { run } = hub;
  y = heading(ctx, 'CRAFTING', x, y);
  const rowH = HUB.LINE * 1.9;
  const visible = Math.max(3, Math.floor((h - HUB.LINE * 2) / rowH));
  const first = Math.max(0, Math.min(hub.cursor - Math.floor(visible / 2), hub.recipes.length - visible));
  for (let i = first; i < Math.min(hub.recipes.length, first + visible); i++) {
    const r = hub.recipes[i];
    const blocker = craftBlocker(run, r);
    const selected = i === hub.cursor;
    if (selected) {
      ctx.fillStyle = COLORS.HUD_PANEL;
      ctx.fillRect(x - 8, y - HUB.LINE / 2 - 2, w + 16, rowH - 4);
      ctx.strokeStyle = COLORS.HUB_ACCENT;
      ctx.lineWidth = 1;
      ctx.strokeRect(x - 8, y - HUB.LINE / 2 - 2, w + 16, rowH - 4);
    }
    const color = blocker ? COLORS.HUB_DISABLED : COLORS.HUD_TEXT;
    ctx.textAlign = 'left';
    ctx.fillStyle = color;
    ctx.font = `${selected ? 'bold ' : ''}${HUB.TEXT_SIZE}px ${HUD.FONT}`;
    ctx.fillText(r.name, x, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = blocker ? COLORS.HUB_DISABLED : COLORS.HUD_DIM;
    ctx.font = `${HUB.TEXT_SIZE}px ${HUD.FONT}`;
    ctx.fillText(Object.entries(r.cost).map(([t, n]) => `${n} ${ITEM_TYPES[t].name.split(' ')[0].toLowerCase()}`).join(', '), x + w, y);
    ctx.textAlign = 'left';
    ctx.fillStyle = blocker ? COLORS.FLOATER_BAD : COLORS.HUD_DIM;
    ctx.font = `${HUB.TEXT_SIZE - 3}px ${HUD.FONT}`;
    const effect = craftEffect(run, r);
    ctx.fillText(blocker ? blocker : effect, x, y + HUB.LINE * 0.8);
    y += rowH;
  }
  if (hub.message) line(ctx, hub.message, x, y + HUB.LINE / 2, COLORS.SUCCESS);
}

function drawBriefing(ctx, b, x, y, w) {
  y = heading(ctx, `BRIEFING · LEVEL ${b.level}`, x, y);
  y = line(ctx, `Map ${b.params.width} x ${b.params.height} tiles, ${b.params.areas} areas`, x, y);
  y = line(ctx, `${b.map.doors.length} doors, ${b.windowCount} windows to board, ${b.map.lights.length} lights`, x, y);
  y = line(ctx, 'Board every window, then extract at the entrance.', x, y, COLORS.HUD_DIM);

  y = heading(ctx, 'EXPECTED ENEMIES', x, y + HUB.LINE);
  const e = b.enemies;
  y = line(ctx, `${e.total} zombies: ${e.walkers} walkers, ${e.runners} runners`, x, y);
  y = line(ctx, `${e.health} health each   ·   up to ${e.maxAlive} inside at once`, x, y, COLORS.HUD_DIM);
  y = line(ctx, 'They stop coming once every window is boarded.', x, y, COLORS.HUD_DIM);

  y = heading(ctx, 'RESOURCES ON THE MAP', x, y + HUB.LINE);
  for (const [type, n] of Object.entries(b.loot)) {
    if (!n) continue;
    const def = ITEM_TYPES[type];
    ctx.fillStyle = def.color;
    ctx.fillRect(x, y - 6, 12, 12);
    y = line(ctx, `${n}  ${def.name}${n === 1 ? '' : 's'}`, x + 20, y);
  }
  y = line(ctx, 'Planks always cover the windows, with a couple spare.', x, y + 4, COLORS.HUD_DIM);
}
