// Bootstrap and the fixed-step game loop.

import { LOOP } from './config.js';
import { Game } from './game.js';
import { Input } from './input.js';
import { Renderer } from './render/renderer.js';
import { MAPS, DEFAULT_MAP } from './data/maps.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input(canvas);

const mapIds = Object.keys(MAPS);
const requested = new URLSearchParams(window.location.search).get('map');
let mapId = MAPS[requested] ? requested : DEFAULT_MAP;
let game = new Game(mapId);

function startGame(id) {
  mapId = id;
  game = new Game(id);
  accumulator = 0;
  const url = new URL(window.location.href);
  url.searchParams.set('map', id);
  window.history.replaceState(null, '', url);
}

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
  if (intent.switchMapPressed) {
    startGame(mapIds[(mapIds.indexOf(mapId) + 1) % mapIds.length]);
    intent = Input.withoutEdges(intent);
  } else if (game.state === 'gameover' && intent.restartPressed) {
    startGame(mapId);
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
