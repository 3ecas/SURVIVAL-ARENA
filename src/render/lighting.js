// Darkness overlay: fills the screen with near-black and cuts out the player
// glow, the flashlight cone and any room light that is on.

import { LIGHTING, COLORS } from '../config.js';

export class LightingRenderer {
  constructor() {
    this.layer = document.createElement('canvas');
    this.lctx = this.layer.getContext('2d');
  }

  resize(width, height) {
    this.layer.width = width;
    this.layer.height = height;
  }

  draw(ctx, game, camera) {
    const l = this.lctx;
    l.setTransform(1, 0, 0, 1, 0, 0);
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, this.layer.width, this.layer.height);
    l.fillStyle = `rgba(0,0,0,${LIGHTING.AMBIENT})`;
    l.fillRect(0, 0, this.layer.width, this.layer.height);

    l.globalCompositeOperation = 'destination-out';
    l.save();
    camera.apply(l);
    const ts = game.world.tileSize;
    for (const src of game.lighting.sources()) {
      if (src.kind === 'glow') cutCircle(l, src.x, src.y, src.radius);
      else cutPolygon(l, src, ts);
    }
    l.restore();
    l.globalCompositeOperation = 'source-over';

    ctx.drawImage(this.layer, 0, 0);
  }
}

function cutCircle(l, x, y, radius) {
  const g = l.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, COLORS.FLASHLIGHT);
  g.addColorStop(LIGHTING.FULL_BRIGHT_FRACTION, COLORS.FLASHLIGHT);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  l.fillStyle = g;
  l.beginPath();
  l.arc(x, y, radius, 0, Math.PI * 2);
  l.fill();
}

function cutPolygon(l, src, ts) {
  const pts = src.polygon;
  if (!pts || pts.length < 2) return;
  const g = l.createRadialGradient(src.x, src.y, 0, src.x, src.y, src.radius);
  g.addColorStop(0, COLORS.FLASHLIGHT);
  g.addColorStop(LIGHTING.FULL_BRIGHT_FRACTION, COLORS.FLASHLIGHT);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  l.fillStyle = g;
  l.beginPath();
  if (src.apex) l.moveTo(src.x, src.y);
  else l.moveTo(pts[0].x, pts[0].y);
  for (const p of pts) l.lineTo(p.x, p.y);
  l.closePath();
  l.fill();
  // Every wall piece the light reaches is lit as a whole block, with the
  // same falloff, so walls read as solid lit surfaces instead of slivers.
  for (const w of src.walls || []) l.fillRect(w.tx * ts, w.ty * ts, ts, ts);
}
