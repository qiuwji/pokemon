import { GEN3_ELEVATION } from "../../../engine/rules/gen3/elevation.js";
import { NPCPoseRegistry } from "../../../engine/npc-poses.js";
import {
  ActorRepository,
  ActorTemplateRegistry,
  emptyActors,
} from "../../../engine/actor-repository.js";
import { NPCBehaviorRegistry } from "../../../engine/npc-behaviors.js";
import {
  ActorScheduleRegistry,
  actorAtRoutine,
} from "../../../engine/actor-schedules.js";
import {
  perceive,
  nextActorDirection,
} from "../../../engine/actor-navigation.js";
import { World } from "../../../engine/world.js";
import { isWater } from "../../../engine/terrain.js";
import { validateValue, readOnly } from "../../../engine/extensions/values.js";
import { bindApplicationPorts } from "./ports.js";
export const ACTOR_PORTS = Object.freeze([
  "catalog",
  "db",
  "state",
  "field",
  "world",
  "canManageParty",
  "plugins",
  "timeView",
]);
/** Persistent actors use the existing field motion/collision. No second simulation or battle RNG stream. */
export class ActorApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, ACTOR_PORTS);
    this.runtime = Object.freeze(
      Object.fromEntries(
        ["context", "resolve", "intent", "step", "commit", "reconcile"].map(
          (name) => [name, this[name].bind(this)],
        ),
      ),
    );
    this.api = Object.freeze({
      list: () => this.repository.list(),
      view: (uid) => this.repository.view(uid),
      spawn: (template, position) => this.spawn(template, position),
      update: (uid, changes) => this.update(uid, changes),
      remove: (uid) => this.remove(uid),
      routines: () =>
        readOnly(
          Object.fromEntries(
            Object.entries(this.repository.state.records)
              .map(([uid, r]) => [uid, this.routine(r)])
              .filter(([, entry]) => entry),
          ),
        ),
    });
  }
  bind() {
    this.state.actors ||= emptyActors();
    const behaviors = new NPCBehaviorRegistry(this.catalog.npcBehaviors, {
      poses: new NPCPoseRegistry(this.catalog.npcPoses, {
        actors: this.db.actors,
      }),
    });
    const schedules = new ActorScheduleRegistry(this.catalog.actorSchedules, {
      maps: this.db.maps,
      behaviors,
    });
    this.repository = new ActorRepository({
      state: this.state.actors,
      maps: this.db.maps,
      elevation: GEN3_ELEVATION,
      registry: new ActorTemplateRegistry(this.catalog.actorTemplates, {
        actors: this.db.actors,
        behaviors,
        schedules,
      }),
    });
  }
  objects(map) {
    return this.repository.objects(map).map((n) => {
      const r = this.repository.record(n.id),
        d = this.repository.registry.get(r.template),
        entry = this.routine(r);
      if (!entry) return n;
      return {
        ...n,
        movement: {
          ...d.config,
          ...(entry.arrived ? entry.config || {} : {}),
          mode: entry.arrived ? entry.behavior || d.behavior : "routine-travel",
        },
      };
    });
  }
  routine(record) {
    const id = this.repository.registry.get(record.template).schedule;
    if (!id) return null;
    const entry = this.repository.registry.schedules.select(
      id,
      this.timeView(),
    );
    return entry
      ? readOnly({
          ...entry,
          arrived: actorAtRoutine(record, entry, GEN3_ELEVATION, this.db.maps),
        })
      : null;
  }
  /** Only unseen endpoints may catch up. Visible actors still use navigation and two-end reservations. */
  reconcile({ now = 0, visibleMaps = [], paused = false } = {}) {
    if (paused || this.field.npcs.scene) return;
    for (const [uid, r] of Object.entries(this.repository.state.records)) {
      const entry = this.routine(r);
      if (
        !entry ||
        r.hidden ||
        entry.offscreen !== "relocate" ||
        visibleMaps.includes(r.map) ||
        visibleMaps.includes(entry.position.map) ||
        this.field.npcs.relocationBlocked(uid, now)
      )
        continue;
      const p = entry.position,
        pose = entry.pose || "still";
      if (
        r.map === p.map &&
        r.x === p.x &&
        r.y === p.y &&
        r.dir === p.dir &&
        (p.elevation === undefined || r.elevation === p.elevation) &&
        r.pose === pose
      )
        continue;
      if (
        !this.free(p, uid) ||
        this.world.maps[p.map].warps.some((w) => w.x === p.x && w.y === p.y)
      )
        continue;
      const before = this.repository.view(uid),
        after = this.repository.update(uid, { position: p, pose });
      this.field.npcs.invalidate(before.map, uid);
      this.field.npcs.invalidate(after.map, uid);
      this.plugins?.events.emit("core:actor-relocated", {
        before,
        after,
        routine: { schedule: entry.schedule, id: entry.id, day: entry.day },
      });
    }
  }
  tick(now, { visibleMaps, paused }) {
    this.reconcile({
      now,
      visibleMaps,
      paused: paused || !this.canManageParty(),
    });
  }
  entities(map) {
    const result = this.field.npcs.objects(map).map((n) => ({
      uid: n.id,
      map,
      x: n.x,
      y: n.y,
      dir: n.dir,
      elevation: n.elevation,
      kind: n.kind || "npc",
    }));
    if (this.state.position.map === map)
      result.push({ uid: "player", ...this.state.position, kind: "player" });
    return result;
  }
  context(map, n) {
    if (!n._actorUid) return {};
    const r = this.repository.view(n._actorUid),
      d = this.repository.registry.get(r.template);
    return {
      identity: { uid: r.uid, template: r.template },
      state: r.data,
      routine: this.routine(r),
      perception: perceive(
        this.world.maps,
        r,
        this.entities(map),
        d.perceptionRadius,
        this.world.elevation,
      ),
    };
  }
  blockers(map, uid, playerFrom) {
    const result = this.field.npcs.occupants(map).filter((n) => n.id !== uid);
    const player = this.state.position;
    if (player.map === map) result.push({ ...player, id: "player" });
    if (playerFrom?.map === map)
      result.push({ ...playerFrom, id: "player.from" });
    return result;
  }
  resolve(map, n, intent) {
    if (!n._actorUid) return intent;
    const record = this.repository.record(n._actorUid),
      d = this.repository.registry.get(record.template);
    const routine = this.routine(record);
    if (routine?.arrived && !intent.move && !intent.goal)
      intent = {
        ...intent,
        dir: intent.dir || routine.position.dir,
        pose: routine.pose || intent.pose,
      };
    if (intent.state !== undefined)
      validateValue(d.schema, readOnly(intent.state, 8192));
    if (!intent.goal) return intent;
    const dir = nextActorDirection(
      this.world.maps,
      {
        map,
        x: n.x,
        y: n.y,
        dir: n.dir,
        elevation: n.elevation,
        previousElevation: n.previousElevation,
      },
      intent.goal,
      {
        objects: (id) => this.blockers(id, n.id),
        elevation: this.world.elevation,
      },
    );
    return { ...intent, move: !!dir, ...(dir ? { dir } : {}) };
  }
  intent(map, n, intent) {
    if (!n._actorUid || !this.state.actors.records[n._actorUid]) return;
    if (intent.state !== undefined)
      this.repository.update(
        n._actorUid,
        { data: intent.state },
        { external: false },
      );
  }
  step(map, n, dir, playerFrom) {
    const position = {
      map,
      x: n.x,
      y: n.y,
      dir: n.dir,
      elevation: n.elevation,
      previousElevation: n.previousElevation,
    };
    const w = new World(this.world.maps, position, {
      objects: (id) => this.blockers(id, n.id, playerFrom),
      elevation: this.world.elevation,
      passage: ({ cell, warp }) =>
        cell.collision === 0 && !isWater(cell.behavior) && !warp,
    });
    const moved = w.move(dir, { ignoreWarps: true });
    return moved ? { ...position, jump: !!moved.jump } : null;
  }
  commit(map, n, intent) {
    if (!n._actorUid || !this.state.actors.records[n._actorUid]) return;
    const before = this.repository.view(n._actorUid),
      actor = this.repository.update(
        n._actorUid,
        {
          position: {
            map,
            x: n.x,
            y: n.y,
            dir: n.dir,
            elevation: n.elevation,
            previousElevation: n.previousElevation,
          },
          pose: n.pose || "still",
        },
        { external: false },
      );
    if (before.map !== map || before.x !== n.x || before.y !== n.y)
      this.plugins?.events.emit("core:actor-moved", { before, after: actor });
    if (intent?.interaction) {
      const target = this.entities(map).find(
        (e) => e.uid === intent.interaction.target,
      );
      if (
        target &&
        target.uid !== n.id &&
        Math.abs(target.x - n.x) + Math.abs(target.y - n.y) === 1 &&
        this.world.elevation.compatible(n.elevation, target.elevation)
      )
        this.plugins?.events.emit("core:actor-interaction-requested", {
          actor: actor.uid,
          target: target.uid,
          kind: intent.interaction.kind,
        });
    }
  }
  free(position, uid = null) {
    this.repository.location(position);
    const map = this.world.maps[position.map],
      level = this.world.elevation.level(position, map),
      index = position.y * map.width + position.x;
    return (
      ((map.blocks[index] >> 10) & 3) === 0 &&
      this.world.elevation.canEnter(level, map.blocks[index] >> 12) &&
      !isWater(map.behavior[index]) &&
      !this.blockers(position.map, uid).some((n) =>
        this.world.elevation.occupies(map, n, position.x, position.y, level),
      )
    );
  }
  spawn(template, position) {
    if (!this.canManageParty() || !this.free(position))
      return { ok: false, reason: "角色无法出现在这个位置。" };
    const actor = this.repository.spawn(template, position);
    this.plugins?.events.emit("core:actor-spawned", actor);
    return { ok: true, actor };
  }
  update(uid, changes) {
    if (
      !this.canManageParty() ||
      (changes.position && !this.free(changes.position, uid))
    )
      return { ok: false, reason: "角色当前无法执行这个操作。" };
    const before = this.repository.view(uid),
      actor = this.repository.update(uid, changes);
    if (actor.version !== before.version) {
      this.field.npcs.invalidate(before.map, uid);
      this.field.npcs.invalidate(actor.map, uid);
    }
    this.plugins?.events.emit("core:actor-updated", { before, after: actor });
    return { ok: true, actor };
  }
  remove(uid) {
    if (!this.canManageParty()) return false;
    const actor = this.repository.view(uid),
      removed = this.repository.remove(uid);
    if (removed) {
      this.field.npcs.invalidate(actor.map, uid);
      this.plugins?.events.emit("core:actor-removed", actor);
    }
    return removed;
  }
}
