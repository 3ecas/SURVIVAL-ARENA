// Flow field: a breadth-first distance map from the target tile(s) over every
// walkable tile, plus a "next tile" pointer per tile that zombies follow.

const ORTHO = [[0, -1], [0, 1], [1, 0], [-1, 0]];
const ALL8 = [[0, -1], [0, 1], [1, 0], [-1, 0], [1, -1], [1, 1], [-1, -1], [-1, 1]];

export class FlowField {
  constructor(world) {
    this.world = world;
    const n = world.width * world.height;
    this.dist = new Int32Array(n).fill(-1);
    this.next = new Int32Array(n).fill(-1);
    this.queue = new Int32Array(n);
    this.targetKey = '';
  }

  // targets: array of { x, y } tiles.
  compute(targets) {
    const { world, dist, next, queue } = this;
    const w = world.width;
    const h = world.height;
    dist.fill(-1);
    next.fill(-1);

    let head = 0;
    let tail = 0;
    for (const t of targets) {
      if (!world.inBounds(t.x, t.y) || !world.isWalkable(t.x, t.y)) continue;
      const i = t.y * w + t.x;
      if (dist[i] !== -1) continue;
      dist[i] = 0;
      queue[tail++] = i;
    }

    while (head < tail) {
      const i = queue[head++];
      const x = i % w;
      const y = (i - x) / w;
      const d = dist[i] + 1;
      for (const [dx, dy] of ORTHO) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (dist[j] !== -1 || !world.isWalkable(nx, ny)) continue;
        dist[j] = d;
        queue[tail++] = j;
      }
    }

    // Choose the best neighbour (8-way, no corner cutting) per reachable tile.
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (dist[i] <= 0) continue;
        let best = -1;
        let bestD = dist[i];
        for (const [dx, dy] of ALL8) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (dist[j] < 0 || dist[j] >= bestD) continue;
          if (dx !== 0 && dy !== 0 && (!world.isWalkable(x + dx, y) || !world.isWalkable(x, y + dy))) continue;
          bestD = dist[j];
          best = j;
        }
        next[i] = best;
      }
    }
  }

  distanceAtTile(x, y) {
    return this.world.inBounds(x, y) ? this.dist[y * this.world.width + x] : -1;
  }

  // Unit vector toward the next tile centre, or null when at the target or unreachable.
  directionAt(wx, wy) {
    const { world } = this;
    const tx = Math.floor(wx / world.tileSize);
    const ty = Math.floor(wy / world.tileSize);
    if (!world.inBounds(tx, ty)) return null;
    const i = ty * world.width + tx;
    const n = this.next[i];
    if (n < 0) return null;
    const nx = n % world.width;
    const ny = (n - nx) / world.width;
    const c = world.tileCenter(nx, ny);
    const dx = c.x - wx;
    const dy = c.y - wy;
    const len = Math.hypot(dx, dy);
    return len > 0 ? { x: dx / len, y: dy / len } : null;
  }
}
