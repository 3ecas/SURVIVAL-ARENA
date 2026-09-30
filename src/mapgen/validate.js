// Structural validation of a map definition (the same object World parses).
// Returns { errors, warnings, stats }. Used by the generator to reject bad
// seeds and by tools/check-map.js.

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

  // 1. grid shape and symbols
  rows.forEach((row, y) => {
    if (row.length !== W) fail(`Row ${y} has length ${row.length}, expected ${W}`);
    for (let x = 0; x < row.length; x++) {
      const c = row[x];
      const known = c === ' ' || c === '#' || c === 'W' || c === 'N' || isFloor(c) || isDoor(c);
      if (!known) fail(`Unknown symbol '${c}' at (${x}, ${y})`);
      if (isFloor(c) && !areaIds.has(areaOf(c))) fail(`Floor tile at (${x}, ${y}) uses undefined area ${areaOf(c)}`);
    }
  });
  for (let x = 0; x < W; x++) if (at(x, 0) !== ' ' || at(x, H - 1) !== ' ') fail(`Top/bottom border must be void (column ${x})`);
  for (let y = 0; y < H; y++) if (at(0, y) !== ' ' || at(W - 1, y) !== ' ') fail(`Left/right border must be void (row ${y})`);

  // 2. player spawn and entrance
  const spawns = [];
  const entrances = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (at(x, y) === 'P') spawns.push({ x, y });
      if (at(x, y) === 'N') entrances.push({ x, y });
    }
  }
  if (spawns.length !== 1) fail(`Expected exactly one player spawn 'P', found ${spawns.length}`);
  if (entrances.length !== 1) fail(`Expected exactly one entrance 'N', found ${entrances.length}`);
  if (spawns.length === 1 && entrances.length === 1) {
    const e = entrances[0];
    const insides = ORTHO.filter(([dx, dy]) => isFloor(at(e.x + dx, e.y + dy)));
    if (insides.length !== 1) fail(`Entrance at (${e.x}, ${e.y}) must touch exactly one floor tile, touches ${insides.length}`);
    else {
      const [dx, dy] = insides[0];
      if (at(e.x - dx, e.y - dy) !== ' ') fail(`Entrance at (${e.x}, ${e.y}) needs void behind it`);
      if (areaOf(at(e.x + dx, e.y + dy)) !== 0) fail('Entrance must open into area 0');
      if (Math.abs(spawns[0].x - e.x) + Math.abs(spawns[0].y - e.y) !== 1) fail('Spawn must be the tile just inside the entrance');
    }
  }

  // 3. areas contiguous
  function flood(startX, startY, passable) {
    const seen = new Set([`${startX},${startY}`]);
    const stack = [[startX, startY]];
    while (stack.length) {
      const [x, y] = stack.pop();
      for (const [dx, dy] of ORTHO) {
        const nx = x + dx;
        const ny = y + dy;
        const k = `${nx},${ny}`;
        if (seen.has(k) || !passable(at(nx, ny), nx, ny)) continue;
        seen.add(k);
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
    if (region.size !== tiles.length) fail(`Area ${a.id} (${a.name}) is split into disconnected parts`);
  }

  // 4. doors
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
    const touched = new Set();
    for (const t of tiles) {
      for (const [dx, dy] of ORTHO) {
        const c = at(t.x + dx, t.y + dy);
        if (isFloor(c)) touched.add(areaOf(c));
        else if (c !== '#' && c !== d.id) fail(`Door ${d.id} tile (${t.x}, ${t.y}) touches '${c}', expected wall, floor or the same door`);
      }
    }
    if (touched.size !== 2) fail(`Door ${d.id} must join exactly two areas, joins [${[...touched].join(', ')}]`);
    else {
      const [a, b] = [...touched];
      areaGraph.get(a).push({ to: b, door: d });
      areaGraph.get(b).push({ to: a, door: d });
    }
  }
  for (const letter of doorTiles.keys()) if (!MAP.doors.some((d) => d.id === letter)) fail(`Door tile '${letter}' has no entry in MAP.doors`);

  // 5. reachability
  {
    const seen = new Set([0]);
    const queue = [0];
    while (queue.length) {
      const a = queue.shift();
      for (const e of areaGraph.get(a) || []) {
        if (seen.has(e.to)) continue;
        seen.add(e.to);
        queue.push(e.to);
      }
    }
    for (const a of MAP.areas) {
      if (!seen.has(a.id)) fail(`Area ${a.id} (${a.name}) is not reachable from the start area through doors`);
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

  // 6. windows
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

  // 7. lights sit on open floor tiles, at most one per tile
  const lightKeys = new Set();
  for (const l of MAP.lights || []) {
    if (!isFloor(at(l.x, l.y))) fail(`Light at (${l.x}, ${l.y}) is not on a floor tile`);
    const floorAround = ORTHO.filter(([dx, dy]) => isFloor(at(l.x + dx, l.y + dy)));
    if (floorAround.length < 3) fail(`Light at (${l.x}, ${l.y}) is not on open floor`);
    if (lightKeys.has(`${l.x},${l.y}`)) fail(`Two lights at (${l.x}, ${l.y})`);
    lightKeys.add(`${l.x},${l.y}`);
    if (spawns.length === 1 && spawns[0].x === l.x && spawns[0].y === l.y) fail('Light placed on the spawn tile');
  }
  const lightCount = (MAP.lights || []).length;

  const stats = {
    width: W,
    height: H,
    areas: MAP.areas.length,
    doors: MAP.doors.length,
    windows: [...windowsByArea.values()].reduce((a, b) => a + b, 0),
    lights: lightCount,
    floorTiles: [...tilesByArea.values()].reduce((a, t) => a + t.length, 0),
  };
  return { errors, warnings, stats };
}
