// Rounds inside a level: spawn each round's zombies through the windows,
// wait until they are all dead, pause, repeat; the level is complete after
// the last round.

import { LEVELS, ZOMBIE } from '../config.js';
import { Zombie } from '../entities/zombie.js';
import { weightedChoice, randRange } from '../utils/math.js';

export class RoundManager {
  constructor(game, plan) {
    this.game = game;
    this.plan = plan;
    this.round = 0;
    this.state = 'intermission'; // 'intermission' | 'active' | 'done'
    this.timer = LEVELS.FIRST_ROUND_DELAY;
    this.walkersLeft = 0;
    this.runnersLeft = 0;
    this.spawnTimer = 0;
  }

  get current() {
    return this.plan.rounds[this.round - 1] || null;
  }

  get toSpawn() {
    return this.walkersLeft + this.runnersLeft;
  }

  get remaining() {
    return this.toSpawn + this.game.zombies.length;
  }

  get isLastRound() {
    return this.round >= this.plan.count;
  }

  update(dt) {
    if (this.state === 'done') return;
    if (this.state === 'intermission') {
      this.timer -= dt;
      if (this.timer <= 0) this.startRound();
      return;
    }
    if (this.toSpawn > 0 && this.game.zombies.length < this.plan.maxAlive) {
      const windows = this.reachableWindows();
      if (windows.length) {
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
          this.spawn(this.pickWindow(windows));
          this.spawnTimer = this.plan.spawnInterval;
        }
      }
    }
    if (this.toSpawn === 0 && this.game.zombies.length === 0) this.endRound();
  }

  startRound() {
    this.round++;
    this.state = 'active';
    const r = this.current;
    this.walkersLeft = r.walkers;
    this.runnersLeft = r.runners;
    this.spawnTimer = 0;
    this.game.onRoundStart(this.round);
  }

  endRound() {
    this.game.onRoundCleared(this.round);
    if (this.isLastRound) {
      this.state = 'done';
      this.game.onLevelComplete();
      return;
    }
    this.state = 'intermission';
    this.timer = LEVELS.INTERMISSION;
  }

  // Windows whose inside tile the flow field can reach from the player, i.e.
  // rooms connected through open doors; zombies never spawn where they
  // would be stuck behind a closed door.
  reachableWindows() {
    const all = this.game.world.activeWindows();
    const reachable = all.filter((w) => this.game.flow.distanceAtTile(w.inside.x, w.inside.y) >= 0);
    return reachable.length ? reachable : all;
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
    const base = runner ? this.plan.runnerSpeed : this.plan.walkerSpeed;
    const z = new Zombie({
      x: window.outsideCenter.x,
      y: window.outsideCenter.y,
      hp: this.current.health,
      speed: base * randRange(1 - ZOMBIE.SPEED_VARIANCE, 1 + ZOMBIE.SPEED_VARIANCE),
      type: runner ? 'runner' : 'walker',
    });
    z.startClimb(window);
    this.game.zombies.push(z);
  }
}
