// Firing, projectile sweeps, headshots, melee and zombie damage/death.

import { COMBAT, MELEE, ZOMBIE, COLORS, XP, LEVELS } from '../config.js';
import { Item } from '../entities/item.js';
import { Projectile } from '../entities/projectile.js';
import { awardPoints, pointsForHit, pointsForKill } from './scoring.js';
import { explode } from './explosions.js';
import { damageLight } from './lighting.js';
import { randSpread, segmentCircleT, pointLineDistance, angleDiff } from '../utils/math.js';

const DEG = Math.PI / 180;

// Spawns the projectiles for `shots` trigger pulls of the player's weapon.
export function fireShots(game, weapon, shots) {
  const p = game.player;
  const def = weapon.def;
  const pellets = def.pellets || 1;
  const muzzleX = p.x + Math.cos(p.aim) * (p.radius + COMBAT.MUZZLE_OFFSET);
  const muzzleY = p.y + Math.sin(p.aim) * (p.radius + COMBAT.MUZZLE_OFFSET);

  for (let s = 0; s < shots; s++) {
    for (let i = 0; i < pellets; i++) {
      const angle = p.aim + randSpread(def.spread * DEG);
      const explosive = def.fireMode === 'explosive';
      game.projectiles.push(new Projectile({
        x: muzzleX,
        y: muzzleY,
        angle,
        speed: explosive ? def.projectileSpeed : COMBAT.BULLET_SPEED,
        damage: def.damage * p.stats.damageMultiplier,
        kind: explosive ? 'explosive' : 'bullet',
        blastRadius: def.blastRadius || 0,
        maxDistance: def.range || COMBAT.BULLET_MAX_DISTANCE,
        color: explosive ? COLORS.EXPLOSIVE_SHELL : COLORS.BULLET,
      }));
    }
  }
  game.particles.muzzle(muzzleX, muzzleY, p.aim);
}

export function updateProjectiles(game, dt) {
  const list = game.projectiles;
  for (let i = list.length - 1; i >= 0; i--) {
    const pr = list[i];
    pr.advance(dt);
    sweepProjectile(game, pr);
    if (!pr.dead && pr.travelled >= pr.maxDistance) {
      if (pr.kind === 'explosive') explode(game, pr.x, pr.y, pr.blastRadius, pr.damage);
      pr.dead = true;
    }
    if (pr.dead) {
      list[i] = list[list.length - 1];
      list.pop();
    }
  }
}

// Finds the first thing the projectile crossed this step (wall or zombie).
function sweepProjectile(game, pr) {
  const ax = pr.prevX;
  const ay = pr.prevY;
  const bx = pr.x;
  const by = pr.y;

  let hitT = wallHitT(game.world, ax, ay, bx, by);
  let hitZombie = null;
  let hitLight = null;
  for (const z of game.zombies) {
    if (z.dead) continue;
    const t = segmentCircleT(ax, ay, bx, by, z.x, z.y, z.radius + pr.radius);
    if (t !== null && t < hitT) {
      hitT = t;
      hitZombie = z;
    }
  }
  for (const l of game.world.lights) {
    if (l.broken) continue;
    const t = segmentCircleT(ax, ay, bx, by, l.x, l.y, l.radius + pr.radius);
    if (t !== null && t < hitT) {
      hitT = t;
      hitZombie = null;
      hitLight = l;
    }
  }
  if (hitT > 1) return;

  const hx = ax + (bx - ax) * hitT;
  const hy = ay + (by - ay) * hitT;
  pr.dead = true;

  if (pr.kind === 'explosive') {
    explode(game, hx, hy, pr.blastRadius, pr.damage);
    return;
  }
  if (hitLight) {
    damageLight(game, hitLight, pr.damage);
    return;
  }
  if (hitZombie) {
    const headshot = pointLineDistance(hitZombie.x, hitZombie.y, ax, ay, bx - ax, by - ay) <= hitZombie.headRadius;
    const damage = headshot ? pr.damage * COMBAT.HEADSHOT_MULTIPLIER : pr.damage;
    damageZombie(game, hitZombie, damage, { headshot, angle: pr.angle, source: 'bullet' });
  }
}

// Parameter t (0..1, or Infinity) of the first bullet-blocking tile along A->B.
function wallHitT(world, ax, ay, bx, by) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len === 0) return Infinity;
  const steps = Math.ceil(len / COMBAT.BULLET_RAY_STEP);
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (world.blocksBullets(Math.floor(x / world.tileSize), Math.floor(y / world.tileSize))) return t;
  }
  return Infinity;
}

export function meleeAttack(game) {
  const p = game.player;
  if (!p.canMelee()) return;
  p.startMelee();
  for (const z of game.zombies) {
    if (z.dead) continue;
    const d = Math.hypot(z.x - p.x, z.y - p.y);
    if (d > MELEE.RANGE + z.radius) continue;
    const a = Math.atan2(z.y - p.y, z.x - p.x);
    if (Math.abs(angleDiff(p.aim, a)) > MELEE.ARC / 2) continue;
    damageZombie(game, z, MELEE.DAMAGE * p.stats.damageMultiplier, { melee: true, angle: a, source: 'melee' });
  }
}

export function damageZombie(game, z, amount, { headshot = false, melee = false, angle = 0, source = 'bullet' } = {}) {
  if (z.dead) return;
  z.hp -= amount;
  z.hit();
  awardPoints(game, pointsForHit(), z.x, z.y);
  game.particles.blood(z.x, z.y, angle);
  if (headshot) game.particles.headshot(z.x, z.y);
  if (z.hp <= 0) killZombie(game, z, { headshot, melee, source });
}

function killZombie(game, z, info) {
  z.dead = true;
  game.player.kills++;
  const { amount, color } = pointsForKill(info);
  awardPoints(game, amount, z.x, z.y - z.radius, { color, big: true });
  game.addXp((z.type === 'runner' ? XP.KILL_RUNNER : XP.KILL_WALKER) + (info.headshot ? XP.HEADSHOT_BONUS : 0));
  game.particles.death(z.x, z.y, z.type === 'runner' ? COLORS.ZOMBIE_RUNNER_HEAD : COLORS.DEATH);
  if (Math.random() < LEVELS.ZOMBIE_AMMO_DROP_CHANCE && !game.world.isSolidAtPoint(z.x, z.y)) game.items.push(new Item('ammo', z.x, z.y));
}

// Zombie touching the player: called by the game after zombie movement.
export function zombieAttacksPlayer(game, z) {
  game.player.takeDamage(ZOMBIE.ATTACK_DAMAGE);
}
