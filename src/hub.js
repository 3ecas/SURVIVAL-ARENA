// The hub between levels. Three sections: next map (read only), gear &
// inventory (attributes, loadout), armory (unlocks, crafting).

import { RECIPES } from './data/recipes.js';
import { ARMORY_ORDER } from './data/armory.js';
import { ATTRIBUTES } from './data/attributes.js';
import { WEAPONS } from './data/weapons.js';
import { buildLevel } from './level.js';
import { craft, craftBlocker, unlockBlocker, unlockWeapon, equipWeapon, isUnlocked, attributeBlocker, spendAttribute } from './systems/crafting.js';

export class Hub {
  constructor(run, meta) {
    this.run = run;
    this.meta = meta;
    this.focus = 'gear'; // 'gear' | 'armory'
    this.cursor = { gear: 0, armory: 0 };
    this.message = '';
    this.briefing = buildLevel(run.level, run.seed);
  }

  // Rows the cursor can sit on in each section.
  gearRows() {
    const rows = ATTRIBUTES.map((a) => ({ kind: 'attribute', attribute: a }));
    for (const id of this.run.unlocked) rows.push({ kind: 'equip', weapon: WEAPONS[id] });
    return rows;
  }

  armoryRows() {
    const rows = ARMORY_ORDER.filter((id) => !isUnlocked(this.run, id)).map((id) => ({ kind: 'unlock', weapon: WEAPONS[id] }));
    for (const r of RECIPES) rows.push({ kind: 'craft', recipe: r });
    return rows;
  }

  rows(section = this.focus) {
    return section === 'gear' ? this.gearRows() : this.armoryRows();
  }

  selected() {
    const rows = this.rows();
    return rows[Math.min(this.cursor[this.focus], rows.length - 1)] || null;
  }

  // Returns 'deploy' | 'newRun' | null.
  handle(frame) {
    if (frame.nextPanelPressed || frame.navRightPressed || frame.navLeftPressed) this.focus = this.focus === 'gear' ? 'armory' : 'gear';
    const rows = this.rows();
    if (frame.navUpPressed) this.cursor[this.focus] = (this.cursor[this.focus] - 1 + rows.length) % rows.length;
    if (frame.navDownPressed) this.cursor[this.focus] = (this.cursor[this.focus] + 1) % rows.length;
    if (frame.decoyPressed && this.run.weapons.length > 1) this.run.weaponIndex = (this.run.weaponIndex + 1) % this.run.weapons.length;
    if (frame.craftPressed) this.activate(this.selected());
    if (frame.deployPressed) return 'deploy';
    if (frame.newRunPressed) return 'newRun';
    return null;
  }

  activate(row) {
    if (!row) return;
    const { run } = this;
    switch (row.kind) {
      case 'attribute': {
        const b = attributeBlocker(run, row.attribute.id);
        this.message = b ? `${row.attribute.name}: ${b}` : (spendAttribute(run, row.attribute.id), `${row.attribute.name} raised to ${run.attributes[row.attribute.id]}`);
        return;
      }
      case 'equip':
        equipWeapon(run, row.weapon.id);
        this.message = run.weapons.some((w) => w.id === row.weapon.id) ? `Equipped ${row.weapon.name}` : `Unequipped ${row.weapon.name}`;
        return;
      case 'unlock': {
        const b = unlockBlocker(run, row.weapon.id);
        if (b) {
          this.message = `${row.weapon.name}: ${b}`;
        } else {
          unlockWeapon(run, row.weapon.id);
          this.message = `Unlocked and equipped ${row.weapon.name}`;
          this.cursor.armory = Math.min(this.cursor.armory, this.armoryRows().length - 1);
        }
        return;
      }
      case 'craft': {
        const b = craftBlocker(run, row.recipe);
        this.message = b ? `${row.recipe.name}: ${b}` : (craft(run, row.recipe), `Crafted ${row.recipe.name}`);
        return;
      }
      default:
    }
  }
}
