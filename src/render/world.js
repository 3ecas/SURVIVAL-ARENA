// Draws the static map into an offscreen canvas (rebuilt when a door opens
// or a window is boarded).

import { COLORS } from '../config.js';
import { TILE } from '../world.js';

export class WorldRenderer {
  constructor(world) {
    this.world = world;
    this.cache = document.createElement('canvas');
    this.cache.width = world.pixelWidth;
    this.cache.height = world.pixelHeight;
    this.cachedVersion = -1;
  }

  draw(ctx, game, camera) {
    if (this.cachedVersion !== this.world.version) {
      this.rebuild();
      this.cachedVersion = this.world.version;
    }
    const b = camera.bounds();
    const sx = Math.max(0, Math.floor(b.left));
    const sy = Math.max(0, Math.floor(b.top));
    const sw = Math.min(this.cache.width, Math.ceil(b.right)) - sx;
    const sh = Math.min(this.cache.height, Math.ceil(b.bottom)) - sy;
    if (sw > 0 && sh > 0) ctx.drawImage(this.cache, sx, sy, sw, sh, sx, sy, sw, sh);
  }

  rebuild() {
    const ctx = this.cache.getContext('2d');
    const world = this.world;
    const ts = world.tileSize;
    ctx.fillStyle = COLORS.VOID;
    ctx.fillRect(0, 0, this.cache.width, this.cache.height);

    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const t = world.typeAt(x, y);
        const px = x * ts;
        const py = y * ts;
        if (t === TILE.FLOOR) drawFloor(ctx, px, py, ts, world.areaAt(x, y));
        else if (t === TILE.WALL) drawWall(ctx, px, py, ts);
        else if (t === TILE.WINDOW) drawWindow(ctx, px, py, ts, world.windowAt(x, y));
        else if (t === TILE.ENTRANCE) drawEntrance(ctx, px, py, ts);
        else if (t === TILE.DOOR) drawDoorTile(ctx, px, py, ts, world.doorAt(x, y));
      }
    }
  }
}

function drawFloor(ctx, px, py, ts, area) {
  ctx.fillStyle = COLORS.FLOOR_BY_AREA[area % COLORS.FLOOR_BY_AREA.length];
  ctx.fillRect(px, py, ts, ts);
  ctx.strokeStyle = COLORS.FLOOR_GRID;
  ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
}

function drawWall(ctx, px, py, ts) {
  ctx.fillStyle = COLORS.WALL;
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = COLORS.WALL_EDGE;
  ctx.fillRect(px, py, ts, 3);
}

function drawWindow(ctx, px, py, ts, win) {
  ctx.fillStyle = COLORS.WINDOW_FRAME;
  ctx.fillRect(px, py, ts, ts);
  if (win && win.boarded) {
    // Boarded: two crossed planks plus a bar.
    ctx.strokeStyle = COLORS.WINDOW_BOARDED;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(px + 5, py + 5);
    ctx.lineTo(px + ts - 5, py + ts - 5);
    ctx.moveTo(px + ts - 5, py + 5);
    ctx.lineTo(px + 5, py + ts - 5);
    ctx.stroke();
    ctx.fillStyle = COLORS.WINDOW_BOARDED;
    ctx.fillRect(px + 3, py + ts / 2 - 3, ts - 6, 6);
    return;
  }
  ctx.fillStyle = COLORS.WINDOW_PLANK;
  const plank = ts / 7;
  for (let i = 0; i < 3; i++) ctx.fillRect(px + 4, py + plank * (1 + i * 2), ts - 8, plank);
}

function drawEntrance(ctx, px, py, ts) {
  ctx.fillStyle = COLORS.ENTRANCE;
  ctx.fillRect(px, py, ts, ts);
  ctx.strokeStyle = COLORS.ENTRANCE_EDGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 3, py + 3, ts - 6, ts - 6);
  ctx.beginPath();
  ctx.moveTo(px + ts / 2, py + 8);
  ctx.lineTo(px + ts / 2, py + ts - 8);
  ctx.moveTo(px + 8, py + ts / 2);
  ctx.lineTo(px + ts - 8, py + ts / 2);
  ctx.stroke();
}

function drawDoorTile(ctx, px, py, ts, door) {
  if (door.open) {
    const area = door.areas[0] ?? 0;
    ctx.fillStyle = COLORS.FLOOR_BY_AREA[area % COLORS.FLOOR_BY_AREA.length];
    ctx.fillRect(px, py, ts, ts);
    ctx.fillStyle = COLORS.DOOR_OPEN;
    ctx.fillRect(px, py, ts, ts);
    return;
  }
  ctx.fillStyle = COLORS.DOOR_CLOSED;
  ctx.fillRect(px, py, ts, ts);
  ctx.strokeStyle = COLORS.DOOR_CLOSED_EDGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
  ctx.fillStyle = COLORS.DOOR_CLOSED_EDGE;
  ctx.fillRect(px + ts - 12, py + ts / 2 - 2, 5, 4);
}
