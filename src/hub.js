// The hub between levels. Three panels: next map (read only), gear &
// inventory, armory. The two interactive panels are grids of cards the
// cursor moves across with WASD; Tab (or moving off an edge) switches panel.

import { RECIPES } from './data/recipes.js';
import { ARMORY_ORDER } from './data/armory.js';
import { ATTRIBUTES } from './data/attributes.js';
import { WEAPONS } from './data/weapons.js';
import { buildLevel } from './level.js';
import { craft, craftBlocker, unlockBlocker, unlockWeapon, equipWeapon, isUnlocked, attributeBlocker, spendAttribute } from './systems/crafting.js';

export const PANELS = ['gear', 'armory'];

export class Hub {
  constructor(run, meta) {
    this.run = run;
    this.meta = meta;
    this.focus = 'gear';
    this.cursor = { gear: { row: 0, col: 0 }, armory: { row: 0, col: 0 } };
    this.message = '';
    this.briefing = buildLevel(run.level, run.seed);
  }

  // Card groups per panel. Each group is a grid with `cols` columns; every
  // item carries a unique `key` the renderer uses to draw the cursor.
  groups(panel) {
    const { run } = this;
    if (panel === 'gear') {
      return [
        { id: 'attributes', cols: 2, items: ATTRIBUTES.map((a) => ({ key: `attr:${a.id}`, kind: 'attribute', attribute: a })) },
        { id: 'slots', cols: 2, items: [0, 1].map((slot) => ({ key: `slot:${slot}`, kind: 'slot', slot, weapon: run.weapons[slot] ? WEAPONS[run.weapons[slot].id] : null })) },
        { id: 'unlocked', cols: 3, items: run.unlocked.map((id) => ({ key: `gun:${id}`, kind: 'equip', weapon: WEAPONS[id] })) },
      ];
    }
    return [
      { id: 'guns', cols: 3, items: ARMORY_ORDER.filter((id) => !isUnlocked(run, id)).map((id) => ({ key: `unlock:${id}`, kind: 'unlock', weapon: WEAPONS[id] })) },
      { id: 'craft', cols: 3, items: RECIPES.map((r) => ({ key: `craft:${r.id}`, kind: 'craft', recipe: r })) },
    ];
  }

  // Rows of items, in reading order, across all groups of a panel.
  rows(panel = this.focus) {
    const rows = [];
    for (const g of this.groups(panel)) {
      for (let i = 0; i < g.items.length; i += g.cols) rows.push(g.items.slice(i, i + g.cols));
    }
    return rows;
  }

  selected(panel = this.focus) {
    const rows = this.rows(panel);
    if (!rows.length) return null;
    const c = this.cursor[panel];
    const row = rows[Math.min(c.row, rows.length - 1)];
    return row[Math.min(c.col, row.length - 1)] || null;
  }

  isSelected(key) {
    const s = this.selected();
    return !!s && s.key === key;
  }

  move(dRow, dCol) {
    const rows = this.rows();
    if (!rows.length) return;
    const c = this.cursor[this.focus];
    c.row = Math.max(0, Math.min(rows.length - 1, c.row));
    if (dRow) {
      c.row = (c.row + dRow + rows.length) % rows.length;
      c.col = Math.min(c.col, rows[c.row].length - 1);
      return;
    }
    const len = rows[c.row].length;
    const next = c.col + dCol;
    if (next < 0 || next >= len) {
      // Off the edge of the row: hop to the neighbouring panel.
      const i = PANELS.indexOf(this.focus);
      const target = PANELS[(i + (dCol > 0 ? 1 : -1) + PANELS.length) % PANELS.length];
      this.focus = target;
      const t = this.cursor[target];
      const trows = this.rows(target);
      t.row = Math.min(t.row, Math.max(0, trows.length - 1));
      t.col = trows.length ? (dCol > 0 ? 0 : trows[t.row].length - 1) : 0;
      return;
    }
    c.col = next;
  }

  // Returns 'deploy' | 'newRun' | null.
  handle(frame) {
    if (frame.nextPanelPressed) this.focus = PANELS[(PANELS.indexOf(this.focus) + 1) % PANELS.length];
    if (frame.navUpPressed) this.move(-1, 0);
    if (frame.navDownPressed) this.move(1, 0);
    if (frame.navLeftPressed) this.move(0, -1);
    if (frame.navRightPressed) this.move(0, 1);
    if (frame.decoyPressed && this.run.weapons.length > 1) this.run.weaponIndex = (this.run.weaponIndex + 1) % this.run.weapons.length;
    if (frame.craftPressed) this.activate(this.selected());
    if (frame.deployPressed) return 'deploy';
    if (frame.newRunPressed) return 'newRun';
    return null;
  }

  activate(item) {
    if (!item) return;
    const { run } = this;
    switch (item.kind) {
      case 'attribute': {
        const b = attributeBlocker(run, item.attribute.id);
        if (b) this.message = `${item.attribute.name}: ${b}`;
        else {
          spendAttribute(run, item.attribute.id);
          this.message = `${item.attribute.name} raised to ${run.attributes[item.attribute.id]}`;
        }
        return;
      }
      case 'slot':
        if (run.weapons[item.slot]) {
          run.weaponIndex = item.slot;
          this.message = `${WEAPONS[run.weapons[item.slot].id].name} is the active weapon`;
        } else {
          this.message = 'Empty slot: pick a gun below to equip it';
        }
        return;
      case 'equip':
        equipWeapon(run, item.weapon.id);
        this.message = run.weapons.some((w) => w.id === item.weapon.id) ? `Equipped ${item.weapon.name}` : `Unequipped ${item.weapon.name}`;
        return;
      case 'unlock': {
        const b = unlockBlocker(run, item.weapon.id);
        if (b) this.message = `${item.weapon.name}: ${b}`;
        else {
          unlockWeapon(run, item.weapon.id);
          this.message = `Unlocked and equipped ${item.weapon.name}`;
          const rows = this.rows('armory');
          const c = this.cursor.armory;
          c.row = Math.min(c.row, Math.max(0, rows.length - 1));
        }
        return;
      }
      case 'craft': {
        const b = craftBlocker(run, item.recipe);
        if (b) this.message = `${item.recipe.name}: ${b}`;
        else {
          craft(run, item.recipe);
          this.message = `Crafted ${item.recipe.name}`;
        }
        return;
      }
      default:
    }
  }
}
