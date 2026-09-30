import { GRENADE } from '../config.js';
import { clamp } from '../utils/math.js';

// Shared sliding/bouncing motion for thrown objects.
export function moveThrown(obj, world, dt, friction, bounce) {
  const k = Math.max(0, 1 - friction * dt);
  obj.vx *= k;
  obj.vy *= k;

  const nx = obj.x + obj.vx * dt;
  if (world.isSolidAtPoint(nx + Math.sign(obj.vx) * obj.radius, obj.y)) {
    obj.vx = -obj.vx * bounce;
  } else {
    obj.x = nx;
  }
  const ny = obj.y + obj.vy * dt;
  if (world.isSolidAtPoint(obj.x, ny + Math.sign(obj.vy) * obj.radius)) {
    obj.vy = -obj.vy * bounce;
  } else {
    obj.y = ny;
  }
}

// Speed that makes an object with exponential friction stop after `distance`.
export function throwSpeedFor(distance, minDistance, maxDistance, friction) {
  return clamp(distance, minDistance, maxDistance) * friction;
}

export class Grenade {
  constructor(x, y, angle, distance) {
    const speed = throwSpeedFor(distance, GRENADE.MIN_THROW_DISTANCE, GRENADE.MAX_THROW_DISTANCE, GRENADE.FRICTION);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = GRENADE.RADIUS;
    this.fuse = GRENADE.FUSE;
    this.exploded = false;
  }

  // Returns true when the fuse runs out this step.
  update(dt, world) {
    moveThrown(this, world, dt, GRENADE.FRICTION, GRENADE.BOUNCE);
    this.fuse -= dt;
    return this.fuse <= 0;
  }
}
