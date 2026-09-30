import { CAMERA } from '../config.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.screenWidth = 0;
    this.screenHeight = 0;
    this.zoom = CAMERA.ZOOM;
    this.shakeX = 0;
    this.shakeY = 0;
    this.initialised = false;
  }

  // Visible size in world units.
  get width() {
    return this.screenWidth / this.zoom;
  }

  get height() {
    return this.screenHeight / this.zoom;
  }

  resize(width, height) {
    this.screenWidth = width;
    this.screenHeight = height;
  }

  snapTo(target, worldWidth, worldHeight) {
    this.initialised = false;
    this.follow(target, target, worldWidth, worldHeight, 0, 1);
  }

  // Leads toward the aim point and eases there, clamped to the world.
  follow(target, aim, worldWidth, worldHeight, shake, dt) {
    let lx = (aim.x - target.x) * CAMERA.LOOKAHEAD;
    let ly = (aim.y - target.y) * CAMERA.LOOKAHEAD;
    const len = Math.hypot(lx, ly);
    if (len > CAMERA.MAX_LOOKAHEAD) {
      lx *= CAMERA.MAX_LOOKAHEAD / len;
      ly *= CAMERA.MAX_LOOKAHEAD / len;
    }
    let dx = target.x + lx - this.width / 2;
    let dy = target.y + ly - this.height / 2;
    dx = worldWidth <= this.width ? (worldWidth - this.width) / 2 : Math.max(0, Math.min(dx, worldWidth - this.width));
    dy = worldHeight <= this.height ? (worldHeight - this.height) / 2 : Math.max(0, Math.min(dy, worldHeight - this.height));
    const k = this.initialised ? Math.min(1, CAMERA.SMOOTHING * dt) : 1;
    this.x += (dx - this.x) * k;
    this.y += (dy - this.y) * k;
    this.initialised = true;
    this.shakeX = (Math.random() - 0.5) * 2 * shake;
    this.shakeY = (Math.random() - 0.5) * 2 * shake;
  }

  screenToWorld(p) {
    return { x: p.x / this.zoom + this.x, y: p.y / this.zoom + this.y };
  }

  apply(ctx) {
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }

  // Visible world rectangle, for culling.
  bounds() {
    return { left: this.x, top: this.y, right: this.x + this.width, bottom: this.y + this.height };
  }
}
