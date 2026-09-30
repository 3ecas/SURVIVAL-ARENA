#!/usr/bin/env node
// Validates src/data/map.js:
//  - the grid is rectangular and only uses known symbols
//  - every area is one connected region and is reachable from the start room
//    once its doors are open (checked on the area graph and tile by tile)
//  - every door tile joins exactly two different areas
//  - every window opens into exactly one room tile and has the outside behind it
//  - every area has at least two windows
//  - wall buys hang on solid tiles and face a floor tile of an unlocked-able area
//  - the crate exists and can be stood in front of
// Exits with code 1 and a list of problems when anything fails.

import { MAPS } from '../src/data/maps.js';
import { WEAPONS } from '../src/data/weapons.js';

// Returns { errors, warnings, stats } for one map definition.
export function checkMap(MAP) {
const errors = [];
const warnings = [];
const fail = (msg) => errors.push(msg);
const warn = (msg) => warnings.push(msg);

const rows = MAP.rows;
const H = rows.length;
const W = rows[0].length;
const DIRS = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };
const ORTHO = Object.values(DIRS);
const doorLetters = new Set(MAP.doors.map((d) => d.id));
const areaIds = new Set(MAP.areas.map((a) => a.id));

const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? ' ' : rows[y][x]);
const isFloor = (c) => (c >= '0' && c <= '9') || c === 'P';
const isDoor = (c) => doorLetters.has(c);
const areaOf = (c) => (c === 'P' ? 0 : c >= '0' && c <= '9' ? c.charCodeAt(0) - 48 : -1);

// --- 1. grid shape and symbols -----------------------------------------------
rows.forEach((row, y) => {
  if (row.length !== W) fail(`Row ${y} has length ${row.length}, expected ${W}`);
  for (let x = 0; x < row.length; x++) {
    const c = row[x];
    const known = c === ' ' || c === '#' || c === 'W' || c === 'X' || isFloor(c) || isDoor(c);
    if (!known) fail(`Unknown symbol '${c}' at (${x}, ${y})`);
    if (isFloor(c) && !areaIds.has(areaOf(c))) fail(`Floor tile at (${x}, ${y}) uses undefined area ${areaOf(c)}`);
  }
});
for (let x = 0; x < W; x++) {
  if (at(x, 0) !== ' ' || at(x, H - 1) !== ' ') fail(`Top/bottom border must be void (column ${x})`);
}
for (let y = 0; y < H; y++) {
  if (at(0, y) !== ' ' || at(W - 1, y) !== ' ') fail(`Left/right border must be void (row ${y})`);
}

// --- 2. player spawn ---------------------------------------------------------
const spawns = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === 'P') spawns.push({ x, y });
if (spawns.length !== 1) fail(`Expected exactly one player spawn 'P', found ${spawns.length}`);

// --- 3. areas: contiguous ----------------------------------------------------
function flood(startX, startY, passable) {
  const seen = new Set();
  const stack = [[startX, startY]];
  seen.add(`${startX},${startY}`);
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of ORTHO) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (seen.has(key) || !passable(at(nx, ny), nx, ny)) continue;
      seen.add(key);
      stack.push([nx, ny]);
    }
  }
  return seen;
}

const tilesByArea = new Map();
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (!isFloor(c)) continue;
    const id = areaOf(c);
    if (!tilesByArea.has(id)) tilesByArea.set(id, []);
    tilesByArea.get(id).push({ x, y });
  }
}
for (const a of MAP.areas) {
  const tiles = tilesByArea.get(a.id);
  if (!tiles) {
    fail(`Area ${a.id} (${a.name}) has no floor tiles`);
    continue;
  }
  const region = flood(tiles[0].x, tiles[0].y, (c) => isFloor(c) && areaOf(c) === a.id);
  if (region.size !== tiles.length) {
    fail(`Area ${a.id} (${a.name}) is split into disconnected parts (${region.size} of ${tiles.length} tiles connected)`);
  }
}

// --- 4. doors ----------------------------------------------------------------
const doorTiles = new Map();
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const c = at(x, y);
    if (!isDoor(c)) continue;
    if (!doorTiles.has(c)) doorTiles.set(c, []);
    doorTiles.get(c).push({ x, y });
  }
}
const areaGraph = new Map(MAP.areas.map((a) => [a.id, []]));
for (const d of MAP.doors) {
  const tiles = doorTiles.get(d.id);
  if (!tiles) {
    fail(`Door ${d.id} is defined but never placed on the grid`);
    continue;
  }
  if (typeof d.price !== 'number' || d.price <= 0) fail(`Door ${d.id} needs a positive price`);
  const touched = new Set();
  for (const t of tiles) {
    for (const [dx, dy] of ORTHO) {
      const c = at(t.x + dx, t.y + dy);
      if (isFloor(c)) touched.add(areaOf(c));
      else if (c !== '#' && c !== d.id) fail(`Door ${d.id} tile (${t.x}, ${t.y}) touches '${c}', expected wall, floor or the same door`);
    }
  }
  if (touched.size !== 2) fail(`Door ${d.id} must join exactly two areas, joins [${[...touched].join(', ')}]`);
  const [a, b] = [...touched];
  if (touched.size === 2) {
    areaGraph.get(a).push({ to: b, door: d });
    areaGraph.get(b).push({ to: a, door: d });
  }
}
for (const letter of doorTiles.keys()) {
  if (!MAP.doors.some((d) => d.id === letter)) fail(`Door tile '${letter}' has no entry in MAP.doors`);
}

// --- 5. reachability of areas (area graph + tile flood with all doors open) --
{
  const seen = new Set([0]);
  const queue = [0];
  const minPrice = new Map([[0, 0]]);
  while (queue.length) {
    const a = queue.shift();
    for (const e of areaGraph.get(a) || []) {
      if (seen.has(e.to)) continue;
      seen.add(e.to);
      minPrice.set(e.to, e.door.price);
      queue.push(e.to);
    }
  }
  for (const a of MAP.areas) {
    if (!seen.has(a.id)) fail(`Area ${a.id} (${a.name}) is not reachable from the start room through doors`);
    if ((areaGraph.get(a.id) || []).length < 2) warn(`Area ${a.id} (${a.name}) has only ${(areaGraph.get(a.id) || []).length} door(s): dead end`);
  }
  if (spawns.length === 1) {
    const reach = flood(spawns[0].x, spawns[0].y, (c) => isFloor(c) || isDoor(c));
    for (const [id, tiles] of tilesByArea) {
      const missing = tiles.filter((t) => !reach.has(`${t.x},${t.y}`));
      if (missing.length) fail(`Area ${id}: ${missing.length} floor tile(s) unreachable even with all doors open, e.g. (${missing[0].x}, ${missing[0].y})`);
    }
  }
}

// --- 6. windows --------------------------------------------------------------
const windowsByArea = new Map(MAP.areas.map((a) => [a.id, 0]));
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    if (at(x, y) !== 'W') continue;
    const insides = ORTHO.filter(([dx, dy]) => isFloor(at(x + dx, y + dy)));
    if (insides.length !== 1) {
      fail(`Window at (${x}, ${y}) must touch exactly one floor tile, touches ${insides.length}`);
      continue;
    }
    const [dx, dy] = insides[0];
    if (at(x - dx, y - dy) !== ' ') fail(`Window at (${x}, ${y}) has no outside (void) behind it`);
    const id = areaOf(at(x + dx, y + dy));
    windowsByArea.set(id, (windowsByArea.get(id) || 0) + 1);
  }
}
for (const a of MAP.areas) {
  const n = windowsByArea.get(a.id) || 0;
  if (n < 2) fail(`Area ${a.id} (${a.name}) has ${n} window(s), needs at least 2`);
}

// --- 7. wall buys and crate --------------------------------------------------
for (const wb of MAP.wallBuys) {
  if (!WEAPONS[wb.weapon]) fail(`Wall buy at (${wb.x}, ${wb.y}) references unknown weapon '${wb.weapon}'`);
  else if (WEAPONS[wb.weapon].source !== 'wall') fail(`Wall buy weapon '${wb.weapon}' is not a wall weapon`);
  const dir = DIRS[wb.facing];
  if (!dir) {
    fail(`Wall buy at (${wb.x}, ${wb.y}) has invalid facing '${wb.facing}'`);
    continue;
  }
  if (at(wb.x, wb.y) !== '#') fail(`Wall buy at (${wb.x}, ${wb.y}) must be on a wall tile, found '${at(wb.x, wb.y)}'`);
  if (!isFloor(at(wb.x + dir[0], wb.y + dir[1]))) fail(`Wall buy at (${wb.x}, ${wb.y}) faces '${at(wb.x + dir[0], wb.y + dir[1])}', expected floor`);
}
{
  const crateTiles = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (at(x, y) === 'X') crateTiles.push({ x, y });
  if (!crateTiles.length) fail('No crate tile (X) on the grid');
  const dir = DIRS[MAP.crate?.facing];
  if (!dir) fail(`Crate has invalid facing '${MAP.crate?.facing}'`);
  else if (crateTiles.some((t) => !isFloor(at(t.x + dir[0], t.y + dir[1])))) fail('Crate must face floor tiles on its facing side');
}

// --- 8. balance hint: prices should rise along every route (warning only) --
{
  // Cheapest total spend to reach each area, and the priciest door on that path.
  const cost = new Map([[0, 0]]);
  const maxDoorOnPath = new Map([[0, 0]]);
  const pending = [0];
  while (pending.length) {
    pending.sort((a, b) => cost.get(a) - cost.get(b));
    const a = pending.shift();
    for (const e of areaGraph.get(a) || []) {
      const c = cost.get(a) + e.door.price;
      if (cost.has(e.to) && cost.get(e.to) <= c) continue;
      cost.set(e.to, c);
      maxDoorOnPath.set(e.to, Math.max(maxDoorOnPath.get(a), e.door.price));
      pending.push(e.to);
    }
  }
  for (const d of MAP.doors) {
    const tiles = doorTiles.get(d.id) || [];
    const areas = new Set();
    for (const t of tiles) for (const [dx, dy] of ORTHO) if (isFloor(at(t.x + dx, t.y + dy))) areas.add(areaOf(at(t.x + dx, t.y + dy)));
    if (areas.size !== 2) continue;
    const nearer = [...areas].sort((x, y) => (cost.get(x) ?? Infinity) - (cost.get(y) ?? Infinity))[0];
    const priciest = maxDoorOnPath.get(nearer) ?? 0;
    if (d.price < priciest) warn(`Door ${d.id} (${d.price}) is cheaper than door(s) needed to reach it (${priciest})`);
  }
}

const stats = {
  width: W,
  height: H,
  areas: MAP.areas.length,
  doors: MAP.doors.length,
  windows: [...windowsByArea.values()].reduce((a, b) => a + b, 0),
  wallBuys: MAP.wallBuys.length,
};
return { errors, warnings, stats };
}

// --- CLI: check every registered map ----------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  let failed = 0;
  for (const [id, map] of Object.entries(MAPS)) {
    const { errors, warnings, stats } = checkMap(map);
    for (const w of warnings) console.log(`[${id}] warning: ${w}`);
    for (const e of errors) console.error(`[${id}] error: ${e}`);
    if (errors.length) {
      failed++;
      console.error(`[${id}] Map check failed with ${errors.length} error(s).`);
    } else {
      console.log(`[${id}] Map OK: ${stats.width}x${stats.height} tiles, ${stats.areas} areas, ${stats.doors} doors, ${stats.windows} windows, ${stats.wallBuys} wall buys.`);
    }
  }
  process.exit(failed ? 1 : 0);
}
