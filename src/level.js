// Builds everything a level needs from (level number, run seed): the map,
// the enemy budget and the loot list. Deterministic, so the hub can show a
// briefing for exactly the map the player will get.

import { LEVELS, ZOMBIE } from './config.js';
import { generateMapWithRetries } from './mapgen/generator.js';
import { mulberry32 } from './mapgen/rng.js';

// Level at which the map reaches its maximum size.
export const MAX_LEVEL_FOR_SIZE = Math.max(
  Math.ceil((LEVELS.MAX_WIDTH - LEVELS.BASE_WIDTH) / LEVELS.WIDTH_PER_LEVEL),
  Math.ceil((LEVELS.MAX_HEIGHT - LEVELS.BASE_HEIGHT) / LEVELS.HEIGHT_PER_LEVEL),
) + 1;

export function levelParams(level, runSeed) {
  const n = level - 1;
  return {
    width: Math.min(LEVELS.MAX_WIDTH, LEVELS.BASE_WIDTH + LEVELS.WIDTH_PER_LEVEL * n),
    height: Math.min(LEVELS.MAX_HEIGHT, LEVELS.BASE_HEIGHT + LEVELS.HEIGHT_PER_LEVEL * n),
    areas: Math.min(LEVELS.MAX_AREAS, Math.floor(LEVELS.BASE_AREAS + LEVELS.AREAS_PER_LEVEL * n)),
    seed: runSeed * 1000 + level * 7,
    windowsPerArea: LEVELS.WINDOWS_PER_AREA,
    lightsPerArea: LEVELS.LIGHTS_PER_AREA,
    name: `Level ${level}`,
  };
}

export function enemyBudget(level) {
  const n = level - 1;
  const total = LEVELS.ENEMIES_BASE + LEVELS.ENEMIES_PER_LEVEL * n;
  const runnerShare = level < LEVELS.RUNNER_START_LEVEL ? 0 : Math.min(LEVELS.RUNNER_MAX_SHARE, (level - LEVELS.RUNNER_START_LEVEL + 1) * LEVELS.RUNNER_SHARE_PER_LEVEL);
  const runners = Math.round(total * runnerShare);
  return {
    total,
    walkers: total - runners,
    runners,
    runnerShare,
    health: ZOMBIE.BASE_HEALTH + ZOMBIE.HEALTH_PER_LEVEL * n,
    walkerSpeed: Math.min(ZOMBIE.WALKER_MAX_SPEED, ZOMBIE.WALKER_SPEED + ZOMBIE.WALKER_SPEED_PER_LEVEL * n),
    runnerSpeed: Math.min(ZOMBIE.RUNNER_MAX_SPEED, ZOMBIE.RUNNER_SPEED + ZOMBIE.RUNNER_SPEED_PER_LEVEL * n),
    spawnInterval: Math.max(LEVELS.MIN_SPAWN_INTERVAL, LEVELS.SPAWN_INTERVAL - LEVELS.SPAWN_INTERVAL_PER_LEVEL * n),
    maxAlive: Math.min(LEVELS.MAX_ALIVE_CAP, LEVELS.MAX_ALIVE + LEVELS.MAX_ALIVE_PER_LEVEL * n),
  };
}

export function lootBudget(level, windowCount) {
  const n = level - 1;
  const counts = {};
  for (const [type, rule] of Object.entries(LEVELS.LOOT)) {
    let c = rule.base + rule.perLevel * n;
    if (rule.extraPerWindow) c += rule.extraPerWindow * windowCount;
    counts[type] = Math.round(c);
  }
  return counts;
}

// Spreads loot over floor tiles away from the spawn, deterministically.
function placeLoot(map, counts, rng) {
  const floor = [];
  let spawn = null;
  map.rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      if (c === 'P') spawn = { x, y };
      else if (c >= '0' && c <= '9') floor.push({ x, y });
    }
  });
  const lightKeys = new Set(map.lights.map((l) => `${l.x},${l.y}`));
  const cands = floor.filter((t) => !lightKeys.has(`${t.x},${t.y}`) && Math.hypot(t.x - spawn.x, t.y - spawn.y) > 3);
  const items = [];
  const used = new Set();
  for (const [type, count] of Object.entries(counts)) {
    for (let i = 0; i < count; i++) {
      for (let tries = 0; tries < 50; tries++) {
        const t = cands[Math.floor(rng() * cands.length)];
        const k = `${t.x},${t.y}`;
        if (used.has(k)) continue;
        used.add(k);
        items.push({ type, x: t.x, y: t.y });
        break;
      }
    }
  }
  return items;
}

export function buildLevel(level, runSeed) {
  const params = levelParams(level, runSeed);
  const generated = generateMapWithRetries(params);
  if (!generated) throw new Error(`Could not generate level ${level} for run seed ${runSeed}`);
  const { map } = generated;
  const windowCount = map.rows.join('').split('W').length - 1;
  const enemies = enemyBudget(level);
  const loot = lootBudget(level, windowCount);
  const items = placeLoot(map, loot, mulberry32(generated.seed + 99));
  return {
    level,
    params,
    map,
    mapSeed: generated.seed,
    windowCount,
    enemies,
    loot,
    items,
  };
}
