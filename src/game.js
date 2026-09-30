// One level in play. Owns every entity list and calls the systems in a fixed
// order each step. No drawing here.

import { PATHFINDING, TILE_SIZE, ZOMBIE, CAMERA, PLAYER, GRENADE, DECOY, LIGHTING, POINTS, HUD } from './config.js';
import { World } from './world.js';
import { Player } from './entities/player.js';
import { Grenade } from './entities/grenade.js';
import { Decoy } from './entities/decoy.js';
import { ParticleSystem } from './particles.js';
import { FlowField } from './systems/pathfinding.js';
import { SpawnDirector } from './systems/spawning.js';
import { LightingSystem } from './systems/lighting.js';
import { spawnItems, updateItems } from './systems/items.js';
import { findInteractable, interact } from './systems/interaction.js';
import { objectiveList } from './systems/objectives.js';
import { fireShots, updateProjectiles, meleeAttack, zombieAttacksPlayer } from './systems/combat.js';
import { explode, updateRings } from './systems/explosions.js';
import { updateFloaters, awardPoints } from './systems/scoring.js';
import { resolveCircleVsWorld, separateCircles, separatePair } from './systems/collision.js';
import { mulberry32 } from './mapgen/rng.js';

export class Game {
  // levelData comes from src/level.js, run from src/run.js.
  constructor(levelData, run) {
    this.levelData = levelData;
    this.level = levelData.level;
    this.world = new World(levelData.map);
    this.player = new Player(this.world.playerSpawn.x, this.world.playerSpawn.y, run);
    this.zombies = [];
    this.projectiles = [];
    this.grenades = [];
    this.decoys = [];
    this.items = [];
    this.floaters = [];
    this.effects = { rings: [] };
    this.particles = new ParticleSystem();
    this.flow = new FlowField(this.world);
    this.flowTimer = 0;
    this.flowTargetKey = '';
    this.spawner = new SpawnDirector(this, levelData.enemies);
    this.lighting = new LightingSystem(this);
    this.interactable = null;
    this.aim = { x: this.player.x + 1, y: this.player.y };
    this.shake = 0;
    this.time = 0;
    this.state = 'playing'; // 'playing' | 'dead' | 'extracted'
    this.announce = { text: `Level ${this.level}`, sub: 'Board up every window, then get back to the entrance', timer: HUD.ANNOUNCE_TIME };
    this.endTimer = 0;

    const rng = mulberry32(levelData.mapSeed + 5);
    for (const light of this.world.lights) light.on = rng() < LIGHTING.LIGHTS_ON_CHANCE;
    spawnItems(this, levelData.items);
  }

  // ---- queries used by systems -------------------------------------------

  get objectives() {
    return objectiveList(this);
  }

  activeDecoy() {
    return this.decoys.find((d) => d.isActive) || null;
  }

  zombieTarget() {
    const decoy = this.activeDecoy();
    if (decoy) return { x: decoy.x, y: decoy.y, radius: decoy.radius, kind: 'decoy' };
    return { x: this.player.x, y: this.player.y, radius: this.player.radius, kind: 'player' };
  }

  // ---- events ------------------------------------------------------------

  onWorldChanged() {
    this.flowTimer = 0;
  }

  extract() {
    if (this.state !== 'playing') return;
    this.state = 'extracted';
    awardPoints(this, POINTS.EXTRACT_BONUS_PER_LEVEL * this.level, this.player.x, this.player.y - this.player.radius * 2, { big: true });
    this.announce = { text: 'Extracted', sub: `Level ${this.level} cleared`, timer: HUD.ANNOUNCE_TIME };
  }

  setAim(worldPoint) {
    this.aim = worldPoint;
    this.player.aim = Math.atan2(worldPoint.y - this.player.y, worldPoint.x - this.player.x);
  }

  // ---- main step ---------------------------------------------------------

  update(dt, frame) {
    this.time += dt;
    this.shake = Math.max(0, this.shake - CAMERA.SHAKE_DECAY * dt * Math.max(1, this.shake));
    this.announce.timer = Math.max(0, this.announce.timer - dt);
    if (this.state !== 'playing') {
      this.endTimer += dt;
      this.particles.update(dt);
      updateFloaters(this, dt);
      updateRings(this, dt);
      return;
    }

    this.updatePlayer(dt, frame);
    this.updateThrowables(dt);
    this.updateFlowField(dt);
    this.updateZombies(dt);
    this.resolveCollisions();
    updateProjectiles(this, dt);
    this.removeDeadZombies();
    this.spawner.update(dt);
    updateItems(this, dt);
    this.interactable = findInteractable(this);
    if (frame.interactPressed) interact(this, this.interactable);
    this.particles.update(dt);
    updateFloaters(this, dt);
    updateRings(this, dt);

    if (this.player.dead) {
      this.state = 'dead';
      this.announce = { text: 'You died', sub: `Level ${this.level}`, timer: HUD.ANNOUNCE_TIME };
    }
  }

  updatePlayer(dt, frame) {
    const p = this.player;
    p.update(dt);
    p.move(frame.moveX, frame.moveY, dt);
    resolveCircleVsWorld(p, this.world);

    if (frame.weaponSlot >= 0) p.switchWeapon(frame.weaponSlot);
    if (frame.weaponScroll !== 0) p.cycleWeapon(frame.weaponScroll);
    if (frame.reloadPressed) p.weapon.startReload();
    if (frame.flashlightPressed) p.flashlightOn = !p.flashlightOn;
    if (frame.healPressed) p.useBandage();

    const shots = p.weapon.update(dt, frame.fireHeld, frame.firePressed);
    if (shots > 0) fireShots(this, p.weapon, shots);

    if (frame.meleePressed) meleeAttack(this);

    if (frame.grenadePressed && p.grenades > 0 && p.throwCooldown <= 0) {
      p.grenades--;
      p.throwCooldown = PLAYER.THROW_COOLDOWN;
      this.grenades.push(new Grenade(p.x, p.y, p.aim, Math.hypot(this.aim.x - p.x, this.aim.y - p.y)));
    }
    if (frame.decoyPressed && p.decoys > 0 && p.throwCooldown <= 0 && !this.decoys.length) {
      p.decoys--;
      p.throwCooldown = PLAYER.THROW_COOLDOWN;
      this.decoys.push(new Decoy(p.x, p.y, p.aim, Math.hypot(this.aim.x - p.x, this.aim.y - p.y)));
    }
  }

  updateThrowables(dt) {
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      if (g.update(dt, this.world)) {
        explode(this, g.x, g.y, GRENADE.BLAST_RADIUS, GRENADE.DAMAGE, { source: 'grenade' });
        this.grenades.splice(i, 1);
      }
    }
    for (let i = this.decoys.length - 1; i >= 0; i--) {
      const d = this.decoys[i];
      if (d.update(dt, this.world)) {
        explode(this, d.x, d.y, DECOY.BLAST_RADIUS, DECOY.DAMAGE, { source: 'decoy' });
        this.decoys.splice(i, 1);
        this.flowTimer = 0;
      }
    }
  }

  updateFlowField(dt) {
    this.flowTimer -= dt;
    const target = this.zombieTarget();
    const tile = this.world.worldToTile(target.x, target.y);
    const key = `${tile.x},${tile.y},${this.world.version}`;
    if (this.flowTimer > 0 && key === this.flowTargetKey) return;
    this.flow.compute([tile]);
    this.flowTargetKey = key;
    this.flowTimer = PATHFINDING.RECALC_INTERVAL;
  }

  updateZombies(dt) {
    const target = this.zombieTarget();
    const targetTile = this.world.worldToTile(target.x, target.y);
    for (const z of this.zombies) {
      z.tickTimers(dt);
      if (z.isClimbing) {
        z.updateClimb(dt);
        continue;
      }
      const zt = this.world.worldToTile(z.x, z.y);
      const sameTile = zt.x === targetTile.x && zt.y === targetTile.y;
      const steer = sameTile ? null : this.flow.directionAt(z.x, z.y);
      const { inRange, reach } = z.updateChase(dt, target, steer);
      const landed = z.updateAttack(dt, inRange, () => Math.hypot(this.player.x - z.x, this.player.y - z.y) <= reach * ZOMBIE.ATTACK_LANDING_TOLERANCE);
      if (landed) zombieAttacksPlayer(this, z);
    }
  }

  // Alternate zombie/zombie, zombie/player and wall resolution so a crowd
  // pressed against a wall or the player still ends up without overlaps.
  resolveCollisions() {
    const walking = this.zombies.filter((z) => !z.isClimbing);
    for (let pass = 0; pass < ZOMBIE.SEPARATION_ITERATIONS; pass++) {
      for (const z of walking) {
        separatePair(this.player, z, ZOMBIE.PLAYER_PUSH_SHARE);
        resolveCircleVsWorld(z, this.world);
      }
      resolveCircleVsWorld(this.player, this.world);
      separateCircles(walking, TILE_SIZE, ZOMBIE.SEPARATION_ITERATIONS);
    }
  }

  removeDeadZombies() {
    for (let i = this.zombies.length - 1; i >= 0; i--) {
      if (this.zombies[i].dead) {
        this.zombies[i] = this.zombies[this.zombies.length - 1];
        this.zombies.pop();
      }
    }
  }
}
