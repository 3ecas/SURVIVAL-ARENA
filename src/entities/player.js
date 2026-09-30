import { PLAYER, MELEE } from '../config.js';
import { WEAPONS } from '../data/weapons.js';
import { INVENTORY_TYPES } from '../data/items.js';
import { Weapon } from './weapon.js';

export class Player {
  // `run` is the run state (src/run.js) the player is restored from.
  constructor(x, y, run) {
    this.x = x;
    this.y = y;
    this.radius = PLAYER.RADIUS;
    this.aim = 0;
    this.maxHealth = PLAYER.MAX_HEALTH;
    this.health = Math.min(this.maxHealth, run.health);
    this.regenTimer = 0;
    this.damageFlash = 0;
    this.score = run.score;
    this.kills = run.kills;
    this.inventory = Object.fromEntries(INVENTORY_TYPES.map((t) => [t, run.inventory[t] || 0]));
    this.bandages = run.bandages;
    this.grenades = run.grenades;
    this.decoys = run.decoys;
    this.healing = 0; // health still to be applied by the active bandage
    this.throwCooldown = 0;
    this.meleeCooldown = 0;
    this.meleeSwing = 0;
    this.flashlightOn = true;
    this.weapons = run.weapons.map((w) => {
      const weapon = new Weapon(WEAPONS[w.id]);
      weapon.mag = w.mag;
      weapon.reserve = w.reserve;
      return weapon;
    });
    this.weaponIndex = Math.min(run.weaponIndex, this.weapons.length - 1);
    this.dead = false;
  }

  get weapon() {
    return this.weapons[this.weaponIndex];
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

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  // Returns true when a bandage was started.
  useBandage() {
    if (this.bandages <= 0 || this.healing > 0 || this.health >= this.maxHealth) return false;
    this.bandages--;
    this.healing = PLAYER.BANDAGE_HEAL;
    return true;
  }

  addItem(type, count = 1) {
    if (type in this.inventory) this.inventory[type] += count;
  }

  canMelee() {
    return this.meleeCooldown <= 0;
  }

  startMelee() {
    this.meleeCooldown = MELEE.COOLDOWN;
    this.meleeSwing = MELEE.SWING_TIME;
  }

  update(dt) {
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.meleeSwing = Math.max(0, this.meleeSwing - dt);
    this.throwCooldown = Math.max(0, this.throwCooldown - dt);
    this.damageFlash = Math.max(0, this.damageFlash - dt);
    if (this.healing > 0) {
      const tick = Math.min(this.healing, (PLAYER.BANDAGE_HEAL / PLAYER.BANDAGE_TIME) * dt);
      this.heal(tick);
      this.healing -= tick;
      if (this.health >= this.maxHealth) this.healing = 0;
    }
    if (this.regenTimer > 0) {
      this.regenTimer -= dt;
    } else if (PLAYER.REGEN_RATE > 0 && this.health < this.maxHealth) {
      this.heal(PLAYER.REGEN_RATE * dt);
    }
  }
}
