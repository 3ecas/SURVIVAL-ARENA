import { COMBAT } from '../config.js';

export class Projectile {
  constructor({ x, y, angle, speed, damage, kind, maxDistance, blastRadius = 0, color }) {
    this.x = x;
    this.y = y;
    this.prevX = x;
    this.prevY = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.angle = angle;
    this.damage = damage;
    this.kind = kind; // 'bullet' | 'explosive'
    this.blastRadius = blastRadius;
    this.maxDistance = maxDistance;
    this.travelled = 0;
    this.radius = COMBAT.BULLET_RADIUS;
    this.color = color;
    this.dead = false;
  }

  advance(dt) {
    this.prevX = this.x;
    this.prevY = this.y;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.travelled += Math.hypot(this.x - this.prevX, this.y - this.prevY);
  }
}
