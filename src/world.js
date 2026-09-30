// Turns the ASCII map in src/data/map.js into a runtime tile grid with
// areas, doors, windows, wall buys and the crate. No rendering, no gameplay.

import { MAP } from './data/map.js';
import { WEAPONS } from './data/weapons.js';
import { TILE_SIZE, ECONOMY } from './config.js';

export const TILE = { VOID: 0, FLOOR: 1, WALL: 2, WINDOW: 3, DOOR: 4, CRATE: 5 };

const DIRS = [
  { dx: 0, dy: -1, name: 'N' },
  { dx: 0, dy: 1, name: 'S' },
  { dx: 1, dy: 0, name: 'E' },
  { dx: -1, dy: 0, name: 'W' },
];
const DIR_BY_NAME = Object.fromEntries(DIRS.map((d) => [d.name, d]));

export class World {
  constructor(mapData = MAP) {
    this.tileSize = TILE_SIZE;
    this.height = mapData.rows.length;
    this.width = mapData.rows[0].length;
    this.pixelWidth = this.width * this.tileSize;
    this.pixelHeight = this.height * this.tileSize;
    this.version = 0;

    const n = this.width * this.height;
    this.type = new Uint8Array(n);
    this.area = new Int8Array(n).fill(-1);
    this.doorIndex = new Int8Array(n).fill(-1);

    this.areas = mapData.areas.map((a) => ({ ...a, unlocked: a.id === 0, tiles: [], windows: [] }));
    this.doors = mapData.doors.map((d, i) => ({ ...d, index: i, tiles: [], areas: [], open: false }));
    this.windows = [];
    this.wallBuys = [];
    this.crate = null;
    this.playerSpawn = null;

    this.parseTiles(mapData);
    this.deriveDoors();
    this.deriveWindows();
    this.deriveWallBuys(mapData);
    this.deriveCrate(mapData);
  }

  // ---- parsing -----------------------------------------------------------

  parseTiles(mapData) {
    const doorByLetter = new Map(this.doors.map((d) => [d.id, d]));
    const crateTiles = [];
    for (let y = 0; y < this.height; y++) {
      const row = mapData.rows[y];
      for (let x = 0; x < this.width; x++) {
        const ch = row[x];
        const i = this.idx(x, y);
        if (ch === '#') {
          this.type[i] = TILE.WALL;
        } else if (ch === 'W') {
          this.type[i] = TILE.WINDOW;
        } else if (ch === 'X') {
          this.type[i] = TILE.CRATE;
          crateTiles.push({ x, y });
        } else if (ch === 'P') {
          this.type[i] = TILE.FLOOR;
          this.area[i] = 0;
          this.playerSpawn = this.tileCenter(x, y);
          this.areas[0].tiles.push({ x, y });
        } else if (ch >= '0' && ch <= '9') {
          const id = ch.charCodeAt(0) - 48;
          this.type[i] = TILE.FLOOR;
          this.area[i] = id;
          if (this.areas[id]) this.areas[id].tiles.push({ x, y });
        } else if (doorByLetter.has(ch)) {
          const door = doorByLetter.get(ch);
          this.type[i] = TILE.DOOR;
          this.doorIndex[i] = door.index;
          door.tiles.push({ x, y });
        } else {
          this.type[i] = TILE.VOID;
        }
      }
    }
    this.crateTiles = crateTiles;
  }

  deriveDoors() {
    for (const door of this.doors) {
      const areas = new Set();
      let cx = 0;
      let cy = 0;
      for (const t of door.tiles) {
        cx += t.x;
        cy += t.y;
        for (const d of DIRS) {
          const a = this.areaAt(t.x + d.dx, t.y + d.dy);
          if (a >= 0) areas.add(a);
        }
      }
      door.areas = [...areas];
      const c = door.tiles.length || 1;
      door.center = this.tileCenter(cx / c, cy / c);
    }
  }

  deriveWindows() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        if (this.typeAt(x, y) !== TILE.WINDOW) continue;
        const inDir = DIRS.find((d) => this.typeAt(x + d.dx, y + d.dy) === TILE.FLOOR);
        if (!inDir) continue;
        const inside = { x: x + inDir.dx, y: y + inDir.dy };
        const outside = { x: x - inDir.dx, y: y - inDir.dy };
        const area = this.areaAt(inside.x, inside.y);
        const win = {
          x,
          y,
          inside,
          outside,
          area,
          facing: inDir.name,
          insideCenter: this.tileCenter(inside.x, inside.y),
          outsideCenter: this.tileCenter(outside.x, outside.y),
        };
        this.windows.push(win);
        if (this.areas[area]) this.areas[area].windows.push(win);
      }
    }
  }

  deriveWallBuys(mapData) {
    for (const wb of mapData.wallBuys) {
      const dir = DIR_BY_NAME[wb.facing];
      const floor = { x: wb.x + dir.dx, y: wb.y + dir.dy };
      const def = WEAPONS[wb.weapon];
      this.wallBuys.push({
        weaponId: wb.weapon,
        def,
        x: wb.x,
        y: wb.y,
        facing: wb.facing,
        dir,
        area: this.areaAt(floor.x, floor.y),
        center: this.tileCenter(wb.x, wb.y),
        standCenter: this.tileCenter(floor.x, floor.y),
      });
    }
  }

  deriveCrate(mapData) {
    if (!this.crateTiles.length) return;
    const dir = DIR_BY_NAME[mapData.crate.facing];
    let cx = 0;
    let cy = 0;
    for (const t of this.crateTiles) {
      cx += t.x;
      cy += t.y;
    }
    cx /= this.crateTiles.length;
    cy /= this.crateTiles.length;
    const first = this.crateTiles[0];
    this.crate = {
      tiles: this.crateTiles,
      center: this.tileCenter(cx, cy),
      standCenter: this.tileCenter(cx + dir.dx, cy + dir.dy),
      area: this.areaAt(first.x + dir.dx, first.y + dir.dy),
      price: ECONOMY.CRATE_PRICE,
      facing: mapData.crate.facing,
    };
  }

  // ---- queries -----------------------------------------------------------

  idx(x, y) {
    return y * this.width + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  typeAt(x, y) {
    return this.inBounds(x, y) ? this.type[this.idx(x, y)] : TILE.VOID;
  }

  areaAt(x, y) {
    return this.inBounds(x, y) ? this.area[this.idx(x, y)] : -1;
  }

  doorAt(x, y) {
    if (!this.inBounds(x, y)) return null;
    const i = this.doorIndex[this.idx(x, y)];
    return i >= 0 ? this.doors[i] : null;
  }

  // Solid for movement of players, zombies and thrown objects.
  isSolid(x, y) {
    const t = this.typeAt(x, y);
    if (t === TILE.FLOOR) return false;
    if (t === TILE.DOOR) return !this.doorAt(x, y).open;
    return true;
  }

  isWalkable(x, y) {
    return !this.isSolid(x, y);
  }

  // Bullets fly over void and through windows but stop at walls/closed doors.
  blocksBullets(x, y) {
    const t = this.typeAt(x, y);
    if (t === TILE.WALL || t === TILE.CRATE) return true;
    if (t === TILE.DOOR) return !this.doorAt(x, y).open;
    return false;
  }

  isSolidAtPoint(wx, wy) {
    return this.isSolid(Math.floor(wx / this.tileSize), Math.floor(wy / this.tileSize));
  }

  worldToTile(wx, wy) {
    return { x: Math.floor(wx / this.tileSize), y: Math.floor(wy / this.tileSize) };
  }

  tileCenter(x, y) {
    return { x: (x + 0.5) * this.tileSize, y: (y + 0.5) * this.tileSize };
  }

  areaAtPoint(wx, wy) {
    const t = this.worldToTile(wx, wy);
    return this.areaAt(t.x, t.y);
  }

  isAreaUnlocked(id) {
    return id >= 0 && this.areas[id] && this.areas[id].unlocked;
  }

  activeWindows() {
    return this.windows.filter((w) => this.isAreaUnlocked(w.area));
  }

  // ---- mutation ----------------------------------------------------------

  openDoor(door) {
    if (door.open) return;
    door.open = true;
    for (const a of door.areas) this.areas[a].unlocked = true;
    this.version++;
  }
}
