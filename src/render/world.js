// Draws the static map into an offscreen canvas (rebuilt when a door opens),
// then the crate state on top each frame.

import { COLORS, HUD } from '../config.js';
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
    const sx = Math.max(0, b.left);
    const sy = Math.max(0, b.top);
    const sw = Math.min(this.cache.width, b.right) - sx;
    const sh = Math.min(this.cache.height, b.bottom) - sy;
    if (sw > 0 && sh > 0) ctx.drawImage(this.cache, sx, sy, sw, sh, sx, sy, sw, sh);
    if (game.crate) drawCrateState(ctx, this.world, game.crate);
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
        if (t === TILE.FLOOR) drawFloor(ctx, px, py, ts, world.areaAt(x, y), world);
        else if (t === TILE.WALL) drawWall(ctx, px, py, ts);
        else if (t === TILE.WINDOW) drawWindow(ctx, px, py, ts);
        else if (t === TILE.DOOR) drawDoorTile(ctx, px, py, ts, world.doorAt(x, y), world);
        else if (t === TILE.CRATE) drawCrateTile(ctx, px, py, ts);
      }
    }
    for (const door of world.doors) if (!door.open) drawDoorLabel(ctx, door, ts);
    for (const wb of world.wallBuys) drawWallBuy(ctx, wb, ts, world);
    if (world.crate) drawCrateLabel(ctx, world.crate, ts);
  }
}

function drawFloor(ctx, px, py, ts, area, world) {
  ctx.fillStyle = COLORS.FLOOR_BY_AREA[area % COLORS.FLOOR_BY_AREA.length];
  ctx.fillRect(px, py, ts, ts);
  ctx.strokeStyle = COLORS.FLOOR_GRID;
  ctx.strokeRect(px + 0.5, py + 0.5, ts - 1, ts - 1);
  if (!world.isAreaUnlocked(area)) {
    ctx.fillStyle = COLORS.FLOOR_LOCKED_DIM;
    ctx.fillRect(px, py, ts, ts);
  }
}

function drawWall(ctx, px, py, ts) {
  ctx.fillStyle = COLORS.WALL;
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = COLORS.WALL_EDGE;
  ctx.fillRect(px, py, ts, 3);
}

function drawWindow(ctx, px, py, ts) {
  ctx.fillStyle = COLORS.WINDOW_FRAME;
  ctx.fillRect(px, py, ts, ts);
  ctx.fillStyle = COLORS.WINDOW_PLANK;
  const plank = ts / 7;
  for (let i = 0; i < 3; i++) {
    ctx.fillRect(px + 4, py + plank * (1 + i * 2), ts - 8, plank);
  }
}

function drawDoorTile(ctx, px, py, ts, door, world) {
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
}

function drawDoorLabel(ctx, door, ts) {
  const c = door.center;
  // Lock icon: a small rounded body with a shackle.
  ctx.strokeStyle = COLORS.DOOR_TEXT;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c.x, c.y - 6, 5, Math.PI, 0);
  ctx.stroke();
  ctx.fillStyle = COLORS.DOOR_TEXT;
  ctx.fillRect(c.x - 7, c.y - 6, 14, 10);
  ctx.font = `bold 11px ${HUD.FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(door.price), c.x, c.y + 12 + (door.tiles.length > 1 && door.tiles[0].y !== door.tiles[1].y ? ts / 2 : 0));
}

// A small gun silhouette drawn with lines, plus the price on the floor side.
function drawGunIcon(ctx, cx, cy, color, scale = 1) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-14, -3); // barrel
  ctx.lineTo(12, -3);
  ctx.lineTo(12, 2);
  ctx.lineTo(0, 2); // receiver bottom
  ctx.lineTo(-2, 8); // grip
  ctx.lineTo(-7, 8);
  ctx.lineTo(-5, 2);
  ctx.lineTo(-14, 2);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath(); // magazine
  ctx.moveTo(4, 2);
  ctx.lineTo(3, 8);
  ctx.lineTo(8, 8);
  ctx.lineTo(9, 2);
  ctx.stroke();
  ctx.restore();
}

function drawWallBuy(ctx, wb, ts, world) {
  const unlocked = world.isAreaUnlocked(wb.area);
  ctx.globalAlpha = unlocked ? 1 : 0.35;
  drawGunIcon(ctx, wb.center.x, wb.center.y - 2, wb.def.color);
  ctx.fillStyle = COLORS.WALL_BUY_TEXT;
  ctx.font = `bold 10px ${HUD.FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(wb.def.price), wb.center.x, wb.center.y + ts / 2 - 6);
  ctx.globalAlpha = 1;
}

function drawCrateTile(ctx, px, py, ts) {
  ctx.fillStyle = COLORS.CRATE;
  ctx.fillRect(px, py, ts, ts);
  ctx.strokeStyle = COLORS.CRATE_EDGE;
  ctx.lineWidth = 2;
  ctx.strokeRect(px + 2, py + 2, ts - 4, ts - 4);
}

function drawCrateLabel(ctx, crate, ts) {
  ctx.fillStyle = COLORS.CRATE_TEXT;
  ctx.font = `bold 18px ${HUD.FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('?', crate.center.x, crate.center.y - 2);
  ctx.font = `bold 10px ${HUD.FONT}`;
  ctx.fillText(String(crate.price), crate.center.x, crate.center.y + ts / 2 - 6);
}

function drawCrateState(ctx, world, crate) {
  if (crate.state === 'idle' || !crate.displayWeapon) return;
  const c = world.crate.center;
  const ts = world.tileSize;
  ctx.fillStyle = crate.state === 'offer' ? COLORS.CRATE_SPIN : COLORS.CRATE_EDGE;
  ctx.fillRect(c.x - ts, c.y - ts / 2, ts * 2, ts);
  ctx.fillStyle = crate.state === 'offer' ? COLORS.CRATE : COLORS.CRATE_TEXT;
  ctx.font = `bold 11px ${HUD.FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(crate.displayWeapon.name, c.x, c.y - 6);
  if (crate.state === 'offer') {
    ctx.fillRect(c.x - ts + 4, c.y + ts / 2 - 8, (ts * 2 - 8) * crate.offerFraction, 4);
  }
}
