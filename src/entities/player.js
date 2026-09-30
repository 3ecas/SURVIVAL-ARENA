import { PLAYER, MELEE } from '../config.js';
import { WEAPONS, STARTING_WEAPON } from '../data/weapons.js';
import { Weapon } from './weapon.js';

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER.RADIUS;
    this.aim = 0;
    this.health = PLAYER.MAX_HEALTH;
    this.maxHealth = PLAYER.MAX_HEALTH;
    this.regenTimer = 0;
    this.damageFlash = 0;
    this.points = PLAYER.START_POINTS;
    this.score = 0;
    this.kills = 0;
    this.grenades = PLAYER.START_GRENADES;
    this.decoys = PLAYER.START_DECOYS;
    this.throwCooldown = 0;
    this.meleeCooldown = 0;
    this.meleeSwing = 0;
    this.weapons = [new Weapon(WEAPONS[STARTING_WEAPON])];
    this.weaponIndex = 0;
    this.dead = false;
  }

  get weapon() {
    return this.weapons[this.weaponIndex];
  }

  hasWeapon(id) {
    return this.weapons.some((w) => w.def.id === id);
  }

  weaponById(id) {
    return this.weapons.find((w) => w.def.id === id) || null;
  }

  // Adds a gun, or replaces the current one when both slots are full.
  giveWeapon(def) {
    const owned = this.weaponById(def.id);
    if (owned) {
      owned.refill();
      this.weaponIndex = this.weapons.indexOf(owned);
      return owned;
    }
    const weapon = new Weapon(def);
    if (this.weapons.length < PLAYER.MAX_WEAPONS) {
      this.weapons.push(weapon);
      this.weaponIndex = this.weapons.length - 1;
    } else {
      this.weapon.cancelReload();
      this.weapons[this.weaponIndex] = weapon;
    }
    return weapon;
  }

  switchWeapon(index) {
    if (index < 0 || index >= this.weapons.length || index === this.weaponIndex) return;
    this.weapon.cancelReload();
    this.weaponIndex = index;
  }

  cycleWeapon(dir) {
    if (this.weapons.length < 2) return;
    this.switchWeapon((this.weaponIndex + dir + this.weapons.length) % this.weapons.length);
  }

  move(dirX, dirY, dt) {
    const len = Math.hypot(dirX, dirY);
    if (len === 0) return;
    this.x += (dirX / len) * PLAYER.SPEED * dt;
    this.y += (dirY / len) * PLAYER.SPEED * dt;
  }

  takeDamage(amount) {
    if (this.dead || amount <= 0) return;
    this.health -= amount;
    this.regenTimer = PLAYER.REGEN_DELAY;
    this.damageFlash = PLAYER.DAMAGE_FLASH_TIME;
    if (this.health <= 0) {
      this.health = 0;
      this.dead = true;
    }
  }

  canMelee() {
    return this.meleeCooldown <= 0;
  }

  startMelee() {
    this.meleeCooldown = MELEE.COOLDOWN;
    this.meleeSwing = MELEE.SWING_TIME;
  }

  refillForRound(round) {
    this.grenades = Math.min(PLAYER.MAX_GRENADES, this.grenades + PLAYER.GRENADES_PER_ROUND);
    if (round % PLAYER.DECOY_EVERY_N_ROUNDS === 0) {
      this.decoys = Math.min(PLAYER.MAX_DECOYS, this.decoys + 1);
    }
  }

  update(dt) {
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.meleeSwing = Math.max(0, this.meleeSwing - dt);
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    if (this.regenTimer > 0) {
      this.regenTimer -= dt;
    } else if (this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + PLAYER.REGEN_RATE * dt);
    }
  }
}
