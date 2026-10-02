// Grid coordinates, animation and connected-map placement are independent of rendering.
export const FACING_FRAMES = { down: 0, up: 1, left: 2, right: 2 };
export const WALK_FRAMES = {
  down: [3, 4],
  up: [5, 6],
  left: [7, 8],
  right: [7, 8],
};
export function actorFrame(
  dir,
  progress = 1,
  foot = 0,
  moving = false,
  frames = { facing: FACING_FRAMES, walk: WALK_FRAMES },
) {
  const facing = frames.facing[dir] ?? 0;
  // Every movement frame belongs to the same direction; right mirrors only the west frames.
  return {
    index:
      moving && progress < 0.72
        ? frames.walk[dir][foot % frames.walk[dir].length]
        : facing,
    flip: dir === "right",
  };
}
export class SceneGraph {
  constructor(maps) {
    this.maps = maps;
    this.placements = {};
    for (const id of Object.keys(maps)) {
      if (this.placements[id]) continue;
      this.placements[id] = { x: 0, y: 0, zone: id };
      const queue = [id];
      while (queue.length) {
        const current = queue.shift(),
          m = maps[current],
          origin = this.placements[current];
        for (const c of m.connections) {
          const to = this.resolve(c.map);
          if (!to || this.placements[to]) continue;
          const dest = maps[to];
          let x = origin.x,
            y = origin.y;
          if (c.direction === "up") {
            x += c.offset;
            y -= dest.height;
          }
          if (c.direction === "down") {
            x += c.offset;
            y += m.height;
          }
          if (c.direction === "left") {
            x -= dest.width;
            y += c.offset;
          }
          if (c.direction === "right") {
            x += m.width;
            y += c.offset;
          }
          this.placements[to] = { x, y, zone: origin.zone };
          queue.push(to);
        }
      }
    }
  }
  resolve(id) {
    const n = id.replace(/^MAP_/, "").replace(/_/g, "").toUpperCase();
    return Object.keys(this.maps).find(
      (k) => k.replace(/_/g, "").toUpperCase() === n,
    );
  }
  point(p) {
    const origin = this.placements[p.map];
    return {
      x: (origin.x + p.x) * 16,
      y: (origin.y + p.y) * 16,
      zone: origin.zone,
    };
  }
  visible(map, camera, width = 320, height = 224) {
    const zone = this.placements[map].zone;
    return Object.entries(this.placements)
      .filter(
        ([id, p]) =>
          p.zone === zone &&
          p.x * 16 < camera.x + width &&
          p.y * 16 < camera.y + height &&
          (p.x + this.maps[id].width) * 16 > camera.x &&
          (p.y + this.maps[id].height) * 16 > camera.y,
      )
      .map(([id]) => id);
  }
}
export class GridMotion {
  constructor(graph) {
    this.graph = graph;
    this.from = null;
    this.to = null;
    this.start = 0;
    this.duration = 0;
    this.foot = 0;
    this.dir = "down";
    this.running = false;
    this.jump = false;
  }
  snap(position) {
    this.from = this.graph.point(position);
    this.to = { ...position };
    this.duration = 0;
    this.dir = position.dir;
  }
  moving(now) {
    return this.to !== null && now - this.start < this.duration;
  }
  begin(
    from,
    to,
    now,
    {
      running = false,
      jump = false,
      duration,
      mode = running ? "run" : "walk",
      freezeAnimation = false,
      pose = "normal",
    } = {},
  ) {
    const a = this.graph.point(from),
      b = this.graph.point(to);
    this.dir = to.dir;
    this.running = running;
    this.mode = mode;
    this.jump = jump;
    this.freezeAnimation = freezeAnimation;
    this.pose = pose;
    if (a.zone !== b.zone || Math.abs(a.x - b.x) + Math.abs(a.y - b.y) > 32) {
      this.snap(to);
      return false;
    }
    this.sourcePosition = { ...from };
    this.from = a;
    this.to = { ...to };
    this.start = now;
    this.duration = jump ? 256 : (duration ?? (running ? 96 : 160));
    this.foot = (this.foot + 1) % 2;
    return true;
  }
  sample(position, now) {
    if (
      !this.to ||
      this.to.map !== position.map ||
      this.to.x !== position.x ||
      this.to.y !== position.y
    )
      this.snap(position);
    const end = this.graph.point(this.to),
      t = this.duration
        ? Math.max(0, Math.min(1, (now - this.start) / this.duration))
        : 1;
    return {
      x: this.from.x + (end.x - this.from.x) * t,
      y: this.from.y + (end.y - this.from.y) * t,
      zone: end.zone,
      progress: t,
      moving: t < 1,
      dir: t < 1 ? this.dir : position.dir,
      running: t < 1 && this.running,
      mode: this.mode || "walk",
      foot: this.foot,
      freezeAnimation: t < 1 && !!this.freezeAnimation,
      pose: t < 1 ? this.pose : "normal",
      lift: this.jump && t < 1 ? Math.sin(t * Math.PI) * 8 : 0,
    };
  }
}
