#!/usr/bin/env node
// Headless balance simulation: a simple bot plays one level with a given
// loadout and reports how it went. Used to tune src/config.js.
//
//   node tools/balance-sim.js                # default scenarios
//   node tools/balance-sim.js 5 smg,ar 3     # level 5, SMG + AR, 3 runs

import { Game } from '../src/game.js';
import { buildLevel } from '../src/level.js';
import { newRunState } from '../src/run.js';
import { WEAPONS } from '../src/data/weapons.js';
import { PLAYER } from '../src/config.js';

const STEP = 1 / 60;
const MAX_SECONDS = 150;

function makeFrame() {
  return {
    moveX: 0, moveY: 0, aimScreen: { x: 0, y: 0 }, fireHeld: false, firePressed: false, meleePressed: false,
    reloadPressed: false, grenadePressed: false, decoyPressed: false, interactPressed: false, healPressed: false,
    flashlightPressed: false, navUpPressed: false, navDownPressed: false, craftPressed: false, deployPressed: false,
    newRunPressed: false, weaponSlot: -1, weaponScroll: 0,
  };
}

const DIRECTIONS = Array.from({ length: 16 }, (_, i) => {
  const a = (i / 16) * Math.PI * 2;
  return { x: Math.cos(a), y: Math.sin(a) };
});

function clearance(world, x, y, dir, radius) {
  for (const step of [1, 2, 3]) {
    const d = radius + step * 20;
    if (world.isSolidAtPoint(x + dir.x * d, y + dir.y * d)) return step - 1;
  }
  return 3;
}

// Bot: kites away from the crowd, shoots the nearest zombie, bandages when low.
function botFrame(game, state, tick) {
  const f = makeFrame();
  const p = game.player;
  let nearest = null;
  let nd = Infinity;
  for (const z of game.zombies) {
    if (z.isClimbing) continue;
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (d < nd) { nd = d; nearest = z; }
  }
  if (nd < 300) {
    let best = null;
    let bestScore = -Infinity;
    for (const dir of DIRECTIONS) {
      const c = clearance(game.world, p.x, p.y, dir, p.radius);
      if (c === 0) continue;
      const nx = p.x + dir.x * 120;
      const ny = p.y + dir.y * 120;
      let score = c * 60;
      for (const z of game.zombies) {
        const d = Math.hypot(z.x - nx, z.y - ny);
        score += Math.min(d, 400) * (z.type === 'runner' ? 1.3 : 1);
        if (d < 60) score -= 800;
      }
      let open = 0;
      for (const d2 of DIRECTIONS) if (clearance(game.world, nx, ny, d2, p.radius) === 3) open++;
      score += open * 25;
      if (state.lastDir) score += (dir.x * state.lastDir.x + dir.y * state.lastDir.y) * 80;
      if (score > bestScore) { bestScore = score; best = dir; }
    }
    if (best) {
      f.moveX = best.x;
      f.moveY = best.y;
      state.lastDir = best;
    }
  }
  if (nearest) {
    game.setAim({ x: nearest.x, y: nearest.y });
    const w = p.weapon;
    if (w.def.fireMode === 'auto') f.fireHeld = true;
    else f.firePressed = tick % 2 === 0;
    if (w.mag === 0 || (nd > 220 && w.mag < w.def.magazine / 3)) f.reloadPressed = true;
    if (nd < 40 && p.canMelee()) f.meleePressed = true;
  } else if (p.weapon.mag < p.weapon.def.magazine) {
    f.reloadPressed = true;
  }
  if (p.health < PLAYER.MAX_HEALTH * 0.5 && p.bandages > 0) f.healPressed = true;
  // Switch to the other gun when this one is completely dry.
  if (p.weapon.mag === 0 && p.weapon.reserve === 0) {
    const other = p.weapons.findIndex((w) => w.mag + w.reserve > 0);
    if (other >= 0) f.weaponSlot = other;
  }
  return f;
}

function runLevel(level, loadout, seed) {
  const run = newRunState(seed);
  run.level = level;
  run.weapons = loadout.map((id) => ({ id, mag: WEAPONS[id].magazine, reserve: WEAPONS[id].reserve }));
  const dps = (id) => WEAPONS[id].damage * WEAPONS[id].fireRate * (WEAPONS[id].pellets || 1) * (WEAPONS[id].burstCount || 1);
  run.weaponIndex = loadout.indexOf(loadout.reduce((a, b) => (dps(b) > dps(a) ? b : a)));
  run.bandages = 2;
  const levelData = buildLevel(level, seed);
  const game = new Game(levelData, run);
  const state = { lastDir: null };
  let t = 0;
  let tick = 0;
  let damageTaken = 0;
  let lastHealth = game.player.health;
  while (game.state === 'playing' && t < MAX_SECONDS && game.spawner.remaining > 0) {
    game.update(STEP, botFrame(game, state, tick));
    if (game.player.health < lastHealth) damageTaken += lastHealth - game.player.health;
    lastHealth = game.player.health;
    t += STEP;
    tick++;
  }
  return {
    died: game.state === 'dead',
    cleared: game.spawner.remaining === 0,
    seconds: Math.round(t),
    kills: game.player.kills,
    enemies: levelData.enemies.total,
    zombieHp: levelData.enemies.health,
    damageTaken: Math.round(damageTaken),
    ammoLeft: game.player.weapons.map((w) => `${w.def.id}:${w.mag}/${w.reserve}`).join(' '),
  };
}

function scenario(level, loadout, runs) {
  const rs = [];
  for (let i = 0; i < runs; i++) rs.push(runLevel(level, loadout, i + 1));
  const avg = (k) => Math.round(rs.reduce((a, r) => a + r[k], 0) / rs.length);
  console.log(
    `level ${String(level).padStart(2)}  ${loadout.join('+').padEnd(12)} enemies ${avg('enemies')} x ${avg('zombieHp')}hp  ` +
    `deaths ${rs.filter((r) => r.died).length}/${runs}  killed all ${rs.filter((r) => r.cleared).length}/${runs}  ` +
    `avg ${avg('seconds')}s  dmg taken ${avg('damageTaken')}  kills ${avg('kills')}  ammo ${rs[0].ammoLeft}`,
  );
}

const [, , levelArg, loadoutArg, runsArg] = process.argv;
if (levelArg) {
  scenario(Number(levelArg), (loadoutArg || 'pistol').split(','), Number(runsArg || 3));
} else {
  const runs = 3;
  scenario(1, ['pistol'], runs);
  scenario(2, ['pistol'], runs);
  scenario(3, ['pistol'], runs);
  scenario(3, ['pistol', 'shotgun'], runs);
  scenario(5, ['pistol', 'smg'], runs);
  scenario(7, ['ar', 'shotgun'], runs);
  scenario(10, ['ar', 'lmg'], runs);
}
