import { COLORS } from '../config.js';
import { Camera } from './camera.js';
import { WorldRenderer } from './world.js';
import { drawEntities } from './entities.js';
import { drawEffects } from './effects.js';
import { drawHud } from './hud.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camera = new Camera();
    this.worldRenderer = null;
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
    this.camera.resize(width, height);
  }

  render(game) {
    const { ctx } = this;
    if (!this.worldRenderer || this.worldRenderer.world !== game.world) {
      this.worldRenderer = new WorldRenderer(game.world);
    }
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.camera.follow(game.player, game.world.pixelWidth, game.world.pixelHeight, game.shake);
    ctx.save();
    this.camera.apply(ctx);
    this.worldRenderer.draw(ctx, game, this.camera);
    drawEntities(ctx, game);
    drawEffects(ctx, game);
    ctx.restore();

    drawHud(ctx, game, this.canvas.width, this.canvas.height);
  }
}
