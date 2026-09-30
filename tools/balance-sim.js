#!/usr/bin/env node
// Headless balance simulation: a simple bot plays one round with a given
// loadout and reports how it went. Used to tune src/config.js.
//
//   node tools/balance-sim.js                # default scenarios
//   node tools/balance-sim.js 7 smg,ar 5     # round 7, SMG + AR, 5 runs
//   MAP=caves node tools/balance-sim.js       # same on another map

import { Game } from '../src/game.js';
import { WEAPONS } from '../src/data/weapons.js';
import { PLAYER } from '../src/config.js';

const STEP = 1 / 60;
const MAX_SECONDS = 240;

function makeFrame() {
  return {
    moveX: 0, moveY: 0, aimScreen: { x: 0, y: 0 }, fireHeld: false, firePressed: false, meleePressed: false,
    reloadPressed: false, grenadePressed: false, decoyPressed: false, interactPressed: false, restartPressed: false,
    weaponSlot: -1, weaponScroll: 0,
  };
}

// Bot: samples 16 directions each step and moves along the one that keeps
// it furthest from the crowd without running into a wall, while shooting
// the nearest zombie. Crude, but it kites the way a player would.
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
      let score = 0;
      for (const z of game.zombies) {
        const d = Math.hypot(z.x - nx, z.y - ny);
        score += Math.min(d, 400) * (z.type === 'runner' ? 1.3 : 1);
        if (d < 60) score -= 800;
      }
      score += c * 60;
      // Avoid boxed-in spots: count open directions around the candidate.
      let open = 0;
      for (const d2 of DIRECTIONS) if (clearance(game.world, nx, ny, d2, p.radius) === 3) open++;
      score += open * 25;
      // Prefer continuing the previous heading to avoid jitter.
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
  return f;
}

function runRound(round, loadout, { verbose = false, doors = [] } = {}) {
  const game = new Game(process.env.MAP || undefined);
  for (const d of game.world.doors) if (doors.includes(d.id)) game.world.openDoor(d);
  game.player.weapons = [];
  for (const id of loadout) game.player.giveWeapon(WEAPONS[id]);
  const dps = (w) => w.def.damage * w.def.fireRate * (w.def.pellets || 1) * (w.def.burstCount || 1);
  game.player.weaponIndex = game.player.weapons.indexOf(game.player.weapons.reduce((a, b) => (dps(b) > dps(a) ? b : a)));
  const state = { lastDir: null };
  game.player.grenades = 0;
  game.player.decoys = 0;
  game.rounds.round = round - 1;
  game.rounds.timer = 0;
  let t = 0;
  let tick = 0;
  let minHealth = PLAYER.MAX_HEALTH;
  let damageTaken = 0;
  let lastHealth = game.player.health;
  while (game.state === 'playing' && game.rounds.round <= round && t < MAX_SECONDS) {
    if (game.rounds.round === round && game.rounds.state === 'intermission') break;
    game.update(STEP, botFrame(game, state, tick));
    if (game.player.health < lastHealth) {
      damageTaken += lastHealth - game.player.health;
      if (process.env.TRACE) {
        const p = game.player;
        const near = game.zombies.filter((z) => Math.hypot(z.x - p.x, z.y - p.y) < 60).map((z) => `${z.type}${z.isClimbing ? '(climb)' : ''}@${Math.round(Math.hypot(z.x - p.x, z.y - p.y))}`);
        console.log(`  hit t=${t.toFixed(1)}s hp=${p.health.toFixed(0)} tile=${Math.floor(p.x / 40)},${Math.floor(p.y / 40)} alive=${game.zombies.length} near=[${near.join(' ')}]`);
      }
    }
    lastHealth = game.player.health;
    minHealth = Math.min(minHealth, game.player.health);
    t += STEP;
    tick++;
  }
  const r = game.rounds;
  const result = {
    round,
    loadout: loadout.join('+'),
    died: game.state === 'gameover',
    cleared: r.round === round && r.state === 'intermission',
    seconds: Math.round(t),
    kills: game.player.kills,
    zombiesTotal: r.zombieCount(round),
    zombieHp: r.zombieHealth(round),
    damageTaken: Math.round(damageTaken),
    minHealth: Math.round(minHealth),
    pointsEarned: game.player.score,
    ammoLeft: game.player.weapons.map((w) => `${w.def.id}:${w.mag}/${w.reserve}`).join(' '),
  };
  if (verbose) console.log(result);
  return result;
}

function scenario(round, loadout, runs, doors = []) {
  const rs = [];
  for (let i = 0; i < runs; i++) rs.push(runRound(round, loadout, { doors }));
  const avg = (k) => Math.round(rs.reduce((a, r) => a + r[k], 0) / rs.length);
  const deaths = rs.filter((r) => r.died).length;
  console.log(
    `round ${String(round).padStart(2)}  ${loadout.join('+').padEnd(12)} doors ${(doors.join('') || '-').padEnd(4)} zombies ${avg('zombiesTotal')} x ${avg('zombieHp')}hp  ` +
    `deaths ${deaths}/${runs}  cleared ${rs.filter((r) => r.cleared).length}/${runs}  ` +
    `avg ${avg('seconds')}s  dmg taken ${avg('damageTaken')}  points ${avg('pointsEarned')}  ammo ${rs[0].ammoLeft}`,
  );
}

const [, , roundArg, loadoutArg, runsArg, doorsArg] = process.argv;
if (roundArg) {
  scenario(Number(roundArg), (loadoutArg || 'pistol').split(','), Number(runsArg || 3), (doorsArg || '').split(''));
} else {
  const runs = 3;
  const LOOP = ['A', 'B', 'C', 'D'];
  scenario(1, ['pistol'], runs);
  scenario(2, ['pistol'], runs);
  scenario(3, ['pistol'], runs);
  scenario(4, ['pistol'], runs, LOOP);
  scenario(5, ['pistol'], runs, LOOP);
  scenario(5, ['pistol', 'smg'], runs, LOOP);
  scenario(7, ['shotgun', 'smg'], runs, LOOP);
  scenario(10, ['pistol'], runs, LOOP);
  scenario(10, ['pistol', 'smg'], runs, LOOP);
  scenario(10, ['ar', 'burst'], runs, LOOP);
  scenario(10, ['lmg', 'dmr'], runs, LOOP);
  scenario(15, ['ar', 'lmg'], runs, LOOP);
}
