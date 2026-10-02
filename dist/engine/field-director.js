import { FIELD_EMOTES } from "./presentation-cues.js";
import { World, DIRECTIONS } from "./world.js";
import { findRoute } from "./pathfinding.js";

/** Cutscene choreography over injected field/camera/clock ports; no game-specific IDs. */
export class FieldDirector {
  constructor({ field, timeline, camera, reducedMotion = () => false }) {
    Object.assign(this, { field, timeline, camera, reducedMotion });
    this.active = false;
    this.emotes = new Map();
  }
  begin() {
    if (this.active) throw new Error("A field cutscene is already active");
    this.field.npcs.beginScene();
    this.active = true;
  }
  async end({ failed = false } = {}) {
    try {
      if (!failed && this.camera.mode === "hold")
        await this.camera.follow(this.playerPoint(), this.duration(220));
    } finally {
      this.camera.reset();
      this.emotes.clear();
      this.field.npcs.endScene();
      this.active = false;
    }
  }
  duration(ms) {
    return this.reducedMotion() ? Math.min(ms, 100) : ms;
  }
  playerPoint() {
    return this.field.motion.sample(this.field.position, this.timeline.now());
  }
  actor(id) {
    if (!this.active)
      throw new Error("Field choreography requires an active scene");
    if (id === "player") return this.field.position;
    const map = this.field.position.map;
    return { ...this.field.npcs.control(id, map), map };
  }
  async ready(id) {
    if (id === "player") return;
    const n = this.field.npcs.control(id, this.field.position.map);
    const remaining = n.duration - (this.timeline.now() - n.start);
    if (remaining > 0) await this.timeline.wait(remaining);
  }
  objects(map, actor, allowVacatedBy = null) {
    const objects = this.field.npcs
      .objects(map)
      .filter((n) => n.id !== actor)
      .map((n) => ({
        ...n,
        reserved: n.id === allowVacatedBy ? [] : this.field.npcs.reserved(n),
      }));
    if (actor !== "player" && this.field.position.map === map)
      objects.push({ ...this.field.position, id: "player" });
    return objects;
  }
  route(id, to, allowVacatedBy = null, mode) {
    const from = this.actor(id);
    return findRoute(
      this.field.world.maps,
      from,
      { map: from.map, ...to },
      {
        objects: (map) => this.objects(map, id, allowVacatedBy),
        ...(id === "player" && this.field.movement
          ? {
              passage: (c) =>
                this.field.movement.traversal(
                  mode || this.field.movement.state.mode,
                  c,
                ),
            }
          : {}),
      },
    );
  }
  async step(id, dir, { running = false, allowVacatedBy = null, mode } = {}) {
    if (!DIRECTIONS[dir]) throw new Error(`Invalid walking direction ${dir}`);
    if (id === "player") {
      if (
        !this.field.move(dir, { running, scripted: true, allowVacatedBy, mode })
      )
        throw new Error(`Scripted player movement blocked: ${dir}`);
      await this.timeline.wait(this.field.motion.duration);
      this.field.tick(this.timeline.now());
      return;
    }
    await this.ready(id);
    const map = this.field.position.map;
    const n = this.field.npcs.control(id, map);
    const position = { map, x: n.x, y: n.y, dir: n.dir };
    const world = new World(this.field.world.maps, position, {
      objects: (idMap) => this.objects(idMap, id),
    });
    const result = world.move(dir, { ignoreWarps: true });
    if (!result || position.map !== map)
      throw new Error(`Scripted actor movement blocked: ${id}/${dir}`);
    n.fromX = n.x;
    n.fromY = n.y;
    n.x = n.toX = position.x;
    n.y = n.toY = position.y;
    n.dir = dir;
    n.start = this.timeline.now();
    n.jump = !!result.jump;
    n.duration = n.jump ? 256 : running ? 96 : 160;
    n.foot = (n.foot + 1) % 2;
    try {
      await this.timeline.wait(n.duration);
    } finally {
      n.fromX = n.toX = n.x;
      n.fromY = n.toY = n.y;
      n.duration = 0;
    }
  }
  async move({
    actor = "player",
    to,
    path,
    running = false,
    allowVacatedBy = null,
    mode,
  }) {
    await this.ready(actor);
    const route = path || this.route(actor, to, allowVacatedBy, mode);
    if (!Array.isArray(route))
      throw new Error("Movement needs a path or a destination");
    for (const dir of route)
      await this.step(actor, dir, { running, allowVacatedBy, mode });
  }
  async approach({ actor, target = "player" }) {
    await this.ready(actor);
    const t = this.actor(target);
    const candidates = Object.values(DIRECTIONS)
      .flatMap(([dx, dy]) => {
        const to = { map: t.map, x: t.x + dx, y: t.y + dy };
        try {
          return [{ to, path: this.route(actor, to) }];
        } catch {
          return [];
        }
      })
      .sort((a, b) => a.path.length - b.path.length);
    if (!candidates.length) throw new Error(`Cannot approach ${target}`);
    await this.move({ actor, path: candidates[0].path });
  }
  async face({ actor = "player", dir, target }) {
    await this.ready(actor);
    const p = this.actor(actor);
    if (target) {
      const t = this.actor(target),
        dx = t.x - p.x,
        dy = t.y - p.y;
      dir =
        Math.abs(dx) > Math.abs(dy)
          ? dx > 0
            ? "right"
            : "left"
          : dy > 0
            ? "down"
            : "up";
    }
    if (!DIRECTIONS[dir]) throw new Error(`Invalid facing direction ${dir}`);
    if (actor === "player") this.field.position.dir = dir;
    else this.field.npcs.face(actor, p.map, dir);
  }
  async escort({ actor, to }) {
    await this.ready(actor);
    const route = this.route(actor, to);
    for (const dir of route) {
      const previous = this.actor(actor);
      // Equal-duration tracks let the follower enter the leader's vacated source cell.
      // The leader's destination remains occupied; unrelated reservations still apply.
      const results = await Promise.allSettled([
        this.step(actor, dir),
        this.move({ actor: "player", to: previous, allowVacatedBy: actor }),
      ]);
      const failed = results.find((r) => r.status === "rejected");
      if (failed) throw failed.reason;
    }
  }
  async emote({ actor, kind = "exclamation", ms = 600 }) {
    this.actor(actor);
    if (!FIELD_EMOTES.includes(kind)) throw new Error(`Unknown emote ${kind}`);
    if (this.emotes.has(actor))
      throw new Error(`Emote already active: ${actor}`);
    this.emotes.set(actor, { actor, kind, map: this.field.position.map });
    try {
      await this.timeline.wait(this.duration(ms));
    } finally {
      this.emotes.delete(actor);
    }
  }
  async cameraTo({ actor, position, ms = 400 }) {
    const to = this.field.motion.graph.point(position || this.actor(actor));
    await this.camera.pan(this.playerPoint(), to, this.duration(ms));
  }
  async cameraFollow({ ms = 400 } = {}) {
    await this.camera.follow(this.playerPoint(), this.duration(ms));
  }
  hide({ actor }) {
    this.field.npcs.hide(actor, this.field.position.map);
  }
  stage(actors = []) {
    if (!this.field.transitions.sample().covered)
      throw new Error("Actors must be staged under a covered transition");
    const map = this.field.position.map;
    for (const def of actors) {
      if (!def.id || !this.field.world.cell(def.x, def.y))
        throw new Error("Invalid staged actor");
      this.field.npcs.stage(map, def);
    }
  }
}

/** Parallel tracks may share a scene, but cannot fight over the same pose/UI/camera. */
export function storyResources(c) {
  if (["move", "face", "approach", "hide"].includes(c.type))
    return [`actor:${c.actor || "player"}`];
  if (c.type === "escort") return [`actor:${c.actor}`, "actor:player"];
  if (c.type === "emote") return [`emote:${c.actor}`];
  if (["cameraTo", "cameraFollow"].includes(c.type)) return ["camera"];
  if (c.type === "dialog") return ["dialog"];
  if (
    [
      "scene",
      "teleport",
      "battle",
      "starter",
      "shop",
      "presentation",
      "worldPatch",
      "fieldAction",
    ].includes(c.type)
  )
    return ["*"];
  if (
    [
      "flag",
      "heal",
      "grant",
      "reward",
      "completeEvent",
      "captureMonster",
      "lossPenalty",
      "setVariable",
    ].includes(c.type)
  )
    return ["state"];
  return [];
}

/** Structural/data checks run before any track changes state or acquires actors. */
export function validateFieldCommand(c, maps) {
  const fail = () => {
    throw new Error(`Invalid ${c.type} command`);
  };
  const id = (v) => typeof v === "string" && v.length > 0;
  const coordinate = (p) =>
    p &&
    Number.isInteger(p.x) &&
    Number.isInteger(p.y) &&
    (p.map === undefined || id(p.map));
  const placed = (p) => {
    if (!coordinate(p) || !maps[p.map]) return false;
    const m = maps[p.map];
    return (
      p.x >= 0 &&
      p.y >= 0 &&
      p.x < m.width &&
      p.y < m.height &&
      ((m.blocks[p.y * m.width + p.x] >> 10) & 3) === 0
    );
  };
  if (
    ["wait", "emote", "cameraTo", "cameraFollow"].includes(c.type) &&
    c.ms !== undefined &&
    (!Number.isFinite(c.ms) || c.ms < 0 || c.ms > 60000)
  )
    fail();
  if (c.type === "wait" && c.ms === undefined) fail();
  if (
    ["move", "face", "approach", "hide", "escort", "emote"].includes(c.type) &&
    c.actor !== undefined &&
    !id(c.actor)
  )
    fail();
  if (["approach", "hide", "escort", "emote"].includes(c.type) && !id(c.actor))
    fail();
  if (
    c.type === "move" &&
    (c.path
      ? !Array.isArray(c.path) || !c.path.every((d) => DIRECTIONS[d])
      : !coordinate(c.to))
  )
    fail();
  if (c.type === "move" && c.mode !== undefined && !id(c.mode)) fail();
  if (c.type === "face" && !(c.target ? id(c.target) : DIRECTIONS[c.dir]))
    fail();
  if (c.type === "approach" && c.actor === (c.target || "player")) fail();
  if (c.type === "escort" && (c.actor === "player" || !coordinate(c.to)))
    fail();
  if (
    c.type === "emote" &&
    c.kind !== undefined &&
    !FIELD_EMOTES.includes(c.kind)
  )
    fail();
  if (
    c.type === "cameraTo" &&
    !(c.position ? coordinate(c.position) && id(c.position.map) : id(c.actor))
  )
    fail();
  if (c.type === "scene" || c.type === "teleport") {
    if (!placed(c.position) || !DIRECTIONS[c.position.dir || "up"]) fail();
    const ids = new Set(),
      cells = new Set([`${c.position.x},${c.position.y}`]);
    if (c.actors !== undefined && !Array.isArray(c.actors)) fail();
    for (const n of c.actors || []) {
      const cell = `${n.x},${n.y}`;
      if (
        !id(n.id) ||
        n.id === "player" ||
        ids.has(n.id) ||
        cells.has(cell) ||
        !placed({ ...n, map: c.position.map }) ||
        !DIRECTIONS[n.dir || "down"]
      )
        fail();
      ids.add(n.id);
      cells.add(cell);
    }
  }
}
