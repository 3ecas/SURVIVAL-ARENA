// Architectural map generator (pure logic, runs in the browser and in Node).
//
// A building is split into rectangular rooms with a BSP; straight walls, 2-tile
// doors, courtyards (void) inside the building and the outside around it give
// every area windows for zombies to climb through. Rooms are grouped into
// areas; rooms of one area are joined by open gaps, areas by doors.
//
// generateMap({ width, height, areas, seed, windowsPerArea, lightsPerArea })
// returns { rows, areas, doors, lights, name, depth } or null for a bad seed.
// Legend for rows: ' ' void, '#' wall, 'W' window, 'N' entrance, digit = floor
// of that area, letter = door, 'P' spawn (floor of area 0).

import { mulberry32, shuffle, pick } from './rng.js';
import { checkMap } from './validate.js';

const DOOR_LETTERS = 'ABCDEFGHIJKLMOQRSTUVYZ'; // N, P, W, X are reserved symbols
const AREA_NAMES = ['Lobby', 'East Wing', 'Storage', 'Workshop', 'Ward', 'Archive', 'Boiler Room', 'Gallery', 'Vault', 'Annex'];
const MIN_ROOM = 4;
const MAX_ROOM = 14;
const SPLIT_CHANCE = 0.45;
const COURTYARD_SHARE = 0.2;
const OPENING_EXTRA_CHANCE = 0.5;
const PILLAR_MIN_ROOM = 6;
const PILLAR_CHANCE = 0.7;

const VOID = ' ';
const WALL = '#';
const FLOOR = '.';
const ORTHO = [[0, -1], [0, 1], [1, 0], [-1, 0]];
const ALL8 = [...ORTHO, [1, 1], [1, -1], [-1, 1], [-1, -1]];

// ---- BSP rooms ---------------------------------------------------------------

function splitRooms(rect, rng, out) {
  const w = rect.x1 - rect.x0 + 1;
  const h = rect.y1 - rect.y0 + 1;
  const canSplitX = w >= MIN_ROOM * 2 + 1;
  const canSplitY = h >= MIN_ROOM * 2 + 1;
  const must = w > MAX_ROOM || h > MAX_ROOM;
  if ((!canSplitX && !canSplitY) || (!must && rng() > SPLIT_CHANCE)) {
    out.push(rect);
    return;
  }
  let vertical;
  if (canSplitX && canSplitY) vertical = w > h ? true : w < h ? false : rng() < 0.5;
  else vertical = canSplitX;
  if (vertical) {
    const p = rect.x0 + MIN_ROOM + Math.floor(rng() * (w - MIN_ROOM * 2 - 1 + 1));
    splitRooms({ x0: rect.x0, y0: rect.y0, x1: p - 1, y1: rect.y1 }, rng, out);
    splitRooms({ x0: p + 1, y0: rect.y0, x1: rect.x1, y1: rect.y1 }, rng, out);
  } else {
    const p = rect.y0 + MIN_ROOM + Math.floor(rng() * (h - MIN_ROOM * 2 - 1 + 1));
    splitRooms({ x0: rect.x0, y0: rect.y0, x1: rect.x1, y1: p - 1 }, rng, out);
    splitRooms({ x0: rect.x0, y0: p + 1, x1: rect.x1, y1: rect.y1 }, rng, out);
  }
}

// Shared wall segment between two rooms, or null. Returns the wall tiles.
function sharedWall(a, b) {
  if (a.x1 + 2 === b.x0 || b.x1 + 2 === a.x0) {
    const x = a.x1 + 2 === b.x0 ? a.x1 + 1 : b.x1 + 1;
    const y0 = Math.max(a.y0, b.y0);
    const y1 = Math.min(a.y1, b.y1);
    if (y1 - y0 + 1 < 2) return null;
    return Array.from({ length: y1 - y0 + 1 }, (_, i) => ({ x, y: y0 + i, vertical: true }));
  }
  if (a.y1 + 2 === b.y0 || b.y1 + 2 === a.y0) {
    const y = a.y1 + 2 === b.y0 ? a.y1 + 1 : b.y1 + 1;
    const x0 = Math.max(a.x0, b.x0);
    const x1 = Math.min(a.x1, b.x1);
    if (x1 - x0 + 1 < 2) return null;
    return Array.from({ length: x1 - x0 + 1 }, (_, i) => ({ x: x0 + i, y, vertical: false }));
  }
  return null;
}

function roomCenter(r) {
  return { x: Math.floor((r.x0 + r.x1) / 2), y: Math.floor((r.y0 + r.y1) / 2) };
}

function roomTouchesBorder(r, W, H) {
  return r.x0 === 2 || r.y0 === 2 || r.x1 === W - 3 || r.y1 === H - 3;
}

function connectedRooms(roomIds, adj) {
  if (!roomIds.length) return false;
  const seen = new Set([roomIds[0]]);
  const stack = [roomIds[0]];
  const allowed = new Set(roomIds);
  while (stack.length) {
    const r = stack.pop();
    for (const n of adj[r]) {
      if (!allowed.has(n) || seen.has(n)) continue;
      seen.add(n);
      stack.push(n);
    }
  }
  return seen.size === roomIds.length;
}

// Multi-source BFS over the room graph, one source per area.
function groupRooms(rooms, adj, seeds) {
  const areaOf = new Map();
  const queue = [];
  seeds.forEach((r, i) => {
    areaOf.set(r, i);
    queue.push(r);
  });
  let head = 0;
  while (head < queue.length) {
    const r = queue[head++];
    for (const n of adj[r]) {
      if (areaOf.has(n)) continue;
      areaOf.set(n, areaOf.get(r));
      queue.push(n);
    }
  }
  return areaOf;
}

function farthestRooms(roomIds, rooms, count, first, rng) {
  const seeds = [first];
  const dist = (a, b) => {
    const ca = roomCenter(rooms[a]);
    const cb = roomCenter(rooms[b]);
    return Math.hypot(ca.x - cb.x, ca.y - cb.y);
  };
  while (seeds.length < count && seeds.length < roomIds.length) {
    let best = null;
    let bd = -1;
    for (const r of shuffle(roomIds, rng)) {
      if (seeds.includes(r)) continue;
      let d = Infinity;
      for (const s of seeds) d = Math.min(d, dist(r, s));
      if (d > bd) {
        bd = d;
        best = r;
      }
    }
    seeds.push(best);
  }
  return seeds;
}

// ---- grid helpers ----------------------------------------------------------------

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

  get(x, y) {
    return x < 0 || y < 0 || x >= this.W || y >= this.H ? VOID : this.cells[y][x];
  }

  set(x, y, c) {
    this.cells[y][x] = c;
  }

  isFloor(x, y) {
    return this.get(x, y) === FLOOR;
  }

  fillRect(r, c, area = -1) {
    for (let y = r.y0; y <= r.y1; y++) {
      for (let x = r.x0; x <= r.x1; x++) {
        this.set(x, y, c);
        this.area[y][x] = area;
      }
    }
  }
}

// A wall tile with floor on exactly two opposite sides and wall/void on the
// other two: what both doors and openings need.
function passableWallTile(grid, t) {
  const n = grid.get(t.x, t.y - 1);
  const s = grid.get(t.x, t.y + 1);
  const e = grid.get(t.x + 1, t.y);
  const w = grid.get(t.x - 1, t.y);
  if (t.vertical) return e === FLOOR && w === FLOOR && n !== FLOOR && s !== FLOOR;
  return n === FLOOR && s === FLOOR && e !== FLOOR && w !== FLOOR;
}

// Picks `width` consecutive tiles on a wall segment, away from its ends and
// from tiles already used, or null.
function pickGap(segment, width, used, rng) {
  const options = [];
  for (let i = 0; i + width <= segment.length; i++) {
    const slice = segment.slice(i, i + width);
    const ok = slice.every((t) => !used.has(`${t.x},${t.y}`));
    // Keep one wall tile between gaps and segment ends when the segment allows it.
    const margin = segment.length >= width + 2 ? 1 : 0;
    if (ok && i >= margin && i + width <= segment.length - margin) options.push(slice);
  }
  return options.length ? pick(options, rng) : null;
}

// ---- assemble ------------------------------------------------------------------------

export function generateMap({ width, height, areas, seed, windowsPerArea = 2, lightsPerArea = [1, 2], name = 'Building' }) {
  const rng = mulberry32(seed);
  const W = width;
  const H = height;
  const grid = new Grid(W, H);

  // 1. rooms
  const rooms = [];
  splitRooms({ x0: 2, y0: 2, x1: W - 3, y1: H - 3 }, rng, rooms);
  if (rooms.length < 4) return null;
  const adj = rooms.map(() => []);
  const walls = new Map(); // "a,b" -> shared wall tiles
  for (let a = 0; a < rooms.length; a++) {
    for (let b = a + 1; b < rooms.length; b++) {
      const seg = sharedWall(rooms[a], rooms[b]);
      if (!seg) continue;
      adj[a].push(b);
      adj[b].push(a);
      walls.set(`${a},${b}`, seg);
    }
  }

  // 2. entrance room and courtyards
  const borderRooms = rooms.map((r, i) => i).filter((i) => roomTouchesBorder(rooms[i], W, H));
  if (!borderRooms.length) return null;
  const entranceRoom = pick(borderRooms, rng);
  const courtyardCount = Math.round(rooms.length * COURTYARD_SHARE);
  const candidates = shuffle(rooms.map((r, i) => i).filter((i) => i !== entranceRoom), rng);
  const courtyards = new Set();
  for (const c of candidates) {
    if (courtyards.size >= courtyardCount) break;
    const remaining = rooms.map((r, i) => i).filter((i) => i !== c && !courtyards.has(i));
    if (connectedRooms(remaining, adj)) courtyards.add(c);
  }
  const roomIds = rooms.map((r, i) => i).filter((i) => !courtyards.has(i));
  const roomAdj = adj.map((list, i) => (courtyards.has(i) ? [] : list.filter((n) => !courtyards.has(n))));

  // 3. group rooms into areas
  const areaCount = Math.min(areas, roomIds.length);
  const seeds = farthestRooms(roomIds, rooms, areaCount, entranceRoom, rng);
  const areaOf = groupRooms(rooms, roomAdj, seeds);
  if (roomIds.some((r) => !areaOf.has(r))) return null;

  // 4. lay floor and walls
  for (const i of roomIds) grid.fillRect(rooms[i], FLOOR, areaOf.get(i));
  for (const c of courtyards) grid.fillRect(rooms[c], VOID);

  // 5. openings inside areas, doors between areas
  const used = new Set();
  const markUsed = (tiles) => {
    for (const t of tiles) {
      used.add(`${t.x},${t.y}`);
      for (const [dx, dy] of ORTHO) used.add(`${t.x + dx},${t.y + dy}`);
    }
  };
  const areaPairs = new Map(); // "a,b" -> [[roomA, roomB], ...]
  for (const [key, seg] of walls) {
    const [a, b] = key.split(',').map(Number);
    if (courtyards.has(a) || courtyards.has(b)) continue;
    const aa = areaOf.get(a);
    const ab = areaOf.get(b);
    if (aa === ab) continue;
    const k = aa < ab ? `${aa},${ab}` : `${ab},${aa}`;
    if (!areaPairs.has(k)) areaPairs.set(k, []);
    areaPairs.get(k).push(seg);
  }

  // Openings: spanning tree of rooms inside each area plus random extras.
  for (let area = 0; area < areaCount; area++) {
    const mine = roomIds.filter((r) => areaOf.get(r) === area);
    const inTree = new Set([mine[0]]);
    const pairs = [];
    for (const a of mine) for (const b of roomAdj[a]) if (a < b && areaOf.get(b) === area) pairs.push([a, b]);
    const order = shuffle(pairs, rng);
    let grew = true;
    const chosen = [];
    while (grew) {
      grew = false;
      for (const p of order) {
        if (inTree.has(p[0]) !== inTree.has(p[1]) && !chosen.includes(p)) {
          chosen.push(p);
          inTree.add(p[0]);
          inTree.add(p[1]);
          grew = true;
        }
      }
    }
    if (inTree.size !== mine.length) return null;
    for (const p of order) if (!chosen.includes(p) && rng() < OPENING_EXTRA_CHANCE) chosen.push(p);
    for (const [a, b] of chosen) {
      const seg = walls.get(`${a},${b}`);
      const gapWidth = Math.min(seg.length, 2 + Math.floor(rng() * 2));
      const gap = pickGap(seg, gapWidth, used, rng);
      if (!gap) return null;
      for (const t of gap) {
        grid.set(t.x, t.y, FLOOR);
        grid.area[t.y][t.x] = area;
      }
      markUsed(gap);
    }
  }

  // Doors: spanning tree over areas plus loop edges so each area has two.
  const edges = [...areaPairs.keys()].map((k) => k.split(',').map(Number));
  const inTree = new Set([0]);
  const chosenEdges = [];
  const order = shuffle(edges, rng);
  let grew = true;
  while (grew) {
    grew = false;
    for (const e of order) {
      if (inTree.has(e[0]) !== inTree.has(e[1]) && !chosenEdges.includes(e)) {
        chosenEdges.push(e);
        inTree.add(e[0]);
        inTree.add(e[1]);
        grew = true;
      }
    }
  }
  if (inTree.size !== areaCount) return null;
  const degree = () => {
    const d = Array(areaCount).fill(0);
    for (const [a, b] of chosenEdges) {
      d[a]++;
      d[b]++;
    }
    return d;
  };
  const want = Math.min(2, areaCount - 1);
  for (const e of order) {
    const d = degree();
    if (d.every((n) => n >= want)) break;
    if (!chosenEdges.includes(e) && (d[e[0]] < want || d[e[1]] < want)) chosenEdges.push(e);
  }
  const spare = order.find((e) => !chosenEdges.includes(e));
  if (spare && chosenEdges.length < DOOR_LETTERS.length) chosenEdges.push(spare);

  const doors = [];
  for (const [a, b] of chosenEdges) {
    const segs = shuffle(areaPairs.get(`${a},${b}`), rng);
    let placed = null;
    for (const seg of segs) {
      const gap = pickGap(seg, Math.min(2, seg.length), used, rng);
      if (gap && gap.every((t) => passableWallTile(grid, t))) {
        placed = gap;
        break;
      }
    }
    if (!placed) return null;
    markUsed(placed);
    doors.push({ areas: [a, b], tiles: placed });
  }

  // 6. pillars for cover in big rooms
  for (const i of roomIds) {
    const r = rooms[i];
    const w = r.x1 - r.x0 + 1;
    const h = r.y1 - r.y0 + 1;
    if (w < PILLAR_MIN_ROOM || h < PILLAR_MIN_ROOM || rng() > PILLAR_CHANCE) continue;
    const c = roomCenter(r);
    const count = 1 + Math.floor(rng() * 2);
    for (let n = 0; n < count; n++) {
      const size = rng() < 0.5 ? 1 : 2;
      const px = r.x0 + 2 + Math.floor(rng() * (w - 4 - size + 1));
      const py = r.y0 + 2 + Math.floor(rng() * (h - 4 - size + 1));
      let clear = true;
      for (let y = py - 1; y <= py + size; y++) for (let x = px - 1; x <= px + size; x++) if ((x === c.x && y === c.y) || !grid.isFloor(x, y)) clear = false;
      if (!clear) continue;
      for (let y = py; y < py + size; y++) for (let x = px; x < px + size; x++) {
        grid.set(x, y, WALL);
        grid.area[y][x] = -1;
      }
    }
  }

  // 7. entrance on the outer ring next to the entrance room
  const doorKeys = new Set(doors.flatMap((d) => d.tiles.map((t) => `${t.x},${t.y}`)));
  const nearDoor = (x, y) => ORTHO.some(([dx, dy]) => doorKeys.has(`${x + dx},${y + dy}`));
  const openingTiles = (area, outerOnly) => {
    const out = [];
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        if (grid.get(x, y) !== WALL || used.has(`${x},${y}`) || nearDoor(x, y)) continue;
        if (outerOnly && !(x === 1 || y === 1 || x === W - 2 || y === H - 2)) continue;
        const floors = ORTHO.filter(([dx, dy]) => grid.isFloor(x + dx, y + dy));
        if (floors.length !== 1) continue;
        const [dx, dy] = floors[0];
        if (grid.area[y + dy][x + dx] !== area || grid.get(x - dx, y - dy) !== VOID) continue;
        out.push({ x, y, inside: { x: x + dx, y: y + dy } });
      }
    }
    return out;
  };
  const entranceCands = openingTiles(0, true).filter((t) => {
    const r = rooms[entranceRoom];
    return t.inside.x >= r.x0 && t.inside.x <= r.x1 && t.inside.y >= r.y0 && t.inside.y <= r.y1;
  });
  if (!entranceCands.length) return null;
  const entrance = pick(entranceCands, rng);
  const spawn = entrance.inside;
  markUsed([entrance]);

  // 8. windows, spread along each area's outside/courtyard walls
  const windows = [];
  for (let area = 0; area < areaCount; area++) {
    const cands = openingTiles(area, false).filter((c) => !(c.inside.x === spawn.x && c.inside.y === spawn.y));
    const picked = [];
    while (picked.length < windowsPerArea && cands.length) {
      let best = null;
      let bd = -1;
      for (const c of cands) {
        let d = Infinity;
        for (const p of picked) d = Math.min(d, Math.hypot(c.x - p.x, c.y - p.y));
        if (picked.length === 0) d = rng();
        if (d > bd) {
          bd = d;
          best = c;
        }
      }
      picked.push(best);
      cands.splice(cands.indexOf(best), 1);
      for (let i = cands.length - 1; i >= 0; i--) if (Math.abs(cands[i].x - best.x) + Math.abs(cands[i].y - best.y) <= 1) cands.splice(i, 1);
    }
    if (picked.length < 2) return null;
    for (const w of picked) windows.push({ ...w, area });
  }

  // 9. lights at room centres
  const lights = [];
  for (let area = 0; area < areaCount; area++) {
    const mine = roomIds.filter((r) => areaOf.get(r) === area).sort((a, b) => roomSize(rooms[b]) - roomSize(rooms[a]));
    const n = lightsPerArea[0] + Math.floor(rng() * (lightsPerArea[1] - lightsPerArea[0] + 1));
    for (const r of mine.slice(0, n)) {
      const c = roomCenter(rooms[r]);
      if (!grid.isFloor(c.x, c.y) || (c.x === spawn.x && c.y === spawn.y)) continue;
      let open = 0;
      for (const [dx, dy] of ORTHO) if (grid.isFloor(c.x + dx, c.y + dy)) open++;
      if (open >= 3) lights.push({ x: c.x, y: c.y, area });
    }
  }

  // 10. depth and output
  const depth = Array(areaCount).fill(Infinity);
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
    areas: Array.from({ length: areaCount }, (_, id) => ({ id, name: AREA_NAMES[id % AREA_NAMES.length] })),
    doors: doorData,
    lights,
    depth,
    rooms: roomIds.length,
  };
  return checkMap(map).errors.length ? null : map;
}

function roomSize(r) {
  return (r.x1 - r.x0 + 1) * (r.y1 - r.y0 + 1);
}

// Tries seeds from `seed` upward until one produces a valid map.
export function generateMapWithRetries(params, maxTries = 300) {
  for (let i = 0; i < maxTries; i++) {
    const map = generateMap({ ...params, seed: params.seed + i });
    if (map) return { map, seed: params.seed + i };
  }
  return null;
}
