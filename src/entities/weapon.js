// Runtime state of one carried gun: ammo, reload, cooldown and burst queue.
// It decides *when* a shot happens; combat.js decides what a shot does.

export class Weapon {
  constructor(def, reloadMultiplier = 1) {
    this.def = def;
    this.reloadMultiplier = reloadMultiplier;
    this.mag = def.magazine;
    this.reserve = def.reserve;
    this.cooldown = 0;
    this.reloading = false;
    this.reloadTimer = 0;
    this.burstLeft = 0;
    this.burstTimer = 0;
  }

  get isFull() {
    return this.mag === this.def.magazine && this.reserve === this.def.reserve;
  }

  get shotInterval() {
    return 1 / this.def.fireRate;
  }

  refill() {
    this.mag = this.def.magazine;
    this.reserve = this.def.reserve;
    this.cancelReload();
  }

  startReload() {
    if (this.reloading || this.mag === this.def.magazine || this.reserve <= 0) return false;
    this.reloading = true;
    this.reloadTimer = this.def.reloadTime * this.reloadMultiplier;
    this.burstLeft = 0;
    return true;
  }

  cancelReload() {
    this.reloading = false;
    this.reloadTimer = 0;
  }

  finishReload() {
    const need = this.def.magazine - this.mag;
    const take = Math.min(need, this.reserve);
    this.mag += take;
    this.reserve -= take;
    this.reloading = false;
  }

  wantsToFire(held, pressed) {
    switch (this.def.fireMode) {
      case 'auto':
        return held;
      case 'single':
      case 'burst':
      case 'explosive':
      default:
        return pressed;
    }
  }

  // Advances timers and returns how many shots should be fired this step.
  update(dt, held, pressed) {
    this.cooldown = Math.max(0, this.cooldown - dt);

    if (this.reloading) {
      this.reloadTimer -= dt;
      if (this.reloadTimer <= 0) this.finishReload();
      return 0;
    }

    let shots = 0;

    // Continue an in-progress burst.
    if (this.burstLeft > 0) {
      this.burstTimer -= dt;
      if (this.burstTimer <= 0) {
        if (this.mag > 0) {
          this.mag--;
          shots++;
        }
        this.burstLeft = this.mag > 0 ? this.burstLeft - 1 : 0;
        this.burstTimer = this.def.burstInterval;
      }
      return shots;
    }

    if (!this.wantsToFire(held, pressed) || this.cooldown > 0) return 0;

    if (this.mag <= 0) {
      this.startReload();
      return 0;
    }

    this.mag--;
    shots++;
    this.cooldown = this.shotInterval;
    if (this.def.fireMode === 'burst') {
      this.burstLeft = Math.max(0, this.def.burstCount - 1);
      this.burstTimer = this.def.burstInterval;
    }
    return shots;
  }
}
