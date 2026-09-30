#!/usr/bin/env node
// Validates generated levels across sizes and seeds: every area reachable
// through doors, every window opens into a room with void behind it, the
// entrance opens into area 0, lights sit on open floor. Exit 1 on failure.
//   node tools/check-map.js            # levels 1-10, run seeds 1-5
//   node tools/check-map.js 12 20      # levels 1-12, run seeds 1-20

import { levelParams, MAX_LEVEL_FOR_SIZE } from '../src/level.js';
import { generateMapWithRetries } from '../src/mapgen/generator.js';
import { checkMap } from '../src/mapgen/validate.js';

const maxLevel = Number(process.argv[2] || MAX_LEVEL_FOR_SIZE + 1);
const seeds = Number(process.argv[3] || 5);
let failed = 0;
let checked = 0;
let retriesTotal = 0;
const started = Date.now();
for (let level = 1; level <= maxLevel; level++) {
  for (let runSeed = 1; runSeed <= seeds; runSeed++) {
    const params = levelParams(level, runSeed);
    const out = generateMapWithRetries(params);
    if (!out) {
      console.error(`level ${level} seed ${runSeed}: no valid map in 200 tries`);
      failed++;
      continue;
    }
    retriesTotal += out.seed - params.seed;
    const { errors, warnings } = checkMap(out.map);
    checked++;
    for (const w of warnings) console.log(`level ${level} seed ${runSeed}: warning: ${w}`);
    for (const e of errors) console.error(`level ${level} seed ${runSeed}: error: ${e}`);
    if (errors.length) failed++;
  }
}
console.log(`${checked} generated maps checked in ${((Date.now() - started) / 1000).toFixed(1)}s, ${retriesTotal} seed retries, ${failed} failure(s).`);
process.exit(failed ? 1 : 0);
