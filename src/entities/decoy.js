import { DECOY } from '../config.js';
import { moveThrown, throwSpeedFor } from './grenade.js';

export class Decoy {
  constructor(x, y, angle, distance) {
    const speed = throwSpeedFor(distance, DECOY.MIN_THROW_DISTANCE, DECOY.MAX_THROW_DISTANCE, DECOY.FRICTION);
    this.x = x;
    this.y = y;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.radius = DECOY.RADIUS;
    this.state = 'flying'; // 'flying' | 'active'
    this.timer = DECOY.DURATION;
    this.pulseTimer = 0;
    this.pulse = 0; // 0..1 progress of the current visual pulse
    this.exploded = false;
  }

  get isActive() {
    return this.state === 'active';
  }

  // Returns true when the decoy should explode this step.
  update(dt, world) {
    if (this.state === 'flying') {
      moveThrown(this, world, dt, DECOY.FRICTION, DECOY.BOUNCE);
      if (Math.hypot(this.vx, this.vy) < DECOY.SETTLE_SPEED) {
        this.state = 'active';
        this.vx = 0;
        this.vy = 0;
      }
      return false;
    }
    this.timer -= dt;
    this.pulseTimer += dt;
    if (this.pulseTimer >= DECOY.PULSE_INTERVAL) this.pulseTimer -= DECOY.PULSE_INTERVAL;
    this.pulse = this.pulseTimer / DECOY.PULSE_INTERVAL;
    return this.timer <= 0;
  }
}
