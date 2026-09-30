// The hub between levels: crafting, weapon selection, briefing and deploy.

import { RECIPES } from './data/recipes.js';
import { buildLevel } from './level.js';
import { craft, craftBlocker } from './systems/crafting.js';

export class Hub {
  constructor(run, meta) {
    this.run = run;
    this.meta = meta;
    this.cursor = 0;
    this.message = '';
    this.briefing = buildLevel(run.level, run.seed);
  }

  get recipes() {
    return RECIPES;
  }

  // Returns 'deploy' | 'newRun' | null.
  handle(frame) {
    if (frame.navUpPressed) this.cursor = (this.cursor - 1 + RECIPES.length) % RECIPES.length;
    if (frame.navDownPressed) this.cursor = (this.cursor + 1) % RECIPES.length;
    if (frame.decoyPressed && this.run.weapons.length > 1) {
      this.run.weaponIndex = (this.run.weaponIndex + 1) % this.run.weapons.length;
    }
    if (frame.craftPressed) {
      const recipe = RECIPES[this.cursor];
      const blocker = craftBlocker(this.run, recipe);
      if (blocker) this.message = `Cannot craft ${recipe.name}: ${blocker}`;
      else if (craft(this.run, recipe)) this.message = `Crafted ${recipe.name}`;
    }
    if (frame.deployPressed) return 'deploy';
    if (frame.newRunPressed) return 'newRun';
    return null;
  }
}
