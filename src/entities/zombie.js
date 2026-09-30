import { ZOMBIE } from '../config.js';
import { lerp, easeInOut } from '../utils/math.js';

let nextId = 1;

export class Zombie {
  constructor({ x, y, hp, speed, type }) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.radius = ZOMBIE.RADIUS;
    this.headRadius = ZOMBIE.HEAD_RADIUS;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.type = type; // 'walker' | 'runner'
    this.state = 'chasing'; // 'climbing' | 'chasing'
    this.climb = null;
    this.facing = 0;
    this.flash = 0;
    this.attackCooldown = 0;
    this.windup = 0;
    this.windingUp = false;
    this.dead = false;
  }

  get isClimbing() {
    return this.state === 'climbing';
  }

  startClimb(window) {
    this.state = 'climbing';
    this.climb = { from: window.outsideCenter, to: window.insideCenter, t: 0 };
    this.x = window.outsideCenter.x;
    this.y = window.outsideCenter.y;
    this.facing = Math.atan2(this.climb.to.y - this.climb.from.y, this.climb.to.x - this.climb.from.x);
  }

  updateClimb(dt) {
    const c = this.climb;
    c.t = Math.min(1, c.t + dt / ZOMBIE.CLIMB_TIME);
    const e = easeInOut(c.t);
    this.x = lerp(c.from.x, c.to.x, e);
    this.y = lerp(c.from.y, c.to.y, e);
    if (c.t >= 1) {
      this.state = 'chasing';
      this.climb = null;
    }
  }

  // target: { x, y, radius, kind } ; steer: unit vector from the flow field or null.
  updateChase(dt, target, steer) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    const reach = this.radius + target.radius + ZOMBIE.ATTACK_REACH;
    const inRange = d <= reach;

    if (!inRange || target.kind !== 'player') {
      const dir = steer || (d > 0 ? { x: dx / d, y: dy / d } : { x: 0, y: 0 });
      // Stop pushing into a decoy once we are on top of it.
      const stopDistance = target.kind === 'player' ? 0 : this.radius + target.radius;
      if (d > stopDistance) {
        this.x += dir.x * this.speed * dt;
        this.y += dir.y * this.speed * dt;
      }
      if (dir.x !== 0 || dir.y !== 0) this.facing = Math.atan2(dir.y, dir.x);
    } else {
      this.facing = Math.atan2(dy, dx);
    }
    return { inRange: inRange && target.kind === 'player', reach };
  }

  // Returns true on the step the attack lands.
  updateAttack(dt, inRange, stillInReach) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.windingUp) {
      this.windup -= dt;
      if (this.windup <= 0) {
        this.windingUp = false;
        this.attackCooldown = ZOMBIE.ATTACK_COOLDOWN;
        return stillInReach();
      }
      return false;
    }
    if (inRange && this.attackCooldown <= 0) {
      this.windingUp = true;
      this.windup = ZOMBIE.ATTACK_WINDUP;
    }
    return false;
  }

  hit() {
    this.flash = ZOMBIE.HIT_FLASH_TIME;
  }

  tickTimers(dt) {
    this.flash = Math.max(0, this.flash - dt);
  }
}
