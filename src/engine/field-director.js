import { BLOCKED_REASON, MOTION_CANCEL_REASON } from "./blocked-reasons.js";
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
  snapshotActors() {
    if (!this.active) return [];
    return [...this.field.npcs.scene.pins.entries()]
      .filter(([key]) => key.startsWith(this.field.position.map + ":"))
      .map(([key, n]) => ({
        id: n.id,
        x: n.x,
        y: n.y,
        dir: n.dir,
        actor: n.actor,
        ...(n.name !== undefined ? { name: n.name } : {}),
        ...(n.kind !== undefined ? { kind: n.kind } : {}),
        hidden: this.field.npcs.scene.hidden.has(key),
      }));
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
    const localKey = this.field.position.map + ":" + id;
    if (this.field.npcs.scene.pins.has(localKey) && !this.field.npcs.scene.hidden.has(localKey))
      return { ...this.field.npcs.control(id, this.field.position.map), map: this.field.position.map };
    const pins = [...this.field.npcs.scene.pins].filter(([key, n]) => n.id === id && !this.field.npcs.scene.hidden.has(key));
    if (pins.length > 1) throw new Error(`Ambiguous scene actor ${id}`);
    const map = pins.length ? pins[0][0].slice(0, -(id.length + 1)) : this.field.position.map;
    return { ...this.field.npcs.control(id, map), map };
  }
  async waitUntil(deadline) {
    // Browser timers can fire before a fractional frame deadline. Settle the
    // movement by its clock, not by assuming one timer callback means completion.
    while (this.timeline.now() < deadline)
      await this.timeline.wait(Math.max(1, deadline - this.timeline.now()));
  }
  async ready(id) {
    if (id === "player") return;
    const n = this.field.npcs.control(id, this.actor(id).map);
    const remaining = n.duration - (this.timeline.now() - n.start);
    if (remaining > 0) await this.waitUntil(n.start + n.duration);
    this.field.npcs.finishMotion(n);
  }
  objects(map, actor, allowVacatedBy = null, ignoreActors = []) {
    const objects = this.field.npcs
      .occupants(map)
      .filter((n) => n.id !== actor && !ignoreActors.includes(n.id))
      .map((n) => ({
        ...n,
        reserved: n.id === allowVacatedBy ? [] : n.reserved,
      }));
    if (actor !== "player" && allowVacatedBy !== "player" && !ignoreActors.includes("player") && this.field.position.map === map)
      objects.push({ ...this.field.position, id: "player" });
    return objects;
  }
  route(id, to, allowVacatedBy = null, mode, ignoreActors = []) {
    const from = this.actor(id);
    return findRoute(
      this.field.world.maps,
      from,
      { map: from.map, ...to },
      {
        objects: (map) => this.objects(map, id, allowVacatedBy, ignoreActors),
        elevation: this.field.world.elevation,
        ...(id === "player" && this.field.movement
          ? {
              passage: (c) =>
                this.field.traversal(mode || this.field.movement.state.mode, c),
            }
          : {}),
      },
    );
  }
  async step(id, dir, { running = false, allowVacatedBy = null, mode, jump = false, keepFacing = false, ignoreActors = [], ignoreTerrain = false } = {}) {
    if (!DIRECTIONS[dir]) throw new Error(`Invalid walking direction ${dir}`);
    await this.ready(id);
    if (id === "player") {
      if (
        !this.field.move(dir, { running, scripted: true, allowVacatedBy, mode, jump, keepFacing, ignoreActors })
      )
        throw new Error(`Scripted player movement blocked: ${dir}`);
      await this.waitUntil(this.field.motion.start + this.field.motion.duration);
      this.field.tick(this.timeline.now());
      return;
    }
    const map = this.actor(id).map;
    const n = this.field.npcs.control(id, map);
    const position = {
      map,
      x: n.x,
      y: n.y,
      dir: n.dir,
      ...(this.field.world.elevation
        ? { elevation: n.elevation, previousElevation: n.previousElevation }
        : {}),
    };
    const from = { ...position };
    const world = new World(this.field.world.maps, position, {
      objects: (idMap) => this.objects(idMap, id, allowVacatedBy, ignoreActors),
      elevation: this.field.world.elevation,
      ...(ignoreTerrain ? { navigation: () => ({ ignoreEdges: true, ignoreElevation: true }), passage: () => true } : {}),
    });
    const result = world.move(dir, { ignoreWarps: true, allowVacatedBy });
    if (!result)
      this.field.npcs.motionResults.blocked(n._actorUid || `${map}:${id}`, from, position, dir, world.lastBlocked?.reason || BLOCKED_REASON.PASSAGE, { scripted: true });
    if (!result)
      throw new Error(`Scripted actor movement blocked: ${id}/${dir}`);
    const changedMap = position.map !== map, [dx, dy] = DIRECTIONS[dir];
    if (changedMap) this.field.npcs.transferSceneActor(id, map, position.map);
    n.crossFrom = changedMap ? { map, x: n.x, y: n.y, elevation: n.elevation } : null;
    n.fromElevation = n.elevation;
    if (this.field.world.elevation)
      Object.assign(n, {
        elevation: position.elevation,
        previousElevation: position.previousElevation,
      });
    n.fromX = changedMap ? position.x - dx : n.x;
    n.fromY = changedMap ? position.y - dy : n.y;
    n.x = n.toX = position.x;
    n.y = n.toY = position.y;
    if (!keepFacing) n.dir = dir;
    n.start = this.timeline.now();
    n.jump = !!result.jump;
    n.duration = n.jump ? 256 : running ? 96 : 160;
    n.foot = (n.foot + 1) % 2;
    this.field.npcs.beginMotion(n, from, { ...position, dir: n.dir }, { scripted: true, direction: dir, mode: running ? "run" : "walk" });
    let interrupted = true;
    try {
      await this.waitUntil(n.start + n.duration);
      interrupted = false;
    } finally {
      this.field.npcs.onChange(n.map || map, n);
      this.field.npcs.finishMotion(n, interrupted ? MOTION_CANCEL_REASON.INTERRUPTED : null);
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
    jump = false,
    keepFacing = false,
    ignoreActors = [],
    ignoreTerrain = false,
  }) {
    if (ignoreTerrain && (actor === "player" || !Array.isArray(path)))
      throw new Error("Ignoring terrain requires an explicit NPC path");
    await this.ready(actor);
    const route = path || this.route(actor, to, allowVacatedBy, mode, ignoreActors);
    if (!Array.isArray(route))
      throw new Error("Movement needs a path or a destination");
    for (const dir of route)
      await this.step(actor, dir, { running, allowVacatedBy, mode, jump, keepFacing, ignoreActors, ignoreTerrain });
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
  async escort({ actor, to, followers = ["player"] }) {
    const members = [actor, ...followers];
    await Promise.all(members.map((id) => this.ready(id)));
    const initial = members.map((id) => this.actor(id));
    for (let i = 1; i < initial.length; i++)
      if (
        initial[i].map !== initial[0].map ||
        Math.abs(initial[i].x - initial[i - 1].x) +
          Math.abs(initial[i].y - initial[i - 1].y) !==
          1
      )
        throw new Error(
          "Escort members must start in an adjacent ordered chain",
        );
    const route = this.route(actor, to);
    for (const dir of route) {
      const previous = members.map((id) => this.actor(id));
      // Every follower enters only its predecessor's vacated source. Destination and unrelated reservations remain occupied.
      const directions = [
        dir,
        ...followers.map((id, i) => {
          const dx = previous[i].x - previous[i + 1].x,
            dy = previous[i].y - previous[i + 1].y;
          if ((dx && dy) || (!dx && !dy))
            throw new Error("Escort source is not aligned");
          return dx ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
        }),
      ];
      // All steps cross the same ready barrier, then commit in chain order before awaiting frame completion.
      const results = await Promise.allSettled(
        members.map((id, i) =>
          this.step(id, directions[i], {
            allowVacatedBy: i ? members[i - 1] : null,
          }),
        ),
      );
      const failed = results.find((r) => r.status === "rejected");
      if (failed) throw failed.reason;
      for (let i = 1; i < members.length; i++) {
        const landed = this.actor(members[i]);
        if (
          landed.map !== previous[i - 1].map ||
          landed.x !== previous[i - 1].x ||
          landed.y !== previous[i - 1].y
        )
          throw new Error("Escort follower did not reach predecessor source");
      }
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
    this.field.npcs.hide(actor, this.actor(actor).map);
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
  /**
   * Add an actor that walks into a scene mid-script (the reference `addobject`), e.g. a
   * character entering through a door. Unlike `stage`, no covered transition is needed.
   */
  spawn(def) {
    if (!def?.id || !this.field.world.cell(def.x, def.y))
      throw new Error("Invalid spawned actor");
    this.field.npcs.stage(this.field.position.map, def);
  }
}

/** Parallel tracks may share a scene, but cannot fight over the same pose/UI/camera. */
export function storyResources(c) {
  if (["script", "checkpoint", "screen"].includes(c.type)) return ["*"];
  if (["move", "face", "approach", "hide"].includes(c.type))
    return [`actor:${c.actor || "player"}`];
  if (c.type === "spawn") return [`actor:${c.def?.id}`];
  if (c.type === "escort")
    return [c.actor, ...(c.followers || ["player"])].map((id) => `actor:${id}`);
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
      "reward",
      "completeEvent",
      "captureMonster",
      "lossPenalty",
      "setVariable",
      "identity",
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
  if (c.type === "move" && c.jump !== undefined && typeof c.jump !== "boolean") fail();
  if (c.type === "move" && c.keepFacing !== undefined && typeof c.keepFacing !== "boolean") fail();
  if (c.type === "move" && c.ignoreActors !== undefined &&
    (!Array.isArray(c.ignoreActors) || c.ignoreActors.length > 32 ||
      c.ignoreActors.some(n => !id(n) || n === (c.actor || "player")) ||
      new Set(c.ignoreActors).size !== c.ignoreActors.length)) fail();
  if (c.type === "move" && c.ignoreTerrain !== undefined &&
    (typeof c.ignoreTerrain !== "boolean" || c.actor === undefined || c.actor === "player" || !Array.isArray(c.path))) fail();
  if (c.type === "move" && c.mode !== undefined && !id(c.mode)) fail();
  if (c.type === "face" && !(c.target ? id(c.target) : DIRECTIONS[c.dir]))
    fail();
  if (c.type === "approach" && c.actor === (c.target || "player")) fail();
  if (c.type === "escort" && (c.actor === "player" || !coordinate(c.to)))
    fail();
  if (
    c.type === "escort" &&
    c.followers !== undefined &&
    (!Array.isArray(c.followers) ||
      c.followers.length < 1 ||
      c.followers.length > 32 ||
      c.followers.some((n) => !id(n) || n === c.actor) ||
      new Set(c.followers).size !== c.followers.length)
  )
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
  if (
    ["scene", "teleport"].includes(c.type) &&
    [c.coverMs, c.holdMs, c.revealMs].some(
      (ms) => ms !== undefined && (!Number.isFinite(ms) || ms < 0 || ms > 60000),
    )
  )
    fail();
  if (
    c.type === "spawn" &&
    (!c.def ||
      !id(c.def.id) ||
      c.def.id === "player" ||
      !id(c.def.actor) ||
      !coordinate(c.def) ||
      !DIRECTIONS[c.def.dir || "down"])
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
