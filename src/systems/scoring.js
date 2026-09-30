// Point values, score bookkeeping and the floating "+10" numbers.

import { POINTS, FLOATERS, COLORS } from '../config.js';
import { randSpread } from '../utils/math.js';

export function awardPoints(game, amount, x, y, { color = COLORS.FLOATER_HIT, big = false } = {}) {
  game.player.points += amount;
  game.player.score += amount;
  addFloater(game, `+${amount}`, x, y, { color, big });
}

export function spendPoints(game, amount) {
  if (game.player.points < amount) return false;
  game.player.points -= amount;
  addFloater(game, `-${amount}`, game.player.x, game.player.y - game.player.radius, { color: COLORS.POINTS });
  return true;
}

export function addFloater(game, text, x, y, { color = COLORS.FLOATER_HIT, big = false } = {}) {
  game.floaters.push({
    text,
    x: x + randSpread(FLOATERS.SPREAD),
    y: y + randSpread(FLOATERS.SPREAD),
    life: FLOATERS.LIFE,
    maxLife: FLOATERS.LIFE,
    color,
    size: big ? FLOATERS.BIG_SIZE : FLOATERS.SMALL_SIZE,
  });
}

export function pointsForHit() {
  return POINTS.HIT;
}

export function pointsForKill({ headshot, melee }) {
  if (melee) return { amount: POINTS.MELEE_KILL, color: COLORS.FLOATER_MELEE };
  if (headshot) return { amount: POINTS.HEADSHOT_KILL, color: COLORS.FLOATER_HEADSHOT };
  return { amount: POINTS.KILL, color: COLORS.FLOATER_KILL };
}

export function updateFloaters(game, dt) {
  const fs = game.floaters;
  for (let i = fs.length - 1; i >= 0; i--) {
    const f = fs[i];
    f.life -= dt;
    f.y -= FLOATERS.RISE_SPEED * dt;
    if (f.life <= 0) fs.splice(i, 1);
  }
}
