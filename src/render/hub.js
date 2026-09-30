// The hub screen in three sections: next map, gear & inventory, armory.

import { COLORS, HUD, HUB, PLAYER, MELEE } from '../config.js';
import { WEAPONS } from '../data/weapons.js';
import { ITEM_TYPES, INVENTORY_TYPES } from '../data/items.js';
import { UNLOCKS } from '../data/armory.js';
import { ATTRIBUTES, MAX_ATTRIBUTE } from '../data/attributes.js';
import { xpToNext } from '../run.js';
import { craftBlocker, unlockBlocker, attributeBlocker, isEquipped } from '../systems/crafting.js';

export function drawHub(ctx, hub, width, height) {
  const { run, meta, briefing } = hub;
  ctx.save();
  ctx.fillStyle = COLORS.HUB_BACKGROUND;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'middle';

  const pad = HUB.PADDING;
  const headerH = HUB.TITLE_SIZE + 40;
  const footerH = 44;
  const colW = (width - pad * 2 - HUB.COLUMN_GAP * 2) / 3;
  const top = pad + headerH;
  const panelH = height - top - pad - footerH;
  const cols = [pad, pad + colW + HUB.COLUMN_GAP, pad + (colW + HUB.COLUMN_GAP) * 2];

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.HUD_TEXT;
  ctx.font = `bold ${HUB.TITLE_SIZE}px ${HUD.FONT}`;
  ctx.fillText('Survival Arena  ·  Hub', pad, pad + HUB.TITLE_SIZE / 2);
  ctx.font = `${HUB.TEXT_SIZE}px ${HUD.FONT}`;
  ctx.fillStyle = COLORS.HUD_DIM;
  ctx.fillText(lastResultLine(meta), pad, pad + HUB.TITLE_SIZE + 14);

  panel(ctx, cols[0], top, colW, panelH, `NEXT MAP  ·  LEVEL ${run.level}`, false);
  drawBriefing(ctx, briefing, cols[0] + HUB.PANEL_PAD, top + HUB.PANEL_PAD + HUB.LINE * 1.6, colW - HUB.PANEL_PAD * 2);

  panel(ctx, cols[1], top, colW, panelH, 'GEAR & INVENTORY', hub.focus === 'gear');
  drawGear(ctx, hub, cols[1] + HUB.PANEL_PAD, top + HUB.PANEL_PAD + HUB.LINE * 1.6, colW - HUB.PANEL_PAD * 2);

  panel(ctx, cols[2], top, colW, panelH, 'ARMORY  ·  UNLOCK & CRAFT', hub.focus === 'armory');
  drawArmory(ctx, hub, cols[2] + HUB.PANEL_PAD, top + HUB.PANEL_PAD + HUB.LINE * 1.6, colW - HUB.PANEL_PAD * 2);

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.SUCCESS;
  ctx.font = `${HUB.TEXT_SIZE}px ${HUD.FONT}`;
  if (hub.message) ctx.fillText(hub.message, pad, height - pad - 22);
  ctx.textAlign = 'center';
  ctx.fillStyle = COLORS.HUB_ACCENT;
  ctx.font = `bold ${HUB.HEADING_SIZE - 1}px ${HUD.FONT}`;
  ctx.fillText('SPACE deploy   ·   TAB / A / D switch section   ·   W / S move   ·   ENTER select   ·   Q active weapon   ·   N new run', width / 2, height - pad);
  ctx.restore();
}

function lastResultLine(meta) {
  const r = meta.lastResult;
  if (!r) return 'New run. You start with a pistol and a knife. Clear every round of a map to move on; die and the run is over.';
  if (r.died) return `Last run ended on level ${r.level} with ${r.score} points and ${r.kills} kills. Best: level ${meta.bestLevel}, ${meta.bestScore} points.`;
  return `Level ${r.level} cleared with ${r.kills} kills and ${r.xpEarned} XP${r.levelsGained ? ` (+${r.levelsGained} player level${r.levelsGained > 1 ? 's' : ''})` : ''}. Best: level ${meta.bestLevel}, ${meta.bestScore} points.`;
}

function panel(ctx, x, y, w, h, title, focused) {
  ctx.fillStyle = COLORS.HUB_PANEL;
  roundRect(ctx, x, y, w, h, HUB.PANEL_RADIUS);
  ctx.fill();
  ctx.strokeStyle = focused ? COLORS.HUB_PANEL_FOCUS : COLORS.HUD_PANEL_EDGE;
  ctx.lineWidth = focused ? 2 : 1;
  roundRect(ctx, x, y, w, h, HUB.PANEL_RADIUS);
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.fillStyle = focused ? COLORS.HUB_ACCENT : COLORS.HUD_TEXT;
  ctx.font = `bold ${HUB.HEADING_SIZE}px ${HUD.FONT}`;
  ctx.fillText(title, x + HUB.PANEL_PAD, y + HUB.PANEL_PAD + 2);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function sub(ctx, text, x, y) {
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.HUB_ACCENT;
  ctx.font = `bold ${HUB.TEXT_SIZE - 1}px ${HUD.FONT}`;
  ctx.fillText(text, x, y);
  return y + HUB.LINE;
}

function line(ctx, text, x, y, color = COLORS.HUD_TEXT, bold = false, size = HUB.TEXT_SIZE) {
  ctx.textAlign = 'left';
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${HUD.FONT}`;
  ctx.fillText(text, x, y);
  return y + HUB.LINE;
}

function bar(ctx, x, y, w, h, frac, color, back) {
  ctx.fillStyle = back;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

// Highlight for the row the cursor is on.
function cursorRow(ctx, x, y, w, h, active) {
  if (!active) return;
  ctx.fillStyle = COLORS.HUD_PANEL;
  ctx.fillRect(x - 8, y - h / 2, w + 16, h);
  ctx.strokeStyle = COLORS.HUB_ACCENT;
  ctx.lineWidth = 1;
  ctx.strokeRect(x - 8, y - h / 2, w + 16, h);
}

// ---- next map -----------------------------------------------------------

function drawBriefing(ctx, b, x, y, w) {
  y = sub(ctx, 'OBJECTIVE', x, y);
  y = line(ctx, `Survive ${b.rounds.count} rounds: kill every zombie of each round.`, x, y);
  y = line(ctx, 'Then you return to the hub automatically.', x, y, COLORS.HUD_DIM);

  y = sub(ctx, 'THE MAP', x, y + HUB.LINE * 0.5);
  y = line(ctx, `${b.params.width} x ${b.params.height} tiles, ${b.map.rooms} rooms in ${b.map.areas.length} areas`, x, y);
  y = line(ctx, `${b.map.doors.length} doors, ${b.map.rows.join('').split('W').length - 1} windows, ${b.map.lights.length} ceiling lights`, x, y);

  y = sub(ctx, 'ENEMIES', x, y + HUB.LINE * 0.5);
  const r = b.rounds;
  const first = r.rounds[0];
  const last = r.rounds[r.rounds.length - 1];
  y = line(ctx, `${r.totalZombies} zombies over ${r.count} rounds (${first.total} in round 1, ${last.total} in round ${r.count})`, x, y);
  const runners = r.rounds.reduce((a, q) => a + q.runners, 0);
  y = line(ctx, `${r.totalZombies - runners} walkers, ${runners} runners`, x, y);
  y = line(ctx, `${first.health}-${last.health} health each  ·  up to ${r.maxAlive} inside at once`, x, y, COLORS.HUD_DIM);

  y = sub(ctx, 'RESOURCES ON THE MAP', x, y + HUB.LINE * 0.5);
  for (const [type, n] of Object.entries(b.loot)) {
    if (!n) continue;
    const def = ITEM_TYPES[type];
    ctx.fillStyle = def.color;
    ctx.fillRect(x, y - 6, 12, 12);
    y = line(ctx, `${n}  ${def.name}${n === 1 ? '' : 's'}`, x + 20, y);
  }
  y = line(ctx, 'Zombies sometimes drop ammo. Ammo refills in the hub.', x, y + 4, COLORS.HUD_DIM);
}

// ---- gear & inventory -----------------------------------------------------

function drawGear(ctx, hub, x, y, w) {
  const { run } = hub;
  const rows = hub.gearRows();
  const focused = hub.focus === 'gear';
  const cursor = Math.min(hub.cursor.gear, rows.length - 1);

  y = sub(ctx, `PLAYER  ·  LEVEL ${run.playerLevel}`, x, y);
  bar(ctx, x, y - 7, w, 14, run.health / (PLAYER.MAX_HEALTH + 10 * run.attributes.vitality), COLORS.HEALTH, COLORS.HEALTH_BACK);
  y = line(ctx, `Health ${run.health} / ${PLAYER.MAX_HEALTH + 10 * run.attributes.vitality}`, x + 6, y, COLORS.HUD_TEXT, true, HUB.TEXT_SIZE - 2);
  bar(ctx, x, y - 7, w, 14, run.xp / xpToNext(run.playerLevel), COLORS.XP, COLORS.XP_BACK);
  y = line(ctx, `XP ${run.xp} / ${xpToNext(run.playerLevel)}`, x + 6, y, COLORS.HUD_TEXT, true, HUB.TEXT_SIZE - 2);
  y = line(ctx, `Score ${run.points} spendable (${run.score} total)  ·  kills ${run.kills}`, x, y, COLORS.HUD_DIM);

  y = sub(ctx, `ATTRIBUTES  ·  ${run.attributePoints} point${run.attributePoints === 1 ? '' : 's'} to spend`, x, y + HUB.LINE * 0.4);
  rows.forEach((row, i) => {
    if (row.kind !== 'attribute') return;
    const a = row.attribute;
    const v = run.attributes[a.id] || 0;
    cursorRow(ctx, x, y, w, HUB.LINE, focused && i === cursor);
    const blocker = attributeBlocker(run, a.id);
    const bonus = a.percent ? `+${Math.round(a.perPoint * v * 100)}%` : `+${a.perPoint * v}`;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.HUD_TEXT;
    ctx.font = `${focused && i === cursor ? 'bold ' : ''}${HUB.TEXT_SIZE}px ${HUD.FONT}`;
    ctx.fillText(`${a.name}  ${'●'.repeat(v)}${'○'.repeat(MAX_ATTRIBUTE - v)}`, x, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = blocker ? COLORS.HUD_DIM : COLORS.SUCCESS;
    ctx.fillText(`${bonus}${a.unit}`, x + w, y);
    y += HUB.LINE;
  });

  y = sub(ctx, 'LOADOUT  ·  Enter equips or unequips', x, y + HUB.LINE * 0.4);
  rows.forEach((row, i) => {
    if (row.kind !== 'equip') return;
    const def = row.weapon;
    const slot = run.weapons.findIndex((wp) => wp.id === def.id);
    const active = slot === run.weaponIndex && slot >= 0;
    cursorRow(ctx, x, y, w, HUB.LINE, focused && i === cursor);
    ctx.textAlign = 'left';
    ctx.fillStyle = slot >= 0 ? def.color : COLORS.HUD_DIM;
    ctx.font = `${slot >= 0 ? 'bold ' : ''}${HUB.TEXT_SIZE}px ${HUD.FONT}`;
    ctx.fillText(`${slot >= 0 ? `[${slot + 1}]${active ? ' ▶' : '  '}` : '     '} ${def.name}`, x, y);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.HUD_DIM;
    ctx.fillText(`${def.fireMode}  ·  ${def.damage}${def.pellets ? `x${def.pellets}` : ''} dmg  ·  ${def.magazine}+${def.reserve}`, x + w, y);
    y += HUB.LINE;
  });
  y = line(ctx, `${MELEE.NAME} (right click)  ·  ${run.bandages} bandage${run.bandages === 1 ? '' : 's'}  ·  ${run.grenades} grenade${run.grenades === 1 ? '' : 's'}  ·  ${run.decoys} decoy${run.decoys === 1 ? '' : 's'}`, x, y + 2, COLORS.HUD_DIM);

  y = sub(ctx, 'RESOURCES', x, y + HUB.LINE * 0.4);
  let cx = x;
  for (const type of INVENTORY_TYPES) {
    const def = ITEM_TYPES[type];
    ctx.fillStyle = def.color;
    ctx.fillRect(cx, y - 6, 12, 12);
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.HUD_TEXT;
    ctx.font = `${HUB.TEXT_SIZE}px ${HUD.FONT}`;
    const t = `${run.inventory[type]} ${def.name.toLowerCase()}`;
    ctx.fillText(t, cx + 18, y);
    cx += 18 + ctx.measureText(t).width + 22;
  }
}

// ---- armory ----------------------------------------------------------------

function drawArmory(ctx, hub, x, y, w) {
  const { run } = hub;
  const rows = hub.armoryRows();
  const focused = hub.focus === 'armory';
  const cursor = Math.min(hub.cursor.armory, rows.length - 1);
  const rowH = HUB.LINE * 1.9;
  let section = '';
  rows.forEach((row, i) => {
    const kind = row.kind === 'unlock' ? 'GUNS  ·  score + weapon parts, gated by player level' : 'CRAFT  ·  from resources';
    if (kind !== section) {
      section = kind;
      y = sub(ctx, kind, x, y + (i ? HUB.LINE * 0.4 : 0));
    }
    cursorRow(ctx, x, y + HUB.LINE * 0.3, w, rowH - 4, focused && i === cursor);
    const selected = focused && i === cursor;
    if (row.kind === 'unlock') {
      const def = row.weapon;
      const u = UNLOCKS[def.id];
      const blocker = unlockBlocker(run, def.id);
      ctx.textAlign = 'left';
      ctx.fillStyle = blocker ? COLORS.LOCKED : def.color;
      ctx.font = `${selected ? 'bold ' : ''}${HUB.TEXT_SIZE}px ${HUD.FONT}`;
      ctx.fillText(`${def.name}`, x, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = blocker ? COLORS.LOCKED : COLORS.HUD_TEXT;
      ctx.fillText(`${u.cost} score + ${u.parts} parts  ·  lvl ${u.level}`, x + w, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = blocker ? COLORS.FLOATER_BAD : COLORS.HUD_DIM;
      ctx.font = `${HUB.TEXT_SIZE - 3}px ${HUD.FONT}`;
      ctx.fillText(blocker || `${def.fireMode}, ${def.damage}${def.pellets ? `x${def.pellets}` : ''} damage, ${def.fireRate}/s, ${def.magazine} rounds`, x, y + HUB.LINE * 0.8);
    } else {
      const r = row.recipe;
      const blocker = craftBlocker(run, r);
      ctx.textAlign = 'left';
      ctx.fillStyle = blocker ? COLORS.LOCKED : COLORS.HUD_TEXT;
      ctx.font = `${selected ? 'bold ' : ''}${HUB.TEXT_SIZE}px ${HUD.FONT}`;
      ctx.fillText(r.name, x, y);
      ctx.textAlign = 'right';
      ctx.fillStyle = blocker ? COLORS.LOCKED : COLORS.HUD_DIM;
      ctx.fillText(Object.entries(r.cost).map(([t, n]) => `${n} ${ITEM_TYPES[t].name.split(' ')[0].toLowerCase()}`).join(', '), x + w, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = blocker ? COLORS.FLOATER_BAD : COLORS.HUD_DIM;
      ctx.font = `${HUB.TEXT_SIZE - 3}px ${HUD.FONT}`;
      ctx.fillText(blocker || r.desc, x, y + HUB.LINE * 0.8);
    }
    y += rowH;
  });
  if (!rows.some((r) => r.kind === 'unlock')) line(ctx, 'Every gun is unlocked.', x, y, COLORS.HUD_DIM);
}
