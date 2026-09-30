export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.shakeX = 0;
    this.shakeY = 0;
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
  }

  follow(target, worldWidth, worldHeight, shake = 0) {
    let x = target.x - this.width / 2;
    let y = target.y - this.height / 2;
    x = worldWidth <= this.width ? (worldWidth - this.width) / 2 : Math.max(0, Math.min(x, worldWidth - this.width));
    y = worldHeight <= this.height ? (worldHeight - this.height) / 2 : Math.max(0, Math.min(y, worldHeight - this.height));
    this.x = Math.round(x);
    this.y = Math.round(y);
    this.shakeX = (Math.random() - 0.5) * 2 * shake;
    this.shakeY = (Math.random() - 0.5) * 2 * shake;
  }

  screenToWorld(p) {
    return { x: p.x + this.x, y: p.y + this.y };
  }

  apply(ctx) {
    ctx.translate(-this.x + this.shakeX, -this.y + this.shakeY);
  }

  // Visible world rectangle, for culling.
  bounds() {
    return { left: this.x, top: this.y, right: this.x + this.width, bottom: this.y + this.height };
  }
}
