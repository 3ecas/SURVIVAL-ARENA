// Small flat vector icons drawn with canvas primitives. Every icon is drawn
// centred on (x, y) inside a box of `size` pixels.

export function drawIcon(ctx, name, x, y, size, color, color2 = null) {
  const fn = ICONS[name];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24); // icons are designed in a 24 px box
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  fn(ctx, color, color2 || color);
  ctx.restore();
}

const path = (ctx, pts, close = true) => {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
};

const circle = (ctx, cx, cy, r) => {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
};

// Gun silhouettes: barrel, receiver, grip, magazine. Facing right.
function gun(ctx, color, { barrel = 10, stock = 0, mag = 5, scope = false, heavy = false, round = false }) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const left = -11 - stock;
  // receiver
  ctx.fillRect(-7, -3, 11, 5);
  // barrel
  ctx.fillRect(4, -2.5, barrel, heavy ? 3.5 : 2.5);
  // stock
  if (stock) path(ctx, [[-7, -3], [left, -1], [left, 3], [-7, 2]]), ctx.fill();
  // grip
  path(ctx, [[-4, 2], [-1, 2], [-3, 8], [-6, 8]]);
  ctx.fill();
  // magazine
  if (mag) {
    path(ctx, [[0, 2], [4, 2], [4.5, 2 + mag], [0.5, 2 + mag]]);
    ctx.fill();
  }
  if (scope) ctx.fillRect(-4, -6, 6, 2.5);
  if (round) {
    circle(ctx, 10 + barrel * 0.5, -1.5, 3);
    ctx.fill();
  }
}

export const ICONS = {
  pistol: (ctx, c) => gun(ctx, c, { barrel: 6, mag: 4 }),
  shotgun: (ctx, c) => gun(ctx, c, { barrel: 13, stock: 4, mag: 0, heavy: true }),
  smg: (ctx, c) => gun(ctx, c, { barrel: 7, stock: 2, mag: 8 }),
  rifle: (ctx, c) => gun(ctx, c, { barrel: 12, stock: 5, mag: 6, scope: true }),
  lmg: (ctx, c) => gun(ctx, c, { barrel: 13, stock: 4, mag: 7, heavy: true }),
  launcher: (ctx, c) => {
    ctx.fillStyle = c;
    ctx.fillRect(-11, -3, 22, 6);
    path(ctx, [[-2, 3], [2, 3], [0, 9]]);
    ctx.fill();
    path(ctx, [[11, -4], [15, -1.5], [11, 1]]);
    ctx.fill();
  },
  energy: (ctx, c, c2) => {
    gun(ctx, c, { barrel: 9, stock: 3, mag: 0 });
    ctx.fillStyle = c2;
    circle(ctx, 9, -1.5, 3);
    ctx.fill();
  },
  knife: (ctx, c) => {
    ctx.fillStyle = c;
    path(ctx, [[-10, 6], [-6, 2], [2, -6], [10, -10], [6, -2], [-2, 6]]);
    ctx.fill();
    ctx.fillRect(-11, 5, 5, 5);
  },
  heart: (ctx, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-12, 0, -8, -10, 0, -4);
    ctx.bezierCurveTo(8, -10, 12, 0, 0, 9);
    ctx.fill();
  },
  speed: (ctx, c) => {
    ctx.fillStyle = c;
    path(ctx, [[-2, -10], [8, -1], [2, -1], [4, 10], [-8, 0], [-2, 0]]);
    ctx.fill();
  },
  reload: (ctx, c) => {
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 7.5, -Math.PI * 0.35, Math.PI * 1.1);
    ctx.stroke();
    path(ctx, [[3, -11], [10, -6], [3, -1]]);
    ctx.fill();
  },
  power: (ctx, c) => {
    ctx.fillStyle = c;
    // bullet
    path(ctx, [[-9, -3], [3, -3], [9, 0], [3, 3], [-9, 3]]);
    ctx.fill();
    ctx.fillRect(-11, -4, 3, 8);
  },
  bandage: (ctx, c, c2) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 20, 4);
    ctx.fill();
    ctx.fillStyle = c2;
    ctx.fillRect(-2, -7, 4, 14);
    ctx.fillRect(-7, -2, 14, 4);
  },
  grenade: (ctx, c, c2) => {
    ctx.fillStyle = c;
    circle(ctx, 0, 2, 8);
    ctx.fill();
    ctx.fillStyle = c2;
    ctx.fillRect(-3, -10, 6, 4);
    ctx.fillRect(3, -11, 5, 2);
  },
  decoy: (ctx, c) => {
    ctx.fillStyle = c;
    ctx.strokeStyle = c;
    circle(ctx, 0, 0, 4);
    ctx.fill();
    ctx.lineWidth = 1.5;
    circle(ctx, 0, 0, 8);
    ctx.stroke();
    circle(ctx, 0, 0, 11.5);
    ctx.stroke();
  },
  scrap: (ctx, c) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const r = i % 2 === 0 ? 11 : 8;
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    circle(ctx, 0, 0, 3.5);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  },
  cloth: (ctx, c, c2) => {
    ctx.fillStyle = c;
    path(ctx, [[-10, -7], [10, -7], [10, 7], [-10, 7]]);
    ctx.fill();
    ctx.strokeStyle = c2;
    ctx.lineWidth = 1.5;
    path(ctx, [[-10, -2], [10, -2]], false);
    ctx.stroke();
    path(ctx, [[-10, 3], [10, 3]], false);
    ctx.stroke();
  },
  parts: (ctx, c) => {
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
    ctx.lineWidth = 3.5;
    path(ctx, [[-8, 8], [4, -4]], false);
    ctx.stroke();
    circle(ctx, 6, -6, 5);
    ctx.fill();
    ctx.globalCompositeOperation = 'destination-out';
    circle(ctx, 6, -6, 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillRect(-11, 5, 5, 6);
  },
  ammo: (ctx, c, c2) => {
    ctx.fillStyle = c;
    ctx.fillRect(-10, -6, 20, 13);
    ctx.fillStyle = c2;
    ctx.fillRect(-2, -6, 4, 13);
  },
  medkit: (ctx, c, c2) => {
    ctx.fillStyle = c;
    ctx.fillRect(-10, -7, 20, 15);
    ctx.fillRect(-4, -10, 8, 3);
    ctx.fillStyle = c2;
    ctx.fillRect(-1.5, -4, 3, 9);
    ctx.fillRect(-4.5, -1, 9, 3);
  },
  lock: (ctx, c) => {
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, -3, 5, Math.PI, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-8, -3, 16, 12, 2);
    ctx.fill();
  },
  zombie: (ctx, c, c2) => {
    ctx.fillStyle = c;
    circle(ctx, 0, 0, 10);
    ctx.fill();
    ctx.fillStyle = c2;
    circle(ctx, 0, 0, 4.5);
    ctx.fill();
  },
  runner: (ctx, c, c2) => {
    ctx.fillStyle = c;
    circle(ctx, 2, 0, 9);
    ctx.fill();
    ctx.fillStyle = c2;
    circle(ctx, 2, 0, 4);
    ctx.fill();
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    path(ctx, [[-12, -4], [-7, -4]], false);
    ctx.stroke();
    path(ctx, [[-12, 1], [-8, 1]], false);
    ctx.stroke();
    path(ctx, [[-12, 6], [-6, 6]], false);
    ctx.stroke();
  },
  coin: (ctx, c, c2) => {
    ctx.fillStyle = c;
    circle(ctx, 0, 0, 10);
    ctx.fill();
    ctx.fillStyle = c2;
    circle(ctx, 0, 0, 6.5);
    ctx.fill();
    ctx.fillStyle = c;
    circle(ctx, 0, 0, 3);
    ctx.fill();
  },
  xp: (ctx, c) => {
    ctx.fillStyle = c;
    path(ctx, [[0, -10], [10, 0], [5, 0], [5, 9], [-5, 9], [-5, 0], [-10, 0]]);
    ctx.fill();
  },
  rounds: (ctx, c) => {
    ctx.strokeStyle = c;
    ctx.fillStyle = c;
    ctx.lineWidth = 2.5;
    circle(ctx, 0, 0, 10);
    ctx.stroke();
    circle(ctx, 0, 0, 5.5);
    ctx.stroke();
    circle(ctx, 0, 0, 1.8);
    ctx.fill();
  },
  map: (ctx, c) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 2;
    ctx.strokeRect(-10, -10, 20, 20);
    path(ctx, [[-10, -2], [2, -2], [2, 10]], false);
    ctx.stroke();
    path(ctx, [[2, -10], [2, -6]], false);
    ctx.stroke();
    path(ctx, [[-4, -2], [-4, 10]], false);
    ctx.stroke();
  },
  door: (ctx, c, c2) => {
    ctx.fillStyle = c;
    ctx.fillRect(-7, -11, 14, 22);
    ctx.fillStyle = c2;
    circle(ctx, 3.5, 1, 1.6);
    ctx.fill();
  },
  window: (ctx, c, c2) => {
    ctx.fillStyle = c;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.fillStyle = c2;
    ctx.fillRect(-8, -7, 16, 3);
    ctx.fillRect(-8, -1.5, 16, 3);
    ctx.fillRect(-8, 4, 16, 3);
  },
  light: (ctx, c, c2) => {
    ctx.fillStyle = c;
    circle(ctx, 0, -2, 7);
    ctx.fill();
    ctx.fillStyle = c2;
    ctx.fillRect(-3, 5, 6, 4);
    ctx.fillRect(-2, 9, 4, 2);
  },
  skull: (ctx, c, c2) => {
    ctx.fillStyle = c;
    circle(ctx, 0, -2, 9);
    ctx.fill();
    ctx.fillRect(-5, 3, 10, 7);
    ctx.fillStyle = c2;
    circle(ctx, -3.5, -3, 2.5);
    ctx.fill();
    circle(ctx, 3.5, -3, 2.5);
    ctx.fill();
    ctx.fillRect(-2.5, 5, 1.5, 4);
    ctx.fillRect(1, 5, 1.5, 4);
  },
  arrowUp: (ctx, c) => {
    ctx.fillStyle = c;
    path(ctx, [[0, -9], [9, 2], [3, 2], [3, 9], [-3, 9], [-3, 2], [-9, 2]]);
    ctx.fill();
  },
  check: (ctx, c) => {
    ctx.strokeStyle = c;
    ctx.lineWidth = 3.5;
    path(ctx, [[-9, 0], [-3, 7], [10, -8]], false);
    ctx.stroke();
  },
  play: (ctx, c) => {
    ctx.fillStyle = c;
    path(ctx, [[-7, -9], [9, 0], [-7, 9]]);
    ctx.fill();
  },
};

// Fire-mode glyphs used by the HUD and the hub.
export function drawFireModeIcon(ctx, mode, cx, cy, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  const dot = (dx) => {
    ctx.beginPath();
    ctx.arc(cx + dx, cy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  };
  if (mode === 'single') {
    dot(0);
  } else if (mode === 'burst') {
    dot(-6); dot(0); dot(6);
  } else if (mode === 'auto') {
    dot(-6); dot(0); dot(6);
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy + 6);
    ctx.lineTo(cx + 10, cy + 6);
    ctx.stroke();
  } else if (mode === 'explosive') {
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 6, cy + Math.sin(a) * 6);
      ctx.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9);
      ctx.stroke();
    }
  }
}
