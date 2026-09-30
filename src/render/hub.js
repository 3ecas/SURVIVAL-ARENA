// The hub screen: three panels of cards with vector icons. Laid out in a
// fixed virtual space and scaled to the window.

import { COLORS, HUD, HUB, PLAYER, MELEE } from '../config.js';
import { WEAPONS } from '../data/weapons.js';
import { ITEM_TYPES, INVENTORY_TYPES } from '../data/items.js';
import { UNLOCKS } from '../data/armory.js';
import { ATTRIBUTES, MAX_ATTRIBUTE } from '../data/attributes.js';
import { xpToNext } from '../run.js';
import { craftBlocker, unlockBlocker, attributeBlocker } from '../systems/crafting.js';
import { drawIcon, drawFireModeIcon } from './icons.js';

const FONT = HUD.FONT;
const GAP = HUB.CARD_GAP;

export function drawHub(ctx, hub, width, height) {
  const VW = HUB.VIRTUAL_WIDTH;
  const VH = HUB.VIRTUAL_HEIGHT;
  const scale = Math.min(width / VW, height / VH);
  ctx.save();
  ctx.fillStyle = COLORS.HUB_BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.translate((width - VW * scale) / 2, (height - VH * scale) / 2);
  ctx.scale(scale, scale);
  ctx.textBaseline = 'middle';

  const pad = HUB.PADDING;
  const headerH = 70;
  const footerH = 40;
  const colW = (VW - pad * 2 - HUB.COLUMN_GAP * 2) / 3;
  const top = pad + headerH;
  const panelH = VH - top - pad - footerH;
  const cols = [pad, pad + colW + HUB.COLUMN_GAP, pad + (colW + HUB.COLUMN_GAP) * 2];

  drawHeader(ctx, hub, pad, VW);
  drawPanel(ctx, cols[0], top, colW, panelH, 'NEXT MAP', `LEVEL ${hub.run.level}`, false);
  drawNextMap(ctx, hub.briefing, inner(cols[0], top, colW));
  drawPanel(ctx, cols[1], top, colW, panelH, 'GEAR & INVENTORY', 'TAB to switch', hub.focus === 'gear');
  drawGear(ctx, hub, inner(cols[1], top, colW));
  drawPanel(ctx, cols[2], top, colW, panelH, 'ARMORY', 'unlock & craft', hub.focus === 'armory');
  drawArmory(ctx, hub, inner(cols[2], top, colW));
  drawFooter(ctx, hub, pad, VW, VH);
  ctx.restore();
}

function inner(x, y, w) {
  return { x: x + HUB.PANEL_PAD, y: y + HUB.PANEL_PAD + 30, w: w - HUB.PANEL_PAD * 2 };
}

// ---- primitives ----------------------------------------------------------------

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function text(ctx, str, x, y, { size = HUB.TEXT_SIZE, color = COLORS.HUD_TEXT, bold = false, align = 'left' } = {}) {
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  ctx.fillText(str, x, y);
}

function card(ctx, x, y, w, h, { selected = false, dim = false, dashed = false } = {}) {
  ctx.fillStyle = selected ? COLORS.HUB_CARD_SELECTED : dim ? COLORS.HUB_CARD_DIM : COLORS.HUB_CARD;
  roundRect(ctx, x, y, w, h, HUB.CARD_RADIUS);
  ctx.fill();
  ctx.strokeStyle = selected ? COLORS.HUB_ACCENT : COLORS.HUB_CARD_EDGE;
  ctx.lineWidth = selected ? 2 : 1;
  if (dashed) ctx.setLineDash([4, 4]);
  roundRect(ctx, x, y, w, h, HUB.CARD_RADIUS);
  ctx.stroke();
  ctx.setLineDash([]);
}

function heading(ctx, str, x, y, w, right = '') {
  text(ctx, str, x, y, { size: HUB.HEADING_SIZE, color: COLORS.HUB_ACCENT, bold: true });
  if (right) text(ctx, fitText(ctx, right, w * 0.6, HUB.SMALL_SIZE), x + w, y, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM, align: 'right' });
  return y + HUB.HEADING_GAP * 0.55;
}

// Trims a string with an ellipsis so it fits in `maxWidth` at `size`.
function fitText(ctx, str, maxWidth, size, bold = false) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT}`;
  if (ctx.measureText(str).width <= maxWidth) return str;
  let s = str;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

function bar(ctx, x, y, w, h, frac, color, back) {
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = back;
  ctx.fill();
  if (frac > 0) {
    roundRect(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

function badge(ctx, str, x, y, color, textColor = COLORS.HUB_BACKGROUND) {
  ctx.font = `bold ${HUB.SMALL_SIZE}px ${FONT}`;
  const w = ctx.measureText(str).width + 12;
  roundRect(ctx, x, y - 9, w, 18, 9);
  ctx.fillStyle = color;
  ctx.fill();
  text(ctx, str, x + w / 2, y + 0.5, { size: HUB.SMALL_SIZE, color: textColor, bold: true, align: 'center' });
  return w;
}

function keycap(ctx, str, x, y) {
  ctx.font = `bold ${HUB.SMALL_SIZE}px ${FONT}`;
  const w = ctx.measureText(str).width + 12;
  roundRect(ctx, x, y - 10, w, 20, 4);
  ctx.fillStyle = COLORS.HUB_KEYCAP;
  ctx.fill();
  ctx.strokeStyle = COLORS.HUB_CARD_EDGE;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y - 10, w, 20, 4);
  ctx.stroke();
  text(ctx, str, x + w / 2, y + 0.5, { size: HUB.SMALL_SIZE, bold: true, align: 'center' });
  return w;
}

// A stat tile: icon, big number, small label.
function statTile(ctx, x, y, w, h, icon, iconColor, value, label) {
  card(ctx, x, y, w, h);
  drawIcon(ctx, icon, x + 20, y + h / 2, 22, iconColor, COLORS.HUB_BACKGROUND);
  text(ctx, String(value), x + 38, y + h / 2 - 8, { size: 18, bold: true });
  text(ctx, label, x + 38, y + h / 2 + 10, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM });
}

// ---- header / footer -----------------------------------------------------------

function drawHeader(ctx, hub, pad, VW) {
  const { run, meta } = hub;
  text(ctx, 'SURVIVAL ARENA', pad, pad + 14, { size: HUB.TITLE_SIZE, bold: true });
  const titleW = ctx.measureText('SURVIVAL ARENA').width;
  text(ctx, 'HUB', pad + titleW + 14, pad + 16, { size: HUB.TITLE_SIZE - 6, color: COLORS.HUB_ACCENT, bold: true });
  text(ctx, fitText(ctx, statusLine(meta), VW * 0.45, HUB.TEXT_SIZE), pad, pad + 48, { size: HUB.TEXT_SIZE, color: COLORS.HUD_DIM });

  // Run summary tiles on the right.
  const tiles = [
    ['xp', COLORS.XP, `LV ${run.playerLevel}`, 'player level'],
    ['coin', COLORS.POINTS, run.points, 'score to spend'],
    ['zombie', COLORS.ZOMBIE_WALKER, run.kills, 'kills this run'],
    ['skull', COLORS.HUD_DIM, `${meta.bestLevel}`, `best level · ${meta.runs} run${meta.runs === 1 ? '' : 's'}`],
  ];
  const tw = 150;
  let x = VW - pad - tw * tiles.length - GAP * (tiles.length - 1);
  for (const [icon, color, value, label] of tiles) {
    statTile(ctx, x, pad + 4, tw, 50, icon, color, value, label);
    x += tw + GAP;
  }
}

function statusLine(meta) {
  const r = meta.lastResult;
  if (!r) return 'New run. Pistol and knife. Clear every round of a map to move on; die and the run is over.';
  if (r.died) return `Last run ended on level ${r.level} with ${r.score} points and ${r.kills} kills. Best score ${meta.bestScore}.`;
  return `Level ${r.level} cleared: ${r.kills} kills, ${r.xpEarned} XP${r.levelsGained ? `, +${r.levelsGained} player level${r.levelsGained > 1 ? 's' : ''}` : ''}. Best score ${meta.bestScore}.`;
}

function drawFooter(ctx, hub, pad, VW, VH) {
  const y = VH - pad - 12;
  let x = pad;
  const hint = (key, label) => {
    x += keycap(ctx, key, x, y) + 6;
    text(ctx, label, x, y, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM });
    ctx.font = `${HUB.SMALL_SIZE}px ${FONT}`;
    x += ctx.measureText(label).width + 18;
  };
  hint('SPACE', 'deploy');
  hint('W A S D', 'move');
  hint('ENTER', 'select');
  hint('TAB', 'switch panel');
  hint('Q', 'active weapon');
  hint('N', 'new run');
  if (hub.message) text(ctx, hub.message, VW - pad, y, { size: HUB.TEXT_SIZE, color: COLORS.SUCCESS, align: 'right' });
}

function drawPanel(ctx, x, y, w, h, title, subtitle, focused) {
  ctx.fillStyle = COLORS.HUB_PANEL;
  roundRect(ctx, x, y, w, h, HUB.PANEL_RADIUS);
  ctx.fill();
  ctx.strokeStyle = focused ? COLORS.HUB_PANEL_FOCUS : COLORS.HUD_PANEL_EDGE;
  ctx.lineWidth = focused ? 2 : 1;
  roundRect(ctx, x, y, w, h, HUB.PANEL_RADIUS);
  ctx.stroke();
  text(ctx, title, x + HUB.PANEL_PAD, y + HUB.PANEL_PAD + 6, { size: 16, bold: true, color: focused ? COLORS.HUB_ACCENT : COLORS.HUD_TEXT });
  text(ctx, subtitle, x + w - HUB.PANEL_PAD, y + HUB.PANEL_PAD + 6, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM, align: 'right' });
}

// ---- next map ---------------------------------------------------------------------

function drawNextMap(ctx, b, r) {
  let y = r.y;
  // Map preview
  const previewH = 168;
  card(ctx, r.x, y, r.w, previewH);
  drawMapPreview(ctx, b.map, r.x + 8, y + 8, r.w - 16, previewH - 16);
  y += previewH + GAP;

  // Stat tiles
  const windows = b.map.rows.join('').split('W').length - 1;
  const tiles = [
    ['rounds', COLORS.ANNOUNCE, b.rounds.count, 'rounds'],
    ['map', COLORS.HUB_ACCENT, b.map.rooms, 'rooms'],
    ['door', COLORS.DOOR_CLOSED_EDGE, b.map.doors.length, 'doors'],
    ['window', COLORS.WINDOW_PLANK, windows, 'windows'],
  ];
  const tw = (r.w - GAP * 3) / 4;
  tiles.forEach(([icon, color, v, label], i) => statTile(ctx, r.x + i * (tw + GAP), y, tw, 54, icon, color, v, label));
  y += 54 + GAP;
  text(ctx, fitText(ctx, `${b.params.width} x ${b.params.height} tiles  ·  ${b.map.areas.length} areas  ·  ${b.map.lights.length} ceiling lights`, r.w, HUB.SMALL_SIZE), r.x, y + 6, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM });
  y += 20;

  // Enemies: per-round chart plus legend
  y = heading(ctx, 'ENEMIES', r.x, y + 8, r.w, 'per round');
  const enemyH = 132;
  card(ctx, r.x, y, r.w, enemyH);
  drawRoundChart(ctx, b.rounds, r.x + 10, y + 10, r.w * 0.55 - 10, enemyH - 20);
  const lx = r.x + r.w * 0.55 + 10;
  const rounds = b.rounds;
  const runners = rounds.rounds.reduce((a, q) => a + q.runners, 0);
  const first = rounds.rounds[0];
  const last = rounds.rounds[rounds.rounds.length - 1];
  drawIcon(ctx, 'zombie', lx + 12, y + 24, 22, COLORS.ZOMBIE_WALKER, COLORS.ZOMBIE_WALKER_HEAD);
  text(ctx, `${rounds.totalZombies - runners} walkers`, lx + 30, y + 24, { bold: true });
  drawIcon(ctx, 'runner', lx + 12, y + 50, 22, COLORS.ZOMBIE_RUNNER, COLORS.ZOMBIE_RUNNER_HEAD);
  text(ctx, `${runners} runners`, lx + 30, y + 50, { bold: true, color: runners ? COLORS.HUD_TEXT : COLORS.HUD_DIM });
  drawIcon(ctx, 'heart', lx + 12, y + 76, 20, COLORS.HEALTH_LOW);
  text(ctx, `${first.health}-${last.health} health`, lx + 30, y + 76);
  drawIcon(ctx, 'rounds', lx + 12, y + 102, 20, COLORS.HUD_DIM);
  text(ctx, `max ${rounds.maxAlive} at once`, lx + 30, y + 102, { color: COLORS.HUD_DIM });
  y += enemyH + GAP;

  // Resources
  y = heading(ctx, 'RESOURCES ON THE MAP', r.x, y + 8, r.w, 'on the floor');
  const entries = Object.entries(b.loot).filter(([, n]) => n > 0);
  const cols = 4;
  const rw = (r.w - GAP * (cols - 1)) / cols;
  entries.forEach(([type, n], i) => {
    const def = ITEM_TYPES[type];
    const cx = r.x + (i % cols) * (rw + GAP);
    const cy = y + Math.floor(i / cols) * (46 + GAP);
    card(ctx, cx, cy, rw, 46);
    drawIcon(ctx, type, cx + 18, cy + 23, 22, def.color, COLORS.HUB_BACKGROUND);
    text(ctx, `x${n}`, cx + 34, cy + 16, { bold: true });
    text(ctx, def.short, cx + 34, cy + 32, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM });
  });
  y += Math.ceil(entries.length / cols) * (46 + GAP);
  text(ctx, fitText(ctx, 'Zombies sometimes drop ammo. Ammo is refilled in the hub.', r.w, HUB.SMALL_SIZE), r.x, y + 6, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM });
}

function drawMapPreview(ctx, map, x, y, w, h) {
  const rows = map.rows;
  const W = rows[0].length;
  const H = rows.length;
  const s = Math.min(w / W, h / H);
  const ox = x + (w - W * s) / 2;
  const oy = y + (h - H * s) / 2;
  ctx.fillStyle = COLORS.MAP_PREVIEW_BACK;
  ctx.fillRect(ox, oy, W * s, H * s);
  const doorLetters = new Set(map.doors.map((d) => d.id));
  for (let ty = 0; ty < H; ty++) {
    for (let tx = 0; tx < W; tx++) {
      const c = rows[ty][tx];
      let color = null;
      if (c === '#') color = COLORS.WALL;
      else if (c === 'W') color = COLORS.WINDOW_PLANK;
      else if (c === 'N' || c === 'P') color = COLORS.ENTRANCE_EDGE;
      else if (doorLetters.has(c)) color = COLORS.DOOR_CLOSED_EDGE;
      else if (c >= '0' && c <= '9') color = COLORS.FLOOR_BY_AREA[(c.charCodeAt(0) - 48) % COLORS.FLOOR_BY_AREA.length];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(ox + tx * s, oy + ty * s, s + 0.4, s + 0.4);
    }
  }
  ctx.fillStyle = COLORS.LIGHT_ON;
  for (const l of map.lights) {
    ctx.beginPath();
    ctx.arc(ox + (l.x + 0.5) * s, oy + (l.y + 0.5) * s, Math.max(1.5, s * 0.45), 0, Math.PI * 2);
    ctx.fill();
  }
  // Legend
  const items = [[COLORS.ENTRANCE_EDGE, 'entrance'], [COLORS.DOOR_CLOSED_EDGE, 'door'], [COLORS.WINDOW_PLANK, 'window'], [COLORS.LIGHT_ON, 'light']];
  let lx = x + 4;
  const ly = y + h - 8;
  for (const [color, label] of items) {
    ctx.fillStyle = color;
    ctx.fillRect(lx, ly - 4, 8, 8);
    text(ctx, label, lx + 12, ly, { size: HUB.SMALL_SIZE - 1, color: COLORS.HUD_DIM });
    ctx.font = `${HUB.SMALL_SIZE - 1}px ${FONT}`;
    lx += 12 + ctx.measureText(label).width + 10;
  }
}

function drawRoundChart(ctx, plan, x, y, w, h) {
  const max = Math.max(...plan.rounds.map((r) => r.total));
  const n = plan.rounds.length;
  const gap = 6;
  const bw = (w - gap * (n - 1)) / n;
  const chartH = h - 16;
  plan.rounds.forEach((r, i) => {
    const bx = x + i * (bw + gap);
    const total = (r.total / max) * chartH;
    const runnerH = (r.runners / max) * chartH;
    ctx.fillStyle = COLORS.ZOMBIE_WALKER;
    ctx.fillRect(bx, y + chartH - total, bw, total - runnerH);
    if (runnerH > 0) {
      ctx.fillStyle = COLORS.ZOMBIE_RUNNER;
      ctx.fillRect(bx, y + chartH - runnerH, bw, runnerH);
    }
    text(ctx, String(r.total), bx + bw / 2, y + chartH - total - 8, { size: HUB.SMALL_SIZE, bold: true, align: 'center' });
    text(ctx, `R${r.round}`, bx + bw / 2, y + h - 6, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM, align: 'center' });
  });
}

// ---- gear & inventory -----------------------------------------------------------

function drawGear(ctx, hub, r) {
  const { run } = hub;
  let y = r.y;

  // Player card
  const maxHealth = PLAYER.MAX_HEALTH + ATTRIBUTES[0].perPoint * (run.attributes.vitality || 0);
  card(ctx, r.x, y, r.w, 84);
  badge(ctx, `LV ${run.playerLevel}`, r.x + 10, y + 18, COLORS.XP);
  text(ctx, `${run.xp} / ${xpToNext(run.playerLevel)} XP to next level`, r.x + 70, y + 18, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM });
  drawIcon(ctx, 'heart', r.x + 18, y + 44, 18, COLORS.HEALTH_LOW);
  bar(ctx, r.x + 32, y + 38, r.w - 96, 12, run.health / maxHealth, COLORS.HEALTH, COLORS.HEALTH_BACK);
  text(ctx, `${run.health}/${maxHealth}`, r.x + r.w - 10, y + 44, { size: HUB.SMALL_SIZE, align: 'right', bold: true });
  drawIcon(ctx, 'xp', r.x + 18, y + 66, 18, COLORS.XP);
  bar(ctx, r.x + 32, y + 60, r.w - 96, 12, run.xp / xpToNext(run.playerLevel), COLORS.XP, COLORS.XP_BACK);
  text(ctx, `${Math.round((100 * run.xp) / xpToNext(run.playerLevel))}%`, r.x + r.w - 10, y + 66, { size: HUB.SMALL_SIZE, align: 'right', bold: true });
  y += 84 + GAP;

  // Attributes
  y = heading(ctx, 'ATTRIBUTES', r.x, y + 8, r.w, run.attributePoints ? `${run.attributePoints} point${run.attributePoints === 1 ? '' : 's'} to spend` : 'level up for points');
  const aw = (r.w - GAP) / 2;
  ATTRIBUTES.forEach((a, i) => {
    const cx = r.x + (i % 2) * (aw + GAP);
    const cy = y + Math.floor(i / 2) * (62 + GAP);
    const v = run.attributes[a.id] || 0;
    const blocked = attributeBlocker(run, a.id);
    card(ctx, cx, cy, aw, 62, { selected: hub.isSelected(`attr:${a.id}`), dim: !!blocked && !v });
    drawIcon(ctx, a.icon, cx + 20, cy + 31, 24, blocked ? COLORS.HUD_DIM : COLORS.HUB_ACCENT);
    text(ctx, a.name, cx + 38, cy + 14, { bold: true });
    text(ctx, `${v} / ${MAX_ATTRIBUTE}`, cx + aw - 8, cy + 14, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM, align: 'right' });
    const bonus = a.percent ? `+${Math.round(a.perPoint * v * 100)}%` : `+${a.perPoint * v}`;
    text(ctx, fitText(ctx, `${bonus}${a.unit}`, aw - 46, HUB.SMALL_SIZE), cx + 38, cy + 30, { size: HUB.SMALL_SIZE, color: v ? COLORS.SUCCESS : COLORS.HUD_DIM });
    for (let p = 0; p < MAX_ATTRIBUTE; p++) {
      ctx.fillStyle = p < v ? COLORS.PIP_ON : COLORS.PIP_OFF;
      ctx.fillRect(cx + 38 + p * 12, cy + 44, 9, 9);
    }
  });
  y += 2 * 62 + GAP + GAP;

  // Loadout slots
  y = heading(ctx, 'LOADOUT', r.x, y + 8, r.w, 'ENTER: activate / equip');
  const sw = (r.w - GAP) / 2;
  for (let slot = 0; slot < PLAYER.MAX_WEAPONS; slot++) {
    const cx = r.x + slot * (sw + GAP);
    const entry = run.weapons[slot];
    const active = entry && slot === run.weaponIndex;
    card(ctx, cx, y, sw, 62, { selected: hub.isSelected(`slot:${slot}`), dashed: !entry, dim: !entry });
    if (active) {
      ctx.fillStyle = COLORS.HUB_ACCENT;
      roundRect(ctx, cx, y, 4, 62, 2);
      ctx.fill();
    }
    badge(ctx, `${slot + 1}`, cx + 10, y + 14, active ? COLORS.HUB_ACCENT : COLORS.HUB_KEYCAP, active ? COLORS.HUB_BACKGROUND : COLORS.HUD_TEXT);
    if (!entry) {
      text(ctx, 'Empty slot', cx + 40, y + 31, { color: COLORS.HUD_DIM });
      continue;
    }
    const def = WEAPONS[entry.id];
    drawIcon(ctx, def.icon, cx + sw - 26, y + 31, 40, def.color, COLORS.HUB_BACKGROUND);
    text(ctx, fitText(ctx, def.name, sw - 96, HUB.TEXT_SIZE, true), cx + 40, y + 14, { bold: true, color: def.color });
    drawFireModeIcon(ctx, def.fireMode, cx + 50, y + 34, COLORS.HUD_DIM);
    text(ctx, `${def.magazine} + ${def.reserve}`, cx + 66, y + 34, { size: HUB.SMALL_SIZE, color: COLORS.HUD_DIM });
    text(ctx, active ? 'ACTIVE' : 'ENTER to activate', cx + 40, y + 51, { size: HUB.SMALL_SIZE - 1, color: active ? COLORS.HUB_ACCENT : COLORS.HUD_DIM, bold: active });
  }
  y += 62 + GAP;

  // Unlocked guns
  const gw = (r.w - GAP * 2) / 3;
  run.unlocked.forEach((id, i) => {
    const def = WEAPONS[id];
    const cx = r.x + (i % 3) * (gw + GAP);
    const cy = y + Math.floor(i / 3) * (44 + GAP);
    const slot = run.weapons.findIndex((w) => w.id === id);
    card(ctx, cx, cy, gw, 44, { selected: hub.isSelected(`gun:${id}`), dim: slot < 0 });
    drawIcon(ctx, def.icon, cx + 20, cy + 22, 30, slot >= 0 ? def.color : COLORS.HUD_DIM, COLORS.HUB_BACKGROUND);
    text(ctx, def.name.split(' ')[0], cx + 40, cy + 15, { size: HUB.SMALL_SIZE + 1, bold: true, color: slot >= 0 ? COLORS.HUD_TEXT : COLORS.HUD_DIM });
    if (slot >= 0) {
      drawIcon(ctx, 'check', cx + 44, cy + 32, 12, COLORS.SUCCESS);
      text(ctx, `slot ${slot + 1}`, cx + 54, cy + 32, { size: HUB.SMALL_SIZE - 1, color: COLORS.SUCCESS });
    } else {
      text(ctx, 'ENTER equips', cx + 40, cy + 32, { size: HUB.SMALL_SIZE - 1, color: COLORS.HUD_DIM });
    }
  });
  y += Math.ceil(run.unlocked.length / 3) * (44 + GAP);

  // Consumables and resources
  y = heading(ctx, 'ITEMS', r.x, y + 8, r.w, `${MELEE.NAME} on right click`);
  const items = [
    ['bandage', COLORS.HEALTH_LOW, run.bandages, 'bandage'],
    ['grenade', COLORS.ZOMBIE_WALKER, run.grenades, 'grenade'],
    ['decoy', COLORS.DECOY, run.decoys, 'decoy'],
    ...INVENTORY_TYPES.map((t) => [t, ITEM_TYPES[t].color, run.inventory[t], ITEM_TYPES[t].short.toLowerCase()]),
  ];
  const iw = (r.w - GAP * (items.length - 1)) / items.length;
  items.forEach(([icon, color, count, label], i) => {
    const cx = r.x + i * (iw + GAP);
    card(ctx, cx, y, iw, 50, { dim: !count });
    drawIcon(ctx, icon, cx + iw / 2, y + 18, 22, count ? color : COLORS.HUD_DIM, COLORS.HUB_BACKGROUND);
    text(ctx, `${count} ${label}`, cx + iw / 2, y + 39, { size: HUB.SMALL_SIZE - 1, color: count ? COLORS.HUD_TEXT : COLORS.HUD_DIM, align: 'center' });
  });
}

// ---- armory -------------------------------------------------------------------------

function drawArmory(ctx, hub, r) {
  const { run } = hub;
  let y = r.y;
  const groups = hub.groups('armory');
  const guns = groups[0].items;
  const crafts = groups[1].items;
  const cw = (r.w - GAP * 2) / 3;
  const ch = 88;

  y = heading(ctx, 'UNLOCK GUNS', r.x, y + 8, r.w, 'score + parts · level');
  if (!guns.length) {
    text(ctx, 'Every gun is unlocked.', r.x, y + 12, { color: COLORS.HUD_DIM });
    y += 30;
  }
  guns.forEach((item, i) => {
    const def = item.weapon;
    const u = UNLOCKS[def.id];
    const blocker = unlockBlocker(run, def.id);
    const cx = r.x + (i % 3) * (cw + GAP);
    const cy = y + Math.floor(i / 3) * (ch + GAP);
    card(ctx, cx, cy, cw, ch, { selected: hub.isSelected(item.key), dim: !!blocker });
    drawIcon(ctx, def.icon, cx + cw / 2, cy + 22, 40, blocker ? COLORS.LOCKED : def.color, COLORS.HUB_BACKGROUND);
    if (blocker) drawIcon(ctx, 'lock', cx + cw - 12, cy + 12, 14, COLORS.HUD_DIM);
    text(ctx, def.name, cx + cw / 2, cy + 46, { size: HUB.SMALL_SIZE + 1, bold: true, align: 'center', color: blocker ? COLORS.LOCKED : COLORS.HUD_TEXT });
    // cost row: coin + parts + level
    drawIcon(ctx, 'coin', cx + 12, cy + 64, 13, COLORS.POINTS, COLORS.HUB_BACKGROUND);
    text(ctx, `${u.cost}`, cx + 21, cy + 64, { size: HUB.SMALL_SIZE, color: run.points >= u.cost ? COLORS.HUD_TEXT : COLORS.FLOATER_BAD });
    drawIcon(ctx, 'parts', cx + cw / 2 + 2, cy + 64, 13, ITEM_TYPES.parts.color);
    text(ctx, `${u.parts}`, cx + cw / 2 + 11, cy + 64, { size: HUB.SMALL_SIZE, color: (run.inventory.parts || 0) >= u.parts ? COLORS.HUD_TEXT : COLORS.FLOATER_BAD });
    text(ctx, `LV${u.level}`, cx + cw - 6, cy + 64, { size: HUB.SMALL_SIZE, bold: true, align: 'right', color: run.playerLevel >= u.level ? COLORS.HUD_TEXT : COLORS.FLOATER_BAD });
    text(ctx, fitText(ctx, `${def.fireMode} · ${def.damage}${def.pellets ? `x${def.pellets}` : ''} dmg · ${def.fireRate}/s`, cw - 8, HUB.SMALL_SIZE - 1), cx + cw / 2, cy + 79, { size: HUB.SMALL_SIZE - 1, color: COLORS.HUD_DIM, align: 'center' });
  });
  y += Math.ceil(guns.length / 3) * (ch + GAP);

  y = heading(ctx, 'CRAFT', r.x, y + 8, r.w, 'from resources');
  crafts.forEach((item, i) => {
    const rec = item.recipe;
    const blocker = craftBlocker(run, rec);
    const cx = r.x + (i % 3) * (cw + GAP);
    const cy = y + Math.floor(i / 3) * (ch + GAP);
    const color = rec.icon === 'bandage' ? COLORS.HEALTH_LOW : rec.icon === 'grenade' ? COLORS.ZOMBIE_WALKER : COLORS.DECOY;
    card(ctx, cx, cy, cw, ch, { selected: hub.isSelected(item.key), dim: !!blocker });
    drawIcon(ctx, rec.icon, cx + cw / 2, cy + 22, 32, blocker ? COLORS.LOCKED : color, COLORS.HUB_BACKGROUND);
    text(ctx, rec.name, cx + cw / 2, cy + 46, { size: HUB.SMALL_SIZE + 1, bold: true, align: 'center', color: blocker ? COLORS.LOCKED : COLORS.HUD_TEXT });
    const entries = Object.entries(rec.cost);
    const cwid = 38;
    let ix = cx + cw / 2 - (entries.length * cwid) / 2 + 8;
    for (const [type, n] of entries) {
      drawIcon(ctx, type, ix, cy + 64, 13, ITEM_TYPES[type].color, COLORS.HUB_BACKGROUND);
      text(ctx, `${n}`, ix + 9, cy + 64, { size: HUB.SMALL_SIZE, color: (run.inventory[type] || 0) >= n ? COLORS.HUD_TEXT : COLORS.FLOATER_BAD });
      ix += cwid;
    }
    text(ctx, fitText(ctx, blocker && blocker !== 'missing resources' ? blocker : rec.desc.split(' (')[0], cw - 8, HUB.SMALL_SIZE - 1), cx + cw / 2, cy + 79, { size: HUB.SMALL_SIZE - 1, color: blocker ? COLORS.FLOATER_BAD : COLORS.HUD_DIM, align: 'center' });
  });
  y += Math.ceil(crafts.length / 3) * (ch + GAP);

  // Tips
  text(ctx, fitText(ctx, 'Locked guns need the player level shown, score and weapon parts found on maps.', r.w, HUB.SMALL_SIZE - 1), r.x, y + 10, { size: HUB.SMALL_SIZE - 1, color: COLORS.HUD_DIM });
}
