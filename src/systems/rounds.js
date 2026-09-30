// Round progression, difficulty scaling and the zombie spawn queue.

import { ROUNDS, ZOMBIE } from '../config.js';
import { Zombie } from '../entities/zombie.js';
import { weightedChoice, randRange } from '../utils/math.js';

export class RoundManager {
  constructor(game) {
    this.game = game;
    this.round = 0;
    this.state = 'intermission'; // 'intermission' | 'active'
    this.timer = ROUNDS.FIRST_ROUND_DELAY;
    this.toSpawn = 0;
    this.spawnTimer = 0;
    this.announceTimer = 0;
  }

  get intermissionLeft() {
    return this.state === 'intermission' ? this.timer : 0;
  }

  // ---- scaling -----------------------------------------------------------

  zombieCount(round) {
    return Math.round(ROUNDS.BASE_COUNT + ROUNDS.COUNT_PER_ROUND * (round - 1) + ROUNDS.COUNT_QUADRATIC * round * round);
  }

  zombieHealth(round) {
    const linear = Math.min(round, ZOMBIE.LINEAR_HEALTH_ROUNDS);
    let hp = ZOMBIE.BASE_HEALTH + ZOMBIE.HEALTH_PER_ROUND * (linear - 1);
    if (round > ZOMBIE.LINEAR_HEALTH_ROUNDS) hp *= Math.pow(ZOMBIE.HEALTH_GROWTH, round - ZOMBIE.LINEAR_HEALTH_ROUNDS);
    return Math.round(hp);
  }

  runnerShare(round) {
    if (round < ROUNDS.RUNNER_START_ROUND) return 0;
    return Math.min(ROUNDS.RUNNER_MAX_SHARE, (round - ROUNDS.RUNNER_START_ROUND + 1) * ROUNDS.RUNNER_SHARE_PER_ROUND);
  }

  walkerSpeed(round) {
    return Math.min(ZOMBIE.WALKER_MAX_SPEED, ZOMBIE.WALKER_SPEED + ZOMBIE.WALKER_SPEED_PER_ROUND * (round - 1));
  }

  runnerSpeed(round) {
    return Math.min(ZOMBIE.RUNNER_MAX_SPEED, ZOMBIE.RUNNER_SPEED + ZOMBIE.RUNNER_SPEED_PER_ROUND * (round - 1));
  }

  spawnInterval(round) {
    return Math.max(ROUNDS.MIN_SPAWN_INTERVAL, ROUNDS.SPAWN_INTERVAL - ROUNDS.SPAWN_INTERVAL_DECAY * (round - 1));
  }

  // ---- flow --------------------------------------------------------------

  update(dt) {
    this.announceTimer = Math.max(0, this.announceTimer - dt);
    if (this.state === 'intermission') {
      this.timer -= dt;
      if (this.timer <= 0) this.startRound();
      return;
    }

    const alive = this.game.aliveZombieCount();
    if (this.toSpawn > 0 && alive < ROUNDS.MAX_ALIVE) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnZombie();
        this.spawnTimer = this.spawnInterval(this.round);
      }
    }
    if (this.toSpawn === 0 && alive === 0) this.endRound();
  }

  startRound() {
    this.round++;
    this.state = 'active';
    this.toSpawn = this.zombieCount(this.round);
    this.spawnTimer = 0;
    this.announceTimer = ROUNDS.ANNOUNCE_TIME;
    this.game.onRoundStart(this.round);
  }

  endRound() {
    this.state = 'intermission';
    this.timer = ROUNDS.INTERMISSION;
    this.game.onRoundEnd(this.round);
  }

  pickWindow() {
    const windows = this.game.world.activeWindows();
    if (!windows.length) return null;
    const p = this.game.player;
    const playerArea = this.game.world.areaAtPoint(p.x, p.y);
    return weightedChoice(windows, (w) => {
      const d = Math.hypot(w.insideCenter.x - p.x, w.insideCenter.y - p.y);
      const near = ROUNDS.WINDOW_DISTANCE_SOFTENING / (d + ROUNDS.WINDOW_DISTANCE_SOFTENING);
      return near * (w.area === playerArea ? ROUNDS.WINDOW_SAME_AREA_WEIGHT : 1);
    });
  }

  spawnZombie() {
    const window = this.pickWindow();
    if (!window) return;
    const runner = Math.random() < this.runnerShare(this.round);
    const base = runner ? this.runnerSpeed(this.round) : this.walkerSpeed(this.round);
    const z = new Zombie({
      x: window.outsideCenter.x,
      y: window.outsideCenter.y,
      hp: this.zombieHealth(this.round),
      speed: base * randRange(1 - ZOMBIE.SPEED_VARIANCE, 1 + ZOMBIE.SPEED_VARIANCE),
      type: runner ? 'runner' : 'walker',
    });
    z.startClimb(window);
    this.game.zombies.push(z);
    this.toSpawn--;
  }
}
