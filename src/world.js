// Turns a generated map definition into a runtime tile grid with areas,
// doors, windows, the entrance and lights. No rendering, no gameplay.

import { TILE_SIZE, LIGHTING } from './config.js';

export const TILE = { VOID: 0, FLOOR: 1, WALL: 2, WINDOW: 3, DOOR: 4, ENTRANCE: 5 };

const DIRS = [
  { dx: 0, dy: -1, name: 'N' },
  { dx: 0, dy: 1, name: 'S' },
  { dx: 1, dy: 0, name: 'E' },
  { dx: -1, dy: 0, name: 'W' },
];

export class World {
  constructor(mapData) {
    this.name = mapData.name || 'Map';
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
    this.windowIndex = new Int16Array(n).fill(-1);

    this.areas = mapData.areas.map((a) => ({ ...a, tiles: [], windows: [] }));
    this.doors = mapData.doors.map((d, i) => ({ ...d, index: i, tiles: [], areas: [], open: false }));
    this.windows = [];
    this.lights = [];
    this.entrance = null;
    this.playerSpawn = null;

    this.parseTiles(mapData);
    this.deriveDoors();
    this.deriveOpenings();
    this.deriveLights(mapData);
  }

  // ---- parsing -----------------------------------------------------------

  parseTiles(mapData) {
    const doorByLetter = new Map(this.doors.map((d) => [d.id, d]));
    for (let y = 0; y < this.height; y++) {
      const row = mapData.rows[y];
      for (let x = 0; x < this.width; x++) {
        const ch = row[x];
        const i = this.idx(x, y);
        if (ch === '#') {
          this.type[i] = TILE.WALL;
        } else if (ch === 'W') {
          this.type[i] = TILE.WINDOW;
        } else if (ch === 'N') {
          this.type[i] = TILE.ENTRANCE;
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

  deriveOpenings() {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const t = this.typeAt(x, y);
        if (t !== TILE.WINDOW && t !== TILE.ENTRANCE) continue;
        const inDir = DIRS.find((d) => this.typeAt(x + d.dx, y + d.dy) === TILE.FLOOR);
        if (!inDir) continue;
        const inside = { x: x + inDir.dx, y: y + inDir.dy };
        const outside = { x: x - inDir.dx, y: y - inDir.dy };
        const opening = {
          x,
          y,
          inside,
          outside,
          area: this.areaAt(inside.x, inside.y),
          facing: inDir.name,
          center: this.tileCenter(x, y),
          insideCenter: this.tileCenter(inside.x, inside.y),
          outsideCenter: this.tileCenter(outside.x, outside.y),
        };
        if (t === TILE.ENTRANCE) {
          this.entrance = opening;
        } else {
          opening.index = this.windows.length;
          opening.boarded = false;
          this.windowIndex[this.idx(x, y)] = opening.index;
          this.windows.push(opening);
          if (this.areas[opening.area]) this.areas[opening.area].windows.push(opening);
        }
      }
    }
  }

  deriveLights(mapData) {
    this.lights = (mapData.lights || []).map((l, index) => ({
      index,
      tx: l.x,
      ty: l.y,
      area: l.area,
      ...this.tileCenter(l.x, l.y),
      radius: LIGHTING.LIGHT_RADIUS,
      lightRadius: LIGHTING.ROOM_LIGHT_RADIUS,
      hp: LIGHTING.LIGHT_HEALTH,
      on: false,
      broken: false,
    }));
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

  windowAt(x, y) {
    if (!this.inBounds(x, y)) return null;
    const i = this.windowIndex[this.idx(x, y)];
    return i >= 0 ? this.windows[i] : null;
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

  // Bullets fly over void and through open windows but stop at walls,
  // closed doors and boarded windows.
  blocksBullets(x, y) {
    const t = this.typeAt(x, y);
    if (t === TILE.WALL || t === TILE.ENTRANCE) return true;
    if (t === TILE.DOOR) return !this.doorAt(x, y).open;
    if (t === TILE.WINDOW) return this.windowAt(x, y).boarded;
    return false;
  }

  // Light stops at anything solid, including windows and void edges.
  blocksLight(x, y) {
    const t = this.typeAt(x, y);
    if (t === TILE.FLOOR) return false;
    if (t === TILE.DOOR) return !this.doorAt(x, y).open;
    return true;
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

  activeWindows() {
    return this.windows.filter((w) => !w.boarded);
  }

  // ---- mutation ----------------------------------------------------------

  openDoor(door) {
    if (door.open) return;
    door.open = true;
    this.version++;
  }

  boardWindow(win) {
    if (win.boarded) return;
    win.boarded = true;
    this.version++;
  }
}
