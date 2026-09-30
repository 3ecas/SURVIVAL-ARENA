// Registry of playable maps. Select one with ?map=<id> in the URL or the M key.

import { MAP as ARENA } from './map.js';
import { MAP as CAVES } from './map-caves.js';

export const MAPS = {
  arena: ARENA,
  caves: CAVES,
};

export const DEFAULT_MAP = 'arena';
