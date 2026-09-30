// Feeds the level's enemy budget through the unboarded windows over time.

import { LEVELS, ZOMBIE } from '../config.js';
import { Zombie } from '../entities/zombie.js';
import { weightedChoice, randRange } from '../utils/math.js';

export class SpawnDirector {
  constructor(game, budget) {
    this.game = game;
    this.budget = budget;
    this.walkersLeft = budget.walkers;
    this.runnersLeft = budget.runners;
    this.timer = LEVELS.FIRST_SPAWN_DELAY;
  }

  get toSpawn() {
    return this.walkersLeft + this.runnersLeft;
  }

  get remaining() {
    return this.toSpawn + this.game.zombies.length;
  }

  update(dt) {
    if (this.toSpawn === 0) return;
    const windows = this.game.world.activeWindows();
    if (!windows.length) return; // every window boarded: nothing else gets in
    if (this.game.zombies.length >= this.budget.maxAlive) return;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.spawn(this.pickWindow(windows));
    this.timer = this.budget.spawnInterval;
  }

  pickWindow(windows) {
    const p = this.game.player;
    const playerArea = this.game.world.areaAtPoint(p.x, p.y);
    return weightedChoice(windows, (w) => {
      const d = Math.hypot(w.insideCenter.x - p.x, w.insideCenter.y - p.y);
      const near = LEVELS.WINDOW_DISTANCE_SOFTENING / (d + LEVELS.WINDOW_DISTANCE_SOFTENING);
      return near * (w.area === playerArea ? LEVELS.WINDOW_SAME_AREA_WEIGHT : 1);
    });
  }

  spawn(window) {
    const runner = this.runnersLeft > 0 && (this.walkersLeft === 0 || Math.random() < this.runnersLeft / this.toSpawn);
    if (runner) this.runnersLeft--;
    else this.walkersLeft--;
    const base = runner ? this.budget.runnerSpeed : this.budget.walkerSpeed;
    const z = new Zombie({
      x: window.outsideCenter.x,
      y: window.outsideCenter.y,
      hp: this.budget.health,
      speed: base * randRange(1 - ZOMBIE.SPEED_VARIANCE, 1 + ZOMBIE.SPEED_VARIANCE),
      type: runner ? 'runner' : 'walker',
    });
    z.startClimb(window);
    this.game.zombies.push(z);
  }
}
