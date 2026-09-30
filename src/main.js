// Bootstrap and the fixed-step game loop.

import { LOOP } from './config.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { Renderer } from './render/renderer.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input(canvas);
let game = new Game();

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const dt = Math.min(LOOP.MAX_FRAME_DT, (now - last) / 1000);
  last = now;
  accumulator += dt;

  let intent = input.getFrame();
  if (game.state === 'gameover' && intent.restartPressed) {
    game = new Game();
    accumulator = 0;
    intent = Input.withoutEdges(intent);
  }
  game.setAim(renderer.camera.screenToWorld(intent.aimScreen));

  let steps = 0;
  while (accumulator >= LOOP.FIXED_STEP && steps < LOOP.MAX_STEPS_PER_FRAME) {
    game.update(LOOP.FIXED_STEP, intent);
    intent = Input.withoutEdges(intent);
    accumulator -= LOOP.FIXED_STEP;
    steps++;
  }
  if (steps === LOOP.MAX_STEPS_PER_FRAME) accumulator = 0;

  renderer.render(game);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Handy for debugging from the browser console.
window.__game = () => game;
