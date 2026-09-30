// Doors, wall buys and the mystery crate: prompts and purchases.

import { ECONOMY, PLAYER, COLORS } from '../config.js';
import { WEAPONS } from '../data/weapons.js';
import { spendPoints, addFloater } from './scoring.js';
import { weightedChoice } from '../utils/math.js';

export class Crate {
  constructor(worldCrate) {
    this.data = worldCrate;
    this.state = 'idle'; // 'idle' | 'spinning' | 'offer'
    this.timer = 0;
    this.tick = 0;
    this.displayWeapon = null;
    this.offer = null;
  }

  // Remaining share of the time the player has to take the offered gun.
  get offerFraction() {
    return this.state === 'offer' ? this.timer / ECONOMY.CRATE_OFFER_TIME : 0;
  }

  pool() {
    return Object.values(WEAPONS).filter((w) => w.source !== 'start');
  }

  rollWeapon() {
    return weightedChoice(this.pool(), (w) => (w.source === 'crate' ? ECONOMY.CRATE_SPECIAL_WEIGHT : 1));
  }

  spin() {
    this.state = 'spinning';
    this.timer = ECONOMY.CRATE_SPIN_TIME;
    this.tick = 0;
    this.displayWeapon = this.rollWeapon();
  }

  update(dt) {
    if (this.state === 'spinning') {
      this.timer -= dt;
      this.tick -= dt;
      if (this.tick <= 0) {
        this.tick = ECONOMY.CRATE_SPIN_TICK;
        this.displayWeapon = this.rollWeapon();
      }
      if (this.timer <= 0) {
        this.state = 'offer';
        this.offer = this.rollWeapon();
        this.displayWeapon = this.offer;
        this.timer = ECONOMY.CRATE_OFFER_TIME;
      }
    } else if (this.state === 'offer') {
      this.timer -= dt;
      if (this.timer <= 0) this.reset();
    }
  }

  take() {
    const w = this.offer;
    this.reset();
    return w;
  }

  reset() {
    this.state = 'idle';
    this.offer = null;
    this.displayWeapon = null;
    this.timer = 0;
  }
}

function near(px, py, pt, range) {
  return Math.hypot(pt.x - px, pt.y - py) <= range;
}

// The closest buyable thing within reach, with its prompt text, or null.
export function findInteractable(game) {
  const { player, world, crate } = game;
  const range = PLAYER.INTERACT_RANGE;
  const half = world.tileSize / 2;
  let best = null;
  const consider = (d, item) => {
    if (!best || d < best.distance) best = { ...item, distance: d };
  };

  for (const door of world.doors) {
    if (door.open) continue;
    for (const t of door.tiles) {
      const c = world.tileCenter(t.x, t.y);
      const d = Math.hypot(c.x - player.x, c.y - player.y);
      if (d <= range + half) {
        const target = door.areas.map((a) => world.areas[a].name).find((n) => n !== world.areas[world.areaAtPoint(player.x, player.y)]?.name);
        consider(d, { type: 'door', door, price: door.price, prompt: `Open door to ${target || 'next area'} (${door.price})` });
      }
    }
  }

  for (const wb of world.wallBuys) {
    if (!world.isAreaUnlocked(wb.area)) continue;
    if (!near(player.x, player.y, wb.standCenter, range)) continue;
    const d = Math.hypot(wb.standCenter.x - player.x, wb.standCenter.y - player.y);
    const owned = player.weaponById(wb.weaponId);
    if (owned) {
      const price = Math.round(wb.def.price * ECONOMY.WALL_BUY_REFILL_FACTOR);
      consider(d, { type: 'refill', wallBuy: wb, weapon: owned, price, prompt: owned.isFull ? `${wb.def.name} ammo is full` : `Refill ${wb.def.name} ammo (${price})` });
    } else {
      consider(d, { type: 'buy', wallBuy: wb, price: wb.def.price, prompt: `Buy ${wb.def.name} (${wb.def.price})` });
    }
  }

  if (world.crate && world.isAreaUnlocked(world.crate.area) && near(player.x, player.y, world.crate.standCenter, range)) {
    const d = Math.hypot(world.crate.standCenter.x - player.x, world.crate.standCenter.y - player.y);
    if (crate.state === 'idle') consider(d, { type: 'crate', price: world.crate.price, prompt: `Spin the mystery crate (${world.crate.price})` });
    else if (crate.state === 'offer') consider(d, { type: 'crate-take', price: 0, prompt: `Take ${crate.offer.name}` });
  }

  return best;
}

export function interact(game, item) {
  if (!item) return;
  const { player, world, crate } = game;
  switch (item.type) {
    case 'door':
      if (!spendPoints(game, item.price)) return notEnough(game);
      world.openDoor(item.door);
      game.onDoorOpened(item.door);
      return;
    case 'buy':
      if (!spendPoints(game, item.price)) return notEnough(game);
      player.giveWeapon(item.wallBuy.def);
      return;
    case 'refill':
      if (item.weapon.isFull) return;
      if (!spendPoints(game, item.price)) return notEnough(game);
      item.weapon.refill();
      return;
    case 'crate':
      if (!spendPoints(game, item.price)) return notEnough(game);
      crate.spin();
      return;
    case 'crate-take':
      player.giveWeapon(crate.take());
      return;
    default:
  }
}

function notEnough(game) {
  addFloater(game, 'Not enough points', game.player.x, game.player.y - game.player.radius * 2, { color: COLORS.FLOATER_BAD });
}
