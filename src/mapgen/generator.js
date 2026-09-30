// Cave map generator (pure logic, runs in the browser and in Node).
//
// generateMap({ width, height, areas, seed, windowsPerArea, lightsPerArea })
// returns a map definition { rows, areas, doors, lights, name } that
// src/world.js parses, or null when the seed does not produce a valid map.
// Legend for rows: ' ' void, '#' wall, 'W' window, 'N' entrance, digit = floor
// of that area, letter = door, 'P' spawn (floor of area 0).

import { mulberry32, shuffle, pick } from './rng.js';
import { fbm } from './noise.js';
import { checkMap } from './validate.js';

const DOOR_LETTERS = 'ABCDEFGHIJKLMOQRSTUVYZ'; // N, P, W, X are reserved symbols
const AREA_NAMES = ['Entrance', 'Sump', 'Gallery', 'Narrows', 'Grotto', 'Old Mine', 'Vault', 'Cistern', 'Hollow', 'Crypt'];
const MIN_COMPONENT = 10;
const FLOOR_RATIO = [0.4, 0.6];
const AREA_BALANCE = 0.3;
const THRESHOLDS = [0.5, 0.48, 0.52, 0.46, 0.54, 0.44, 0.56];

const VOID = ' ';
const WALL = '#';
const FLOOR = '.';
const ORTHO = [[0, -1], [0, 1], [1, 0], [-1, 0]];
const ALL8 = [...ORTHO, [1, 1], [1, -1], [-1, 1], [-1, -1]];

class Grid {
  constructor(W, H) {
    this.W = W;
    this.H = H;
    this.cells = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => (x === 0 || y === 0 || x === W - 1 || y === H - 1 ? VOID : WALL)));
    this.area = Array.from({ length: H }, () => Array(W).fill(-1));
  }

  key(x, y) {
    return y * this.W + x;
  }

  inInterior(x, y) {
    return x >= 2 && y >= 2 && x <= this.W - 3 && y <= this.H - 3;
  }

  get(x, y) {
    return x < 0 || y < 0 || x >= this.W || y >= this.H ? VOID : this.cells[y][x];
  }

  set(x, y, c) {
    this.cells[y][x] = c;
  }

  isFloor(x, y) {
    return this.get(x, y) === FLOOR;
  }

  floorTiles() {
    const out = [];
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) if (this.isFloor(x, y)) out.push({ x, y });
    return out;
  }

  areaTiles(id) {
    return this.floorTiles().filter((t) => this.area[t.y][t.x] === id);
  }

  // 4-connected components of tiles satisfying pred, largest first.
  components(pred) {
    const seen = new Set();
    const comps = [];
    for (let y = 0; y < this.H; y++) {
      for (let x = 0; x < this.W; x++) {
        if (!pred(x, y) || seen.has(this.key(x, y))) continue;
        const comp = [];
        const stack = [[x, y]];
        seen.add(this.key(x, y));
        while (stack.length) {
          const [cx, cy] = stack.pop();
          comp.push({ x: cx, y: cy });
          for (const [dx, dy] of ORTHO) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= this.W || ny >= this.H || seen.has(this.key(nx, ny)) || !pred(nx, ny)) continue;
            seen.add(this.key(nx, ny));
            stack.push([nx, ny]);
          }
        }
        comps.push(comp);
      }
    }
    return comps.sort((a, b) => b.length - a.length);
  }
}

// ---- caves -------------------------------------------------------------------

function carveCaves(grid, seed, threshold) {
  const { W, H } = grid;
  for (let y = 2; y <= H - 3; y++) {
    for (let x = 2; x <= W - 3; x++) {
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

// Dijkstra through rock with a noise-weighted cost so corridors meander.
function carveCorridor(grid, from, to, seed, rng, allowFloor = () => true) {
  const { W, H } = grid;
  const cost = new Float64Array(W * H).fill(Infinity);
  const prev = new Int32Array(W * H).fill(-1);
  const done = new Uint8Array(W * H);
  const start = grid.key(from.x, from.y);
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
      if (!grid.inInterior(nx, ny)) continue;
      const k = grid.key(nx, ny);
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
  let k = grid.key(to.x, to.y);
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
    if (rng() < 0.25) {
      const [dx, dy] = ORTHO[Math.floor(rng() * 4)];
      const sx = t.x + dx;
      const sy = t.y + dy;
      if (grid.inInterior(sx, sy) && !grid.isFloor(sx, sy)) {
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

// ---- areas -------------------------------------------------------------------

function pickSeeds(tiles, count, rng) {
  const seeds = [pick(tiles, rng)];
  while (seeds.length < count) {
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

function adjacency(grid, count) {
  const adj = Array.from({ length: count }, () => new Set());
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

function ensureLoops(grid, count, seed, rng) {
  for (let iter = 0; iter < count * 2; iter++) {
    const adj = adjacency(grid, count);
    const lonely = adj.findIndex((s) => s.size < Math.min(2, count - 1));
    if (lonely < 0) return true;
    const mine = grid.areaTiles(lonely);
    let target = -1;
    let pair = null;
    let bd = Infinity;
    for (let b = 0; b < count; b++) {
      if (b === lonely || adj[lonely].has(b)) continue;
      const pq = nearestPair(mine, grid.areaTiles(b));
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
  return adjacency(grid, count).every((s) => s.size >= Math.min(2, count - 1));
}

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

function dropFragments(grid, count) {
  for (let a = 0; a < count; a++) {
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

// ---- doors -------------------------------------------------------------------

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
  for (let y = 1; y < grid.H - 1; y++) {
    for (let x = 1; x < grid.W - 1; x++) {
      if (grid.get(x, y) !== WALL) continue;
      const { areas, ok } = neighbourAreas(grid, x, y);
      if (!ok || areas.size !== 2 || !areas.has(a) || !areas.has(b)) continue;
      singles.push({ x, y });
    }
  }
  const singleSet = new Set(singles.map((t) => grid.key(t.x, t.y)));
  const doubles = [];
  for (const t of singles) {
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      const n = { x: t.x + dx, y: t.y + dy };
      if (!singleSet.has(grid.key(n.x, n.y))) continue;
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

function placeDoors(grid, count, edges, rng) {
  const chosen = [];
  const inTree = new Set([0]);
  const shuffled = shuffle(edges, rng);
  let grew = true;
  while (grew && inTree.size < count) {
    grew = false;
    for (const e of shuffled) {
      if (inTree.has(e[0]) !== inTree.has(e[1]) && !chosen.includes(e)) {
        chosen.push(e);
        inTree.add(e[0]);
        inTree.add(e[1]);
        grew = true;
        break;
      }
    }
  }
  if (inTree.size < count) return null;
  const degree = () => {
    const d = Array(count).fill(0);
    for (const [a, b] of chosen) {
      d[a]++;
      d[b]++;
    }
    return d;
  };
  const want = Math.min(2, count - 1);
  for (const e of shuffled) {
    const d = degree();
    if (d.every((n) => n >= want)) break;
    if (!chosen.includes(e) && (d[e[0]] < want || d[e[1]] < want)) chosen.push(e);
  }
  const spare = shuffled.find((e) => !chosen.includes(e));
  if (spare && chosen.length < DOOR_LETTERS.length) chosen.push(spare);

  const doors = [];
  const used = new Set();
  for (const [a, b] of chosen) {
    const { singles, doubles } = doorCandidates(grid, a, b);
    const free = (t) => !used.has(grid.key(t.x, t.y));
    const dbl = doubles.filter((p) => p.every(free));
    const sgl = singles.filter(free);
    let tiles;
    if (dbl.length && rng() < 0.7) tiles = pick(dbl, rng);
    else if (sgl.length) tiles = [pick(sgl, rng)];
    else if (dbl.length) tiles = dbl[0];
    else return null;
    for (const t of tiles) used.add(grid.key(t.x, t.y));
    doors.push({ areas: [a, b], tiles });
  }
  return doors;
}

function areaDepths(doors, count) {
  const depth = Array(count).fill(Infinity);
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

// ---- pockets, windows, entrance, lights ---------------------------------------------

function openVoidPockets(grid, keepSolid) {
  const keep = new Set(keepSolid.map((t) => grid.key(t.x, t.y)));
  const next = grid.cells.map((r) => r.slice());
  for (let y = 1; y < grid.H - 1; y++) {
    for (let x = 1; x < grid.W - 1; x++) {
      if (grid.get(x, y) !== WALL) continue;
      let touches = false;
      for (const [dx, dy] of ALL8) if (grid.isFloor(x + dx, y + dy) || keep.has(grid.key(x + dx, y + dy))) touches = true;
      if (!touches) next[y][x] = VOID;
    }
  }
  grid.cells = next;
}

// Wall tiles with exactly one floor neighbour (of `area`) and void behind.
function openingCandidates(grid, area, blocked, outerOnly = false) {
  const out = [];
  for (let y = 1; y < grid.H - 1; y++) {
    for (let x = 1; x < grid.W - 1; x++) {
      if (grid.get(x, y) !== WALL || blocked.has(grid.key(x, y))) continue;
      if (outerOnly && !(x === 1 || y === 1 || x === grid.W - 2 || y === grid.H - 2)) continue;
      const floors = ORTHO.filter(([dx, dy]) => grid.isFloor(x + dx, y + dy));
      if (floors.length !== 1) continue;
      const [dx, dy] = floors[0];
      if (grid.area[y + dy][x + dx] !== area) continue;
      if (grid.get(x - dx, y - dy) !== VOID) continue;
      if (ORTHO.some(([ox, oy]) => blocked.has(grid.key(x + ox, y + oy)))) continue;
      out.push({ x, y, inside: { x: x + dx, y: y + dy } });
    }
  }
  return out;
}

function spreadPick(cands, n, rng) {
  if (!cands.length) return [];
  const picked = [pick(cands, rng)];
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

function lightSpots(grid, area, count, avoid, rng) {
  const cands = grid.areaTiles(area).filter((t) => {
    if (avoid.has(grid.key(t.x, t.y))) return false;
    let open = 0;
    for (const [dx, dy] of ALL8) if (grid.isFloor(t.x + dx, t.y + dy)) open++;
    return open >= 7;
  });
  return spreadPick(cands, count, rng);
}

// ---- assemble ------------------------------------------------------------------------

export function generateMap({ width, height, areas, seed, windowsPerArea = 2, lightsPerArea = [1, 2], name = 'Caves' }) {
  const rng = mulberry32(seed);
  const grid = new Grid(width, height);
  const count = areas;

  let ratio = 0;
  for (const threshold of THRESHOLDS) {
    carveCaves(grid, seed, threshold);
    connectComponents(grid, seed, rng);
    ratio = grid.floorTiles().length / ((width - 4) * (height - 4));
    if (ratio >= FLOOR_RATIO[0] && ratio <= FLOOR_RATIO[1]) break;
  }
  if (ratio < FLOOR_RATIO[0] || ratio > FLOOR_RATIO[1]) return null;

  const seeds = pickSeeds(grid.floorTiles(), count, rng);
  growAreas(grid, seeds);
  if (!ensureLoops(grid, count, seed, rng)) return null;

  const sizes = Array.from({ length: count }, (_, a) => grid.areaTiles(a).length);
  if (Math.min(...sizes) < Math.max(...sizes) * AREA_BALANCE) return null;

  const adj = adjacency(grid, count);
  buildBorders(grid);
  if (!dropFragments(grid, count)) return null;

  const edges = [];
  for (let a = 0; a < count; a++) {
    for (const b of adj[a]) {
      if (a >= b) continue;
      if (doorCandidates(grid, a, b).singles.length) edges.push([a, b]);
    }
  }
  const degree = Array(count).fill(0);
  for (const [a, b] of edges) {
    degree[a]++;
    degree[b]++;
  }
  if (degree.some((d) => d < Math.min(2, count - 1))) return null;

  const doors = placeDoors(grid, count, edges, rng);
  if (!doors) return null;
  const doorTiles = doors.flatMap((d) => d.tiles);
  const blocked = new Set(doorTiles.map((t) => grid.key(t.x, t.y)));

  openVoidPockets(grid, doorTiles);

  // Entrance: an opening on the outer ring into area 0, spawn just inside.
  const entranceCands = openingCandidates(grid, 0, blocked, true);
  if (!entranceCands.length) return null;
  const entrance = pick(entranceCands, rng);
  blocked.add(grid.key(entrance.x, entrance.y));
  const spawn = entrance.inside;

  const windows = [];
  for (let a = 0; a < count; a++) {
    const cands = openingCandidates(grid, a, blocked).filter((c) => !(c.inside.x === spawn.x && c.inside.y === spawn.y));
    const picked = spreadPick(cands, windowsPerArea, rng);
    if (picked.length < 2) return null;
    for (const w of picked) {
      windows.push({ ...w, area: a });
      blocked.add(grid.key(w.x, w.y));
    }
  }

  const depth = areaDepths(doors, count);
  if (depth.some((d) => !Number.isFinite(d))) return null;

  const lights = [];
  const avoid = new Set([grid.key(spawn.x, spawn.y)]);
  for (let a = 0; a < count; a++) {
    const n = lightsPerArea[0] + Math.floor(rng() * (lightsPerArea[1] - lightsPerArea[0] + 1));
    for (const l of lightSpots(grid, a, n, avoid, rng)) {
      lights.push({ x: l.x, y: l.y, area: a });
      avoid.add(grid.key(l.x, l.y));
    }
  }

  const rows = grid.cells.map((row, y) => row.map((c, x) => (c === FLOOR ? String(grid.area[y][x]) : c)));
  for (const w of windows) rows[w.y][w.x] = 'W';
  rows[entrance.y][entrance.x] = 'N';
  rows[spawn.y][spawn.x] = 'P';
  const doorData = doors.map((d, i) => {
    const id = DOOR_LETTERS[i];
    for (const t of d.tiles) rows[t.y][t.x] = id;
    return { id, price: 0 };
  });

  const map = {
    name,
    rows: rows.map((r) => r.join('')),
    areas: Array.from({ length: count }, (_, id) => ({ id, name: AREA_NAMES[id % AREA_NAMES.length] })),
    doors: doorData,
    lights,
    depth,
  };
  return checkMap(map).errors.length ? null : map;
}

// Tries seeds from `seed` upward until one produces a valid map.
export function generateMapWithRetries(params, maxTries = 200) {
  for (let i = 0; i < maxTries; i++) {
    const map = generateMap({ ...params, seed: params.seed + i });
    if (map) return { map, seed: params.seed + i };
  }
  return null;
}
