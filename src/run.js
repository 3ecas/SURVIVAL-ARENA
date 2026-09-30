// Run state: what carries over between levels, and its localStorage persistence.

import { PLAYER, STORAGE_KEY } from './config.js';
import { WEAPONS, STARTING_WEAPON } from './data/weapons.js';
import { INVENTORY_TYPES } from './data/items.js';

export function newRunState(seed = Math.floor(Math.random() * 1e9)) {
  return {
    seed,
    level: 1,
    health: PLAYER.MAX_HEALTH,
    weapons: [{ id: STARTING_WEAPON, mag: WEAPONS[STARTING_WEAPON].magazine, reserve: WEAPONS[STARTING_WEAPON].reserve }],
    weaponIndex: 0,
    inventory: Object.fromEntries(INVENTORY_TYPES.map((t) => [t, 0])),
    bandages: PLAYER.START_BANDAGES,
    grenades: PLAYER.START_GRENADES,
    decoys: PLAYER.START_DECOYS,
    score: 0,
    kills: 0,
    levelsCleared: 0,
  };
}

export function newMeta() {
  return { runs: 0, bestScore: 0, bestLevel: 0, lastResult: null };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.run || !data.meta) return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function saveState(run, meta) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ run, meta }));
  } catch (e) {
    // Storage may be unavailable (private mode); the game still works.
  }
}

// Copies what the player carried out of a level back into the run.
export function applyLevelResult(run, meta, player, { extracted, level }) {
  run.score = player.score;
  run.kills = player.kills;
  if (!extracted) {
    meta.runs++;
    meta.bestScore = Math.max(meta.bestScore, player.score);
    meta.bestLevel = Math.max(meta.bestLevel, run.levelsCleared);
    meta.lastResult = { died: true, level, score: player.score, kills: player.kills };
    return newRunState();
  }
  run.health = Math.max(1, Math.round(player.health));
  run.weapons = player.weapons.map((w) => ({ id: w.def.id, mag: w.mag, reserve: w.reserve }));
  run.weaponIndex = player.weaponIndex;
  run.inventory = { ...player.inventory };
  run.bandages = player.bandages;
  run.grenades = player.grenades;
  run.decoys = player.decoys;
  run.levelsCleared = level;
  run.level = level + 1;
  meta.bestScore = Math.max(meta.bestScore, player.score);
  meta.bestLevel = Math.max(meta.bestLevel, run.levelsCleared);
  meta.lastResult = { died: false, level, score: player.score, kills: player.kills };
  return run;
}
