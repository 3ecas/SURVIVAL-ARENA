import { COLORS } from '../config.js';
import { Camera } from './camera.js';
import { WorldRenderer } from './world.js';
import { drawEntities } from './entities.js';
import { drawEffects } from './effects.js';
import { LightingRenderer } from './lighting.js';
import { drawHud } from './hud.js';
import { drawHub } from './hub.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera();
    this.worldRenderer = null;
    this.lightingRenderer = new LightingRenderer();
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
    this.lightingRenderer.resize(width, height);
  }

  beginLevel(game) {
    this.worldRenderer = new WorldRenderer(game.world);
    this.camera.snapTo(game.player, game.world.pixelWidth, game.world.pixelHeight);
  }

  render(game, dt) {
    const { ctx } = this;
    if (!this.worldRenderer || this.worldRenderer.world !== game.world) this.beginLevel(game);
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.camera.follow(game.player, game.aim, game.world.pixelWidth, game.world.pixelHeight, game.shake, dt);
    ctx.save();
    this.camera.apply(ctx);
    this.worldRenderer.draw(ctx, game, this.camera);
    drawEntities(ctx, game);
    drawEffects(ctx, game);
    ctx.restore();

    this.lightingRenderer.draw(ctx, game, this.camera);
    drawHud(ctx, game, this.canvas.width, this.canvas.height);
  }

  renderHub(hub) {
    drawHub(this.ctx, hub, this.canvas.width, this.canvas.height);
  }
}
