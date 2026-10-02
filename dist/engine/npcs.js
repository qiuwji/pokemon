import { NPCBehaviorRegistry } from "./npc-behaviors.js";
import { isWater, ledgeDirection } from "./terrain.js";
import { DIRECTIONS } from "./world.js";
// Ambient NPC simulation has its own random stream, so walking never changes battle RNG.
export class NPCSystem {
  constructor(
    maps,
    definitions,
    {
      random = Math.random,
      behaviors = new NPCBehaviorRegistry(),
      onError = () => {},
    } = {},
  ) {
    Object.assign(this, { maps, definitions, random, behaviors, onError });
    this.states = new Map();
    this.now = 0;
    this.activeMap = null;
    this.scene = null;
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
    const objects = new Map(
      this.definitions(map).map((def) => [def.id, this.state(map, def)]),
    );
    // Remove actors no longer present in conditional content, except current scene pins.
    const live = new Set(objects.keys());
    for (const key of this.states.keys())
      if (
        key.startsWith(map + ":") &&
        !live.has(key.slice(map.length + 1)) &&
        !this.scene?.pins.has(key)
      )
        this.states.delete(key);
    if (this.scene) {
      for (const [key, n] of this.scene.pins)
        if (key.startsWith(map + ":")) objects.set(n.id, n);
      for (const id of objects.keys())
        if (this.scene.hidden.has(map + ":" + id)) objects.delete(id);
    }
    return [...objects.values()];
  }
  clear() {
    this.states.clear();
    this.scene = null;
    this.activeMap = null;
    this.now = 0;
  }
  beginScene() {
    if (this.scene) throw new Error("NPC scene scope is already active");
    this.scene = { pins: new Map(), hidden: new Set() };
  }
  endScene() {
    if (this.scene)
      for (const n of this.scene.pins.values()) {
        n.fromX = n.toX = n.x;
        n.fromY = n.toY = n.y;
        n.duration = 0;
        n.next = this.now + 1600;
      }
    this.scene = null;
  }
  control(id, map) {
    if (!this.scene) throw new Error("NPC control requires a scene scope");
    const n = this.objects(map).find((n) => n.id === id);
    if (!n) throw new Error(`Missing scene actor ${map}:${id}`);
    this.scene.pins.set(map + ":" + id, n);
    return n;
  }
  hide(id, map) {
    this.control(id, map);
    this.scene.hidden.add(map + ":" + id);
  }
  stage(map, def) {
    if (!this.scene) throw new Error("Staging actors requires a scene scope");
    const base = this.objects(map).find((n) => n.id === def.id);
    const n = {
      ...base,
      ...def,
      originX: def.x,
      originY: def.y,
      fromX: def.x,
      fromY: def.y,
      toX: def.x,
      toY: def.y,
      duration: 0,
      start: 0,
      foot: 0,
      next: this.now + 1600,
      movement: base?.movement || { mode: "still" },
    };
    this.states.set(map + ":" + def.id, n);
    this.scene.pins.set(map + ":" + def.id, n);
    this.scene.hidden.delete(map + ":" + def.id);
    return n;
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
      const inPlace = ["jog", "cheer"].includes(n.pose || n.movement?.mode);
      const bounce = ["hop", "cheer"].includes(n.pose)
        ? Math.max(0, Math.sin(now / 130)) * 4
        : 0;
      return {
        ...n,
        px: (n.fromX + (n.toX - n.fromX) * t) * 16,
        py: (n.fromY + (n.toY - n.fromY) * t) * 16,
        progress: inPlace ? (now % 160) / 160 : t,
        moving: this.moving(n, now) || inPlace,
        lift: (n.jump && t < 1 ? Math.sin(t * Math.PI) * 8 : 0) + bounce,
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
        // Scripted tracks advance on the timeline while ambient simulation is paused.
        if (this.scene?.pins.has(map + ":" + n.id)) continue;
        if (paused) {
          if (this.moving(n, now)) n.start += delta;
          n.next += delta;
          continue;
        }
        const config = n.movement || { mode: "still" };
        if (this.moving(n, now) || now < n.next) continue;
        n.next = now + 800 + this.random() * 1700;
        let intent;
        try {
          intent = this.behaviors.decide(config.mode, {
            config,
            dir: n.dir,
            now,
            position: { x: n.x, y: n.y },
            origin: { x: n.originX, y: n.originY },
            rolls: [this.random(), this.random()],
          });
        } catch (error) {
          this.onError(error);
          continue;
        }
        n.pose = intent.pose;
        const dir = intent.dir || n.dir;
        n.dir = dir;
        if (!intent.move) continue;
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
          isWater(m.behavior[i]) ||
          ledgeDirection(m.behavior[i]) ||
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
        n.duration = intent.duration || 256;
        n.foot = (n.foot + 1) % 2;
      }
    }
  }
}
