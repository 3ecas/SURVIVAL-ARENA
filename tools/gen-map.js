#!/usr/bin/env node
// Prints a generated level so you can eyeball the generator.
//   node tools/gen-map.js            # level 1, run seed 1
//   node tools/gen-map.js 5 42       # level 5, run seed 42

import { levelParams } from '../src/level.js';
import { generateMapWithRetries } from '../src/mapgen/generator.js';
import { checkMap } from '../src/mapgen/validate.js';

const level = Number(process.argv[2] || 1);
const runSeed = Number(process.argv[3] || 1);
const params = levelParams(level, runSeed);
const out = generateMapWithRetries(params);
if (!out) {
  console.error('No valid map found for', params);
  process.exit(1);
}
const { stats, warnings } = checkMap(out.map);
console.log(out.map.rows.join('\n'));
console.log(`\nlevel ${level}, run seed ${runSeed} -> map seed ${out.seed}: ${stats.width}x${stats.height}, ${stats.areas} areas, ${stats.doors} doors, ${stats.windows} windows, ${stats.lights} lights, ${stats.floorTiles} floor tiles`);
for (const w of warnings) console.log(`warning: ${w}`);
