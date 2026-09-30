#!/usr/bin/env node
// Generates a cave-style map on the same 46x34 grid from seeded value noise,
// then carves corridors, splits the caves into areas, and places doors,
// windows, wall buys, the crate and the spawn so the result passes
// tools/check-map.js. Output is pure data written to src/data/map-caves.js.
//
//   node tools/gen-map.js            # uses the seed baked in below
//   node tools/gen-map.js 1234       # try a specific seed
//   node tools/gen-map.js 1234 --print   # print the grid, do not write

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkMap } from './check-map.js';

const W = 46;
const H = 34;
const AREA_COUNT = 7;
const AREA_NAMES = ['Entrance Cave', 'Sump', 'Crystal Gallery', 'The Narrows', 'Fungal Grotto', 'Old Mine', 'Deep Vault'];
const DOOR_LETTERS = 'ABCDEFGHIJKLMNOQRSTUVYZ'; // P, W and X are reserved symbols
const DOOR_PRICE_BASE = 500;
const DOOR_PRICE_STEP = 250;
const WALL_BUY_BY_DEPTH = ['shotgun', 'smg', 'burst', 'ar', 'dmr', 'ar', 'burst'];
const WINDOWS_PER_AREA = 3;
const AREA_BALANCE = 0.3; // smallest area must be at least this share of the largest
const MIN_COMPONENT = 10;
const FLOOR_RATIO = [0.42, 0.58];
const NOISE_SCALES = [7, 3.5, 1.8];
const NOISE_WEIGHTS = [0.6, 0.28, 0.12];

// ---- seeded randomness -------------------------------------------------------

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seed) {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const smooth = (t) => t * t * (3 - 2 * t);

function valueNoise(x, y, scale, seed) {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const tx = smooth(gx - x0);
  const ty = smooth(gy - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

function fbm(x, y, seed) {
  let v = 0;
  for (let i = 0; i < NOISE_SCALES.length; i++) v += NOISE_WEIGHTS[i] * valueNoise(x, y, NOISE_SCALES[i], seed + i * 101);
  return v;
}

// ---- grid helpers ------------------------------------------------------------

const VOID = ' ';
const WALL = '#';
const FLOOR = '.';
const ORTHO = [[0, -1], [0, 1], [1, 0], [-1, 0]];
const ALL8 = [...ORTHO, [1, 1], [1, -1], [-1, 1], [-1, -1]];
const DIR_NAME = { '0,-1': 'N', '0,1': 'S', '1,0': 'E', '-1,0': 'W' };
const inInterior = (x, y) => x >= 2 && y >= 2 && x <= W - 3 && y <= H - 3;
const key = (x, y) => y * W + x;

class Grid {
  constructor() {
    this.cells = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? VOID : WALL)));
    this.area = Array.from({ length: H }, () => Array(W).fill(-1));
  }

  get(x, y) {
    return x < 0 || y < 0 || x >= W || y >= H ? VOID : this.cells[y][x];
  }

  set(x, y, c) {
    this.cells[y][x] = c;
  }

  isFloor(x, y) {
    return this.get(x, y) === FLOOR;
  }

  floorTiles() {
    const out = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.isFloor(x, y)) out.push({ x, y });
    return out;
  }

  // Connected components of tiles that satisfy `pred`, 4-connected.
  components(pred) {
    const seen = new Set();
    const comps = [];
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!pred(x, y) || seen.has(key(x, y))) continue;
        const comp = [];
        const stack = [[x, y]];
        seen.add(key(x, y));
        while (stack.length) {
          const [cx, cy] = stack.pop();
          comp.push({ x: cx, y: cy });
          for (const [dx, dy] of ORTHO) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= W || ny >= H || seen.has(key(nx, ny)) || !pred(nx, ny)) continue;
            seen.add(key(nx, ny));
            stack.push([nx, ny]);
          }
        }
        comps.push(comp);
      }
    }
    return comps.sort((a, b) => b.length - a.length);
  }
}

// ---- step 1: caves from noise ---------------------------------------------------

function carveCaves(grid, seed, threshold) {
  for (let y = 2; y <= H - 3; y++) {
    for (let x = 2; x <= W - 3; x++) {
      // Fade toward walls at the edge so caves do not hug the border everywhere.
      const edge = Math.min(x - 1, y - 1, W - 2 - x, H - 2 - y);
      const bias = edge < 3 ? (3 - edge) * 0.08 : 0;
      grid.set(x, y, fbm(x, y, seed) - bias > threshold ? FLOOR : WALL);
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const next = grid.cells.map((r) => r.slice());
    for (let y = 2; y <= H - 3; y++) {
      for (let x = 2; x <= W - 3; x++) {
        let n = 0;
        for (const [dx, dy] of ALL8) if (grid.isFloor(x + dx, y + dy)) n++;
        if (n >= 5) next[y][x] = FLOOR;
        else if (n <= 3) next[y][x] = WALL;
      }
    }
    grid.cells = next;
  }
}

// Dijkstra through walls with a noise-weighted cost, so corridors meander.
function carveCorridor(grid, from, to, seed, rng, allowFloor = () => true) {
  const cost = new Float64Array(W * H).fill(Infinity);
  const prev = new Int32Array(W * H).fill(-1);
  const done = new Uint8Array(W * H);
  const start = key(from.x, from.y);
  cost[start] = 0;
  const open = [start];
  while (open.length) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (cost[open[i]] < cost[open[bi]]) bi = i;
    const cur = open.splice(bi, 1)[0];
    if (done[cur]) continue;
    done[cur] = 1;
    const cx = cur % W;
    const cy = (cur - cx) / W;
    if (cx === to.x && cy === to.y) break;
    for (const [dx, dy] of ORTHO) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!inInterior(nx, ny)) continue;
      const k = key(nx, ny);
      if (done[k]) continue;
      if (grid.isFloor(nx, ny) && !allowFloor(nx, ny)) continue;
      const step = grid.isFloor(nx, ny) ? 0.4 : 1 + 4 * fbm(nx + 100, ny + 100, seed + 7);
      if (cost[cur] + step < cost[k]) {
        cost[k] = cost[cur] + step;
        prev[k] = cur;
        open.push(k);
      }
    }
  }
  const path = [];
  let k = key(to.x, to.y);
  if (prev[k] < 0 && k !== start) return [];
  while (k !== -1) {
    path.push({ x: k % W, y: Math.floor(k / W) });
    k = prev[k];
  }
  path.reverse();
  const carved = [];
  for (const t of path) {
    if (!grid.isFloor(t.x, t.y)) {
      grid.set(t.x, t.y, FLOOR);
      carved.push(t);
    }
    // Occasionally widen to two tiles for a less uniform corridor.
    if (rng() < 0.25) {
      const [dx, dy] = ORTHO[Math.floor(rng() * 4)];
      const sx = t.x + dx;
      const sy = t.y + dy;
      if (inInterior(sx, sy) && !grid.isFloor(sx, sy)) {
        grid.set(sx, sy, FLOOR);
        carved.push({ x: sx, y: sy });
      }
    }
  }
  return carved;
}

function nearestPair(a, b) {
  let best = null;
  let bd = Infinity;
  for (const p of a) {
    for (const q of b) {
      const d = Math.abs(p.x - q.x) + Math.abs(p.y - q.y);
      if (d < bd) {
        bd = d;
        best = [p, q];
      }
    }
  }
  return best;
}

function connectComponents(grid, seed, rng) {
  let comps = grid.components((x, y) => grid.isFloor(x, y));
  for (const c of comps) if (c.length < MIN_COMPONENT) for (const t of c) grid.set(t.x, t.y, WALL);
  comps = grid.components((x, y) => grid.isFloor(x, y));
  while (comps.length > 1) {
    const [p, q] = nearestPair(comps[0], comps[1]);
    carveCorridor(grid, p, q, seed, rng);
    comps = grid.components((x, y) => grid.isFloor(x, y));
  }
}

// ---- step 2: areas -----------------------------------------------------------------

function pickSeeds(tiles, rng) {
  const seeds = [tiles[Math.floor(rng() * tiles.length)]];
  while (seeds.length < AREA_COUNT) {
    let best = null;
    let bd = -1;
    for (const t of tiles) {
      let d = Infinity;
      for (const s of seeds) d = Math.min(d, Math.hypot(t.x - s.x, t.y - s.y));
      if (d > bd) {
        bd = d;
        best = t;
      }
    }
    seeds.push(best);
  }
  return seeds;
}

function growAreas(grid, seeds) {
  for (const row of grid.area) row.fill(-1);
  const queue = [];
  seeds.forEach((s, i) => {
    grid.area[s.y][s.x] = i;
    queue.push(s);
  });
  let head = 0;
  while (head < queue.length) {
    const t = queue[head++];
    for (const [dx, dy] of ORTHO) {
      const nx = t.x + dx;
      const ny = t.y + dy;
      if (!grid.isFloor(nx, ny) || grid.area[ny][nx] !== -1) continue;
      grid.area[ny][nx] = grid.area[t.y][t.x];
      queue.push({ x: nx, y: ny });
    }
  }
}

function areaTiles(grid, id) {
  return grid.floorTiles().filter((t) => grid.area[t.y][t.x] === id);
}

function adjacency(grid) {
  const adj = Array.from({ length: AREA_COUNT }, () => new Set());
  for (const t of grid.floorTiles()) {
    const a = grid.area[t.y][t.x];
    for (const [dx, dy] of ORTHO) {
      const nx = t.x + dx;
      const ny = t.y + dy;
      if (!grid.isFloor(nx, ny)) continue;
      const b = grid.area[ny][nx];
      if (b !== a && b >= 0) adj[a].add(b);
    }
  }
  return adj;
}

// Every area should border at least two others so the door graph has loops.
function ensureLoops(grid, seed, rng) {
  for (let iter = 0; iter < AREA_COUNT * 2; iter++) {
    const adj = adjacency(grid);
    const lonely = adj.findIndex((s) => s.size < 2);
    if (lonely < 0) return true;
    const mine = areaTiles(grid, lonely);
    let target = -1;
    let pair = null;
    let bd = Infinity;
    for (let b = 0; b < AREA_COUNT; b++) {
      if (b === lonely || adj[lonely].has(b)) continue;
      const pq = nearestPair(mine, areaTiles(grid, b));
      const d = Math.abs(pq[0].x - pq[1].x) + Math.abs(pq[0].y - pq[1].y);
      if (d < bd) {
        bd = d;
        target = b;
        pair = pq;
      }
    }
    if (target < 0) return false;
    const own = (x, y) => grid.area[y][x] === lonely || grid.area[y][x] === target;
    const carved = carveCorridor(grid, pair[0], pair[1], seed + iter, rng, own);
    if (!carved.length) return false;
    carved.forEach((t, i) => {
      grid.area[t.y][t.x] = i < carved.length / 2 ? lonely : target;
    });
  }
  return adjacency(grid).every((s) => s.size >= 2);
}

// Turn the higher-numbered side of every area boundary into wall (1 tile thick).
function buildBorders(grid) {
  const toWall = [];
  for (const t of grid.floorTiles()) {
    const a = grid.area[t.y][t.x];
    for (const [dx, dy] of ORTHO) {
      const nx = t.x + dx;
      const ny = t.y + dy;
      if (grid.isFloor(nx, ny) && grid.area[ny][nx] >= 0 && grid.area[ny][nx] < a) toWall.push(t);
    }
  }
  for (const t of toWall) {
    grid.set(t.x, t.y, WALL);
    grid.area[t.y][t.x] = -1;
  }
}

// Keep only the largest fragment of every area; wall off the rest.
function dropFragments(grid) {
  for (let a = 0; a < AREA_COUNT; a++) {
    const comps = grid.components((x, y) => grid.isFloor(x, y) && grid.area[y][x] === a);
    if (!comps.length) return false;
    for (const c of comps.slice(1)) {
      for (const t of c) {
        grid.set(t.x, t.y, WALL);
        grid.area[t.y][t.x] = -1;
      }
    }
  }
  return true;
}

// ---- step 3: doors -----------------------------------------------------------------

function neighbourAreas(grid, x, y) {
  const areas = new Set();
  let ok = true;
  for (const [dx, dy] of ORTHO) {
    const c = grid.get(x + dx, y + dy);
    if (c === FLOOR) areas.add(grid.area[y + dy][x + dx]);
    else if (c !== WALL) ok = false;
  }
  return { areas, ok };
}

function doorCandidates(grid, a, b) {
  const singles = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (grid.get(x, y) !== WALL) continue;
      const { areas, ok } = neighbourAreas(grid, x, y);
      if (!ok || areas.size !== 2 || !areas.has(a) || !areas.has(b)) continue;
      singles.push({ x, y });
    }
  }
  const singleSet = new Set(singles.map((t) => key(t.x, t.y)));
  const doubles = [];
  for (const t of singles) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const n = { x: t.x + dx, y: t.y + dy };
      if (!singleSet.has(key(n.x, n.y))) continue;
      // Both tiles together must still only touch a and b.
      const union = new Set();
      for (const q of [t, n]) for (const [ox, oy] of ORTHO) {
        const c = grid.get(q.x + ox, q.y + oy);
        if (c === FLOOR) union.add(grid.area[q.y + oy][q.x + ox]);
      }
      if (union.size === 2) doubles.push([t, n]);
    }
  }
  return { singles, doubles };
}

function placeDoors(grid, edges, rng) {
  // Spanning tree from area 0 first, then extra edges until every area has two doors.
  const chosen = [];
  const inTree = new Set([0]);
  const shuffled = edges.slice().sort(() => rng() - 0.5);
  let grew = true;
  while (grew && inTree.size < AREA_COUNT) {
    grew = false;
    for (const e of shuffled) {
      const [a, b] = e;
      if (inTree.has(a) !== inTree.has(b) && !chosen.includes(e)) {
        chosen.push(e);
        inTree.add(a);
        inTree.add(b);
        grew = true;
        break;
      }
    }
  }
  if (inTree.size < AREA_COUNT) return null;
  const degree = () => {
    const d = Array(AREA_COUNT).fill(0);
    for (const [a, b] of chosen) {
      d[a]++;
      d[b]++;
    }
    return d;
  };
  for (const e of shuffled) {
    const d = degree();
    if (d.every((n) => n >= 2)) break;
    if (!chosen.includes(e) && (d[e[0]] < 2 || d[e[1]] < 2)) chosen.push(e);
  }
  // One more loop edge if available, for variety.
  const spare = shuffled.find((e) => !chosen.includes(e));
  if (spare && chosen.length < DOOR_LETTERS.length) chosen.push(spare);

  const doors = [];
  const used = new Set();
  for (const [a, b] of chosen) {
    const { singles, doubles } = doorCandidates(grid, a, b);
    const free = (t) => !used.has(key(t.x, t.y));
    const dbl = doubles.filter((p) => p.every(free));
    const sgl = singles.filter(free);
    let tiles;
    if (dbl.length && rng() < 0.7) tiles = dbl[Math.floor(rng() * dbl.length)];
    else if (sgl.length) tiles = [sgl[Math.floor(rng() * sgl.length)]];
    else if (dbl.length) tiles = dbl[0];
    else return null;
    for (const t of tiles) used.add(key(t.x, t.y));
    doors.push({ areas: [a, b], tiles });
  }
  return doors;
}

function areaDepths(doors) {
  const depth = Array(AREA_COUNT).fill(Infinity);
  depth[0] = 0;
  const queue = [0];
  while (queue.length) {
    const a = queue.shift();
    for (const d of doors) {
      if (!d.areas.includes(a)) continue;
      const b = d.areas[0] === a ? d.areas[1] : d.areas[0];
      if (depth[b] > depth[a] + 1) {
        depth[b] = depth[a] + 1;
        queue.push(b);
      }
    }
  }
  return depth;
}

// ---- step 4: void pockets, windows, buys, crate, spawn -------------------------------

function openVoidPockets(grid, doorTiles) {
  const solidButUsed = new Set(doorTiles.map((t) => key(t.x, t.y)));
  const next = grid.cells.map((r) => r.slice());
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (grid.get(x, y) !== WALL) continue;
      let touches = false;
      for (const [dx, dy] of ALL8) {
        const nx = x + dx;
        const ny = y + dy;
        if (grid.isFloor(nx, ny) || solidButUsed.has(key(nx, ny))) touches = true;
      }
      if (!touches) next[y][x] = VOID;
    }
  }
  grid.cells = next;
}

function windowCandidates(grid, area, blocked) {
  const out = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (grid.get(x, y) !== WALL || blocked.has(key(x, y))) continue;
      const floors = ORTHO.filter(([dx, dy]) => grid.isFloor(x + dx, y + dy));
      if (floors.length !== 1) continue;
      const [dx, dy] = floors[0];
      if (grid.area[y + dy][x + dx] !== area) continue;
      if (grid.get(x - dx, y - dy) !== VOID) continue;
      // Never next to a door: the door checker wants walls around doors.
      if (ORTHO.some(([ox, oy]) => blocked.has(key(x + ox, y + oy)))) continue;
      out.push({ x, y });
    }
  }
  return out;
}

function spreadPick(cands, n, rng) {
  if (!cands.length) return [];
  const picked = [cands[Math.floor(rng() * cands.length)]];
  while (picked.length < n && picked.length < cands.length) {
    let best = null;
    let bd = -1;
    for (const c of cands) {
      if (picked.includes(c)) continue;
      let d = Infinity;
      for (const p of picked) d = Math.min(d, Math.hypot(c.x - p.x, c.y - p.y));
      if (d > bd) {
        bd = d;
        best = c;
      }
    }
    picked.push(best);
  }
  return picked;
}

function wallBuySpot(grid, area, blocked, rng) {
  const cands = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (grid.get(x, y) !== WALL || blocked.has(key(x, y))) continue;
      const floors = ORTHO.filter(([dx, dy]) => grid.isFloor(x + dx, y + dy) && grid.area[y + dy][x + dx] === area);
      if (floors.length !== 1) continue;
      cands.push({ x, y, facing: DIR_NAME[`${floors[0][0]},${floors[0][1]}`] });
    }
  }
  return cands.length ? cands[Math.floor(rng() * cands.length)] : null;
}

// Two side-by-side floor tiles of `area` with floor to the south, whose removal
// keeps the area connected.
function crateSpot(grid, area, blocked, rng) {
  const tiles = areaTiles(grid, area).sort(() => rng() - 0.5);
  for (const t of tiles) {
    const n = { x: t.x + 1, y: t.y };
    const ok = [t, n].every((q) => grid.isFloor(q.x, q.y) && grid.area[q.y][q.x] === area && grid.isFloor(q.x, q.y + 1) && grid.area[q.y + 1][q.x] === area && !blocked.has(key(q.x, q.y)));
    if (!ok) continue;
    // Prefer spots against a wall so the crate reads as furniture.
    if (grid.isFloor(t.x, t.y - 1) && grid.isFloor(n.x, n.y - 1) && rng() < 0.8) continue;
    const comps = grid.components((x, y) => grid.isFloor(x, y) && grid.area[y][x] === area && !(x === t.x && y === t.y) && !(x === n.x && y === n.y));
    if (comps.length === 1) return [t, n];
  }
  return null;
}

function spawnSpot(grid, windows, doors) {
  const tiles = areaTiles(grid, 0);
  const hazards = [...windows.filter((w) => w.area === 0), ...doors.flatMap((d) => d.tiles)];
  let best = tiles[0];
  let bd = -1;
  for (const t of tiles) {
    let openNeighbours = 0;
    for (const [dx, dy] of ALL8) if (grid.isFloor(t.x + dx, t.y + dy)) openNeighbours++;
    if (openNeighbours < 6) continue;
    let d = Infinity;
    for (const h of hazards) d = Math.min(d, Math.hypot(t.x - h.x, t.y - h.y));
    if (d > bd) {
      bd = d;
      best = t;
    }
  }
  return best;
}

// ---- assemble ----------------------------------------------------------------------

const failures = {};
const fail = (r) => { failures[r] = (failures[r] || 0) + 1; return null; };

function generate(seed) {
  const rng = mulberry32(seed);
  const grid = new Grid();

  let ratio = 0;
  for (const threshold of [0.5, 0.48, 0.52, 0.46, 0.54, 0.44, 0.56]) {
    carveCaves(grid, seed, threshold);
    connectComponents(grid, seed, rng);
    ratio = grid.floorTiles().length / ((W - 4) * (H - 4));
    if (ratio >= FLOOR_RATIO[0] && ratio <= FLOOR_RATIO[1]) break;
  }
  if (ratio < FLOOR_RATIO[0] || ratio > FLOOR_RATIO[1]) return fail('ratio');

  const seeds = pickSeeds(grid.floorTiles(), rng);
  growAreas(grid, seeds);
  if (!ensureLoops(grid, seed, rng)) return fail('loops');
  const sizes = Array.from({ length: AREA_COUNT }, (_, a) => areaTiles(grid, a).length);
  if (Math.min(...sizes) < Math.max(...sizes) * AREA_BALANCE) return fail('balance');

  const adj = adjacency(grid);
  buildBorders(grid);
  if (!dropFragments(grid)) return fail('fragments');

  // Only pairs that still have a legal door spot count as connected.
  const edges = [];
  for (let a = 0; a < AREA_COUNT; a++) {
    for (const b of adj[a]) {
      if (a >= b) continue;
      const { singles } = doorCandidates(grid, a, b);
      if (singles.length) edges.push([a, b]);
    }
  }
  const degree = Array(AREA_COUNT).fill(0);
  for (const [a, b] of edges) {
    degree[a]++;
    degree[b]++;
  }
  if (degree.some((d) => d < 2)) return fail('adjacency');

  const doors = placeDoors(grid, edges, rng);
  if (!doors) return fail('doors');
  const doorTiles = doors.flatMap((d) => d.tiles);
  const blocked = new Set(doorTiles.map((t) => key(t.x, t.y)));

  openVoidPockets(grid, doorTiles);

  const windows = [];
  for (let a = 0; a < AREA_COUNT; a++) {
    const picked = spreadPick(windowCandidates(grid, a, blocked), WINDOWS_PER_AREA, rng);
    if (picked.length < 2) return fail('windows');
    for (const w of picked) {
      windows.push({ ...w, area: a });
      blocked.add(key(w.x, w.y));
    }
  }

  const depth = areaDepths(doors);
  if (depth.some((d) => !Number.isFinite(d))) return fail('depth');
  const deepest = depth.indexOf(Math.max(...depth));

  const crate = crateSpot(grid, deepest, blocked, rng);
  if (!crate) return fail('crate');
  for (const t of crate) blocked.add(key(t.x, t.y));

  const wallBuys = [];
  for (let a = 0; a < AREA_COUNT; a++) {
    if (a === deepest) continue;
    const spot = wallBuySpot(grid, a, blocked, rng);
    if (!spot) return fail('wallbuy');
    blocked.add(key(spot.x, spot.y));
    wallBuys.push({ weapon: WALL_BUY_BY_DEPTH[Math.min(depth[a], WALL_BUY_BY_DEPTH.length - 1)], x: spot.x, y: spot.y, facing: spot.facing });
  }

  const spawn = spawnSpot(grid, windows, doors);

  // Write symbols into a character grid.
  const rows = grid.cells.map((row, y) => row.map((c, x) => (c === FLOOR ? String(grid.area[y][x]) : c)));
  for (const w of windows) rows[w.y][w.x] = 'W';
  for (const t of crate) rows[t.y][t.x] = 'X';
  rows[spawn.y][spawn.x] = 'P';
  const doorData = doors.map((d, i) => {
    const id = DOOR_LETTERS[i];
    for (const t of d.tiles) rows[t.y][t.x] = id;
    const nearer = Math.min(depth[d.areas[0]], depth[d.areas[1]]);
    return { id, price: DOOR_PRICE_BASE + DOOR_PRICE_STEP * nearer };
  });

  const map = {
    rows: rows.map((r) => r.join('')),
    areas: AREA_NAMES.map((name, id) => ({ id, name })),
    doors: doorData,
    wallBuys,
    crate: { facing: 'S' },
  };
  const result = checkMap(map);
  if (result.errors.length) { if (process.env.DEBUG) console.log(result.errors.slice(0, 3)); return fail('check'); }
  return { map, result, ratio, depth };
}

function render(map) {
  return map.rows.join('\n');
}

function toSource(map, seed) {
  const rows = map.rows.map((r) => `    '${r}',`).join('\n');
  const areas = map.areas.map((a) => `    { id: ${a.id}, name: '${a.name}' },`).join('\n');
  const doors = map.doors.map((d) => `    { id: '${d.id}', price: ${d.price} },`).join('\n');
  const buys = map.wallBuys.map((b) => `    { weapon: '${b.weapon}', x: ${b.x}, y: ${b.y}, facing: '${b.facing}' },`).join('\n');
  return `// Pure map data, GENERATED by tools/gen-map.js (seed ${seed}). Do not hand-edit;
// re-run the generator instead. Same legend as map.js: ' ' void, '#' wall,
// 'W' window, digit = area floor, letter = door, 'X' crate, 'P' spawn.

export const MAP = {
  name: 'Caves',
  rows: [
${rows}
  ],

  areas: [
${areas}
  ],

  doors: [
${doors}
  ],

  wallBuys: [
${buys}
  ],

  crate: { facing: 'S' },
};
`;
}

// ---- CLI ------------------------------------------------------------------------------

const DEFAULT_SEED = 20;
const [, , seedArg, flag] = process.argv;
const startSeed = seedArg ? Number(seedArg) : DEFAULT_SEED;
let out = null;
let seed = startSeed;
for (let tries = 0; tries < 200 && !out; tries++, seed++) out = generate(seed);
if (!out) {
  console.error('No valid map found in 200 seeds starting at', startSeed, failures);
  process.exit(1);
}
seed--;
console.log(render(out.map));
console.log(`\nseed ${seed}: floor ratio ${out.ratio.toFixed(2)}, area depths [${out.depth.join(' ')}], ${out.map.doors.length} doors, ${out.result.stats.windows} windows`);
for (const w of out.result.warnings) console.log(`warning: ${w}`);
if (flag !== '--print') {
  const file = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'map-caves.js');
  writeFileSync(file, toSource(out.map, seed));
  console.log(`wrote ${file}`);
}
