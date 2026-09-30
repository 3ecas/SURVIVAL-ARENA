import { ITEMS } from '../config.js';
import { ITEM_TYPES } from '../data/items.js';

export class Item {
  constructor(type, x, y) {
    this.type = type;
    this.def = ITEM_TYPES[type];
    this.x = x;
    this.y = y;
    this.radius = ITEMS.RADIUS;
    this.t = Math.random() * Math.PI * 2;
    this.picked = false;
  }

  update(dt) {
    this.t += dt * ITEMS.BOB_SPEED;
  }

  get bob() {
    return Math.sin(this.t) * ITEMS.BOB_HEIGHT;
  }
}
