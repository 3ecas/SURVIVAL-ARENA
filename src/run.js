// Run state: what carries over between levels, experience and unlocks, and
// localStorage persistence.

import { PLAYER, STORAGE_KEY, XP } from './config.js';
import { WEAPONS, STARTING_WEAPON } from './data/weapons.js';
import { INVENTORY_TYPES } from './data/items.js';
import { ATTRIBUTES } from './data/attributes.js';

export function newRunState(seed = Math.floor(Math.random() * 1e9)) {
  return {
    seed,
    level: 1,
    health: PLAYER.MAX_HEALTH,
    weapons: [{ id: STARTING_WEAPON, mag: WEAPONS[STARTING_WEAPON].magazine, reserve: WEAPONS[STARTING_WEAPON].reserve }],
    weaponIndex: 0,
    unlocked: [STARTING_WEAPON],
    inventory: Object.fromEntries(INVENTORY_TYPES.map((t) => [t, 0])),
    bandages: PLAYER.START_BANDAGES,
    grenades: PLAYER.START_GRENADES,
    decoys: PLAYER.START_DECOYS,
    points: 0, // spendable score
    score: 0, // total score earned this run
    kills: 0,
    levelsCleared: 0,
    xp: 0,
    playerLevel: 1,
    attributePoints: 0,
    attributes: Object.fromEntries(ATTRIBUTES.map((a) => [a.id, 0])),
  };
}

export function newMeta() {
  return { runs: 0, bestScore: 0, bestLevel: 0, lastResult: null };
}

export function xpToNext(playerLevel) {
  return Math.round(XP.BASE_TO_NEXT * Math.pow(XP.GROWTH, playerLevel - 1));
}

// Adds experience and resolves level-ups; returns how many levels were gained.
export function addXp(run, amount) {
  run.xp += amount;
  let gained = 0;
  while (run.xp >= xpToNext(run.playerLevel)) {
    run.xp -= xpToNext(run.playerLevel);
    run.playerLevel++;
    run.attributePoints += XP.POINTS_PER_LEVEL;
    gained++;
  }
  return gained;
}

// Derived stats from attributes, used by Player and the weapons.
export function derivedStats(run) {
  const a = run.attributes;
  const by = (id) => ATTRIBUTES.find((x) => x.id === id).perPoint * (a[id] || 0);
  return {
    maxHealth: PLAYER.MAX_HEALTH + by('vitality'),
    speedMultiplier: 1 + by('agility'),
    reloadMultiplier: Math.max(0.4, 1 - by('handling')),
    damageMultiplier: 1 + by('power'),
  };
}

export function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.run || !data.meta || !data.run.attributes) return null;
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
export function applyLevelResult(run, meta, player, { cleared, level, xpEarned }) {
  run.points = player.points;
  run.score = player.score;
  run.kills = player.kills;
  meta.bestScore = Math.max(meta.bestScore, player.score);
  if (!cleared) {
    meta.runs++;
    meta.bestLevel = Math.max(meta.bestLevel, run.levelsCleared);
    meta.lastResult = { died: true, level, score: player.score, kills: player.kills };
    return newRunState();
  }
  run.health = Math.max(1, Math.round(player.health));
  run.weapons = player.weapons.map((w) => ({ id: w.def.id, mag: w.def.magazine, reserve: w.def.reserve }));
  run.weaponIndex = player.weaponIndex;
  run.inventory = { ...player.inventory };
  run.bandages = player.bandages;
  run.grenades = player.grenades;
  run.decoys = player.decoys;
  run.levelsCleared = level;
  run.level = level + 1;
  const gained = addXp(run, xpEarned);
  meta.bestLevel = Math.max(meta.bestLevel, run.levelsCleared);
  meta.lastResult = { died: false, level, score: player.score, kills: player.kills, xpEarned, levelsGained: gained };
  return run;
}
