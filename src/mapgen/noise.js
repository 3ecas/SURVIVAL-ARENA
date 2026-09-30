// Value noise with smooth interpolation, summed over a few octaves (fBm).

import { hash2 } from './rng.js';

const smooth = (t) => t * t * (3 - 2 * t);

export function valueNoise(x, y, scale, seed) {
  const gx = x / scale;
  const gy = y / scale;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const tx = smooth(gx - x0);
  const ty = smooth(gy - y0);
  const a = hash2(x0, y0, seed);
  const b = hash2(x0 + 1, y0, seed);
  const c = hash2(x0, y0 + 1, seed);
  const d = hash2(x0 + 1, y0 + 1, seed);
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
}

const SCALES = [7, 3.5, 1.8];
const WEIGHTS = [0.6, 0.28, 0.12];

export function fbm(x, y, seed) {
  let v = 0;
  for (let i = 0; i < SCALES.length; i++) v += WEIGHTS[i] * valueNoise(x, y, SCALES[i], seed + i * 101);
  return v;
}
