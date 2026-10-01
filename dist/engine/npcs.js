import { DIRECTIONS } from "./world.js";
// Ambient NPC simulation has its own random stream, so walking never changes battle RNG.
export class NPCSystem {
  constructor(maps, definitions, { random = Math.random } = {}) {
    Object.assign(this, { maps, definitions, random });
    this.states = new Map();
    this.now = 0;
    this.activeMap = null;
  }
  state(map, def) {
    const key = map + ":" + def.id;
    let n = this.states.get(key);
    if (!n) {
      n = {
        ...def,
        originX: def.x,
        originY: def.y,
        fromX: def.x,
        fromY: def.y,
        toX: def.x,
        toY: def.y,
        start: 0,
        duration: 0,
        foot: 0,
        next: this.now + 500 + this.random() * 2000,
      };
      this.states.set(key, n);
    } else Object.assign(n, { text: def.text, name: def.name, kind: def.kind });
    return n;
  }
  objects(map) {
    return this.definitions(map).map((def) => this.state(map, def));
  }
  moving(n, now = this.now) {
    return now - n.start < n.duration;
  }
  reserved(n) {
    return this.moving(n)
      ? [
          { x: n.x, y: n.y },
          { x: n.fromX, y: n.fromY },
        ]
      : [{ x: n.x, y: n.y }];
  }
  view(map, now = this.now) {
    return this.objects(map).map((n) => {
      const t = n.duration
        ? Math.min(1, Math.max(0, (now - n.start) / n.duration))
        : 1;
      const inPlace = n.movement?.mode === "jog";
      return {
        ...n,
        px: (n.fromX + (n.toX - n.fromX) * t) * 16,
        py: (n.fromY + (n.toY - n.fromY) * t) * 16,
        progress: inPlace ? (now % 160) / 160 : t,
        moving: this.moving(n, now) || inPlace,
      };
    });
  }
  face(id, map, direction) {
    const n = this.objects(map).find((n) => n.id === id);
    if (n) {
      n.dir = direction;
      n.fromX = n.toX = n.x;
      n.fromY = n.toY = n.y;
      n.duration = 0;
      n.next = this.now + 1600;
    }
  }
  tick(
    now,
    player,
    { paused = false, maps = [player.map], playerFrom = null } = {},
  ) {
    const delta = this.now ? Math.max(0, now - this.now) : 0;
    this.now = now;
    this.activeMap = player.map;
    for (const map of maps) {
      const npcs = this.objects(map),
        m = this.maps[map];
      for (const n of npcs) {
        if (paused) {
          if (this.moving(n, now)) n.start += delta;
          n.next += delta;
          continue;
        }
        const config = n.movement || { mode: "still" };
        if (config.mode === "jog") {
          n.dir = config.dir || n.dir;
          continue;
        }
        if (this.moving(n, now) || now < n.next || config.mode === "still")
          continue;
        n.next = now + 800 + this.random() * 1700;
        let directions =
          config.mode === "horizontal"
            ? ["left", "right"]
            : config.mode === "vertical"
              ? ["up", "down"]
              : ["down", "up", "left", "right"];
        if (config.mode === "patrol") directions = config.path || directions;
        const dir = directions[Math.floor(this.random() * directions.length)];
        n.dir = dir;
        if (config.mode === "look" || this.random() < 0.22) continue;
        const [dx, dy] = DIRECTIONS[dir],
          x = n.x + dx,
          y = n.y + dy;
        const rangeX = config.rangeX ?? 1,
          rangeY = config.rangeY ?? 1;
        if (
          Math.abs(x - n.originX) > rangeX ||
          Math.abs(y - n.originY) > rangeY ||
          x < 0 ||
          y < 0 ||
          x >= m.width ||
          y >= m.height
        )
          continue;
        const i = y * m.width + x;
        if (
          ((m.blocks[i] >> 10) & 3) !== 0 ||
          [16, 17, 18, 19, 20, 21, 56, 57, 58, 59].includes(m.behavior[i]) ||
          m.warps.some((w) => w.x === x && w.y === y)
        )
          continue;
        if (
          npcs.some(
            (other) =>
              other !== n &&
              this.reserved(other).some((p) => p.x === x && p.y === y),
          )
        )
          continue;
        if (
          map === player.map &&
          ((player.x === x && player.y === y) ||
            (playerFrom?.map === map &&
              playerFrom.x === x &&
              playerFrom.y === y))
        )
          continue;
        n.fromX = n.x;
        n.fromY = n.y;
        n.x = n.toX = x;
        n.y = n.toY = y;
        n.start = now;
        n.duration = 256;
        n.foot = (n.foot + 1) % 2;
      }
    }
  }
}
