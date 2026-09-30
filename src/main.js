// Bootstrap, the hub <-> level state machine and the fixed-step game loop.

import { LOOP } from './config.js';
import { Game } from './game.js';
import { Hub } from './hub.js';
import { Input } from './input.js';
import { Renderer } from './render/renderer.js';
import { loadState, saveState, newRunState, newMeta, applyLevelResult } from './run.js';

const canvas = document.getElementById('game');
const renderer = new Renderer(canvas);
const input = new Input(canvas);

const saved = loadState();
let run = saved ? saved.run : newRunState();
let meta = saved ? saved.meta : newMeta();
let hub = new Hub(run, meta);
let game = null;
let mode = 'hub'; // 'hub' | 'level'

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

function deploy() {
  game = new Game(hub.briefing, run);
  mode = 'level';
  accumulator = 0;
  renderer.beginLevel(game);
}

function startNewRun() {
  run = newRunState();
  hub = new Hub(run, meta);
  saveState(run, meta);
}

function finishLevel() {
  const cleared = game.state === 'complete';
  run = applyLevelResult(run, meta, game.player, { cleared, level: game.level, xpEarned: game.xpEarned });
  saveState(run, meta);
  hub = new Hub(run, meta);
  game = null;
  mode = 'hub';
}

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const dt = Math.min(LOOP.MAX_FRAME_DT, (now - last) / 1000);
  last = now;
  let intent = input.getFrame();

  if (mode === 'hub') {
    const action = hub.handle(intent);
    if (action === 'deploy') deploy();
    else if (action === 'newRun') startNewRun();
    else saveState(run, meta);
    if (mode === 'hub') renderer.renderHub(hub);
  }

  if (mode === 'level') {
    accumulator += dt;
    const wantsOut = game.endTimer > 1 && (intent.craftPressed || intent.deployPressed || intent.firePressed);
    if (game.state !== 'playing' && (wantsOut || game.autoReturnDue)) {
      finishLevel();
      renderer.renderHub(hub);
    } else {
      game.setAim(renderer.camera.screenToWorld(intent.aimScreen));
      let steps = 0;
      while (accumulator >= LOOP.FIXED_STEP && steps < LOOP.MAX_STEPS_PER_FRAME) {
        game.update(LOOP.FIXED_STEP, intent);
        intent = Input.withoutEdges(intent);
        accumulator -= LOOP.FIXED_STEP;
        steps++;
      }
      if (steps === LOOP.MAX_STEPS_PER_FRAME) accumulator = 0;
      renderer.render(game, dt);
    }
  }

  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

// Handy for debugging from the browser console.
window.__game = () => game;
window.__hub = () => hub;
