import { World } from "./world.js";
import { NPCSystem } from "./npcs.js";
import { isWater } from "./terrain.js";

/** Field orchestration, independent of DOM, map names and story flags. */
export class FieldSession {
  constructor({
    maps,
    position,
    objects,
    motion,
    transitions,
    now,
    onStep = () => {},
    onProgress = () => {},
    onMap = () => {},
    prepareEntry,
    elevation = null,
    onBlocked = () => {},
    movement = null,
    npcBehaviors,
    npcContext,
    npcResolveIntent,
    npcOnIntent,
    npcActorStep,
    npcOnChange,
    npcOnError,
    terrain = null,
    canContinue = () => true,
    onTerrain = () => {},
    maxForcedSteps = 256,
  }) {
    Object.assign(this, {
      position,
      motion,
      transitions,
      now,
      onStep,
      onProgress,
      movement,
      terrain,
      canContinue,
      onTerrain,
      maxForcedSteps,
    });
    if (
      !Number.isInteger(maxForcedSteps) ||
      maxForcedSteps < 1 ||
      maxForcedSteps > 4096
    )
      throw new Error("Invalid forced movement limit");
    this.force = null;
    this.forceCount = 0;
    this.forceVisited = new Set();
    this.npcs = new NPCSystem(maps, objects, {
      behaviors: npcBehaviors,
      elevation,
      context: npcContext,
      resolveIntent: npcResolveIntent,
      onIntent: npcOnIntent,
      actorStep: npcActorStep,
      onChange: npcOnChange,
      onError: npcOnError,
    });
    this.world = new World(maps, position, {
      deferWarps: true,
      prepareEntry,
      elevation,
      objects: (map = position.map) => this.npcs.occupants(map),
      onMap: (map) => {
        movement?.normalize(maps[map]);
        onMap(map);
      },
      ...(movement || terrain
        ? {
            passage: (c) => {
              this.terrainPlan = this.passagePlan(
                this.stepMode || movement?.state.mode,
                c,
              );
              return this.terrainPlan.allowed;
            },
          }
        : {}),
      onBlocked,
      beforeMove: ({ map, cell, dir }) => {
        this.movementPlan = movement?.plan(this.stepMode, dir, cell, map);
      },
      onStep: (cell) => {
        this.pendingCell = cell;
      },
    });
    this.pending = null;
    this.motion.snap(position);
  }
  dispose() {
    this.npcs.clear();
    this.pending = this.pendingCell = this.movementPlan = null;
    this.cancelForced("disposed");
    this.disposed = true;
  }
  get busy() {
    return !!this.pending || !!this.force || this.transitions.busy;
  }
  terrainContext(c, mode) {
    const from = c.from || this.position,
      map = this.world.maps[from.map],
      index = from.y * map.width + from.x;
    return {
      dir: c.dir,
      cell: c.cell,
      warp: c.warp || null,
      map: {
        id: c.mapId || from.map,
        width: c.map.width,
        height: c.map.height,
        indoor: !!c.map.indoor,
        underwater: !!c.map.underwater,
        allowRunning: c.map.allowRunning !== false,
        allowBike: c.map.allowBike !== false,
      },
      from: { ...from },
      actor: this.world.elevation
        ? {
            elevation: from.elevation,
            previousElevation: from.previousElevation,
          }
        : null,
      mode: mode || "walk",
      momentum: { ...(this.movement?.momentum || {}) },
      technique: this.movement?.technique || "normal",
      sourceCell: {
        behavior: map.behavior[index],
        collision: (map.blocks[index] >> 10) & 3,
        elevation: map.blocks[index] >> 12,
      },
    };
  }
  passagePlan(mode, c) {
    const base = this.movement
      ? this.movement.traversal(mode, c)
      : !isWater(c.cell.behavior) && (c.cell.collision === 0 || !!c.warp);
    const plan = this.terrain?.before(this.terrainContext(c, mode)) || {};
    return { ...plan, allowed: plan.allowed ?? base };
  }
  traversal(mode, c) {
    return this.passagePlan(mode, c).allowed;
  }
  cancelForced(reason = "cancelled") {
    if (this.force || this.forceCount)
      this.onTerrain({ kind: "stop", reason, position: { ...this.position } });
    this.force = null;
    this.forceCount = 0;
    this.forceVisited.clear();
  }
  scheduleForced(direction) {
    if (!this.terrain || this.disposed) return;
    try {
      this.force = this.terrain.after(
        this.terrainContext(
          {
            map: this.world.map,
            cell: this.world.cell(this.position.x, this.position.y),
            dir: direction,
          },
          this.movement?.state.mode,
        ),
      );
      if (!this.force) {
        this.forceCount = 0;
        this.forceVisited.clear();
      }
    } catch (error) {
      this.cancelForced("fault");
      this.onTerrain({
        kind: "fault",
        reason: error.message,
        position: { ...this.position },
      });
    }
  }
  continueForced() {
    if (!this.force || this.transitions.busy || !this.canContinue()) return;
    const plan = this.force,
      key = `${this.position.map}/${this.position.x}/${this.position.y}/${plan.direction}`;
    if (this.forceCount >= this.maxForcedSteps || this.forceVisited.has(key)) {
      this.cancelForced("cycle-limit");
      return;
    }
    this.forceVisited.add(key);
    this.forceCount++;
    this.force = null;
    if (plan.resetMomentum) this.movement?.reset();
    try {
      if (!this.move(plan.direction, { mode: plan.mode, forced: plan }))
        this.cancelForced("blocked");
    } catch (error) {
      this.cancelForced("fault");
      this.onTerrain({
        kind: "fault",
        reason: error.message,
        position: { ...this.position },
      });
    }
  }
  move(
    direction,
    {
      running = false,
      scripted = false,
      allowVacatedBy = null,
      mode,
      forced = null,
    } = {},
  ) {
    if (scripted && !this.pending) this.cancelForced("scripted");
    if (this.disposed || this.busy || this.motion.moving(this.now()))
      return false;
    this.stepMode = this.movement?.effective({
      running,
      scripted,
      mode,
      map: this.world.map,
    });
    if (this.movement && !this.stepMode) return false;
    const from = { ...this.position };
    this.terrainPlan = null;
    const result = this.world.move(direction, {
      ignoreWarps: scripted,
      allowVacatedBy,
    });
    const visual = {
      ...this.movement?.techniqueVisual(),
      ...this.terrainPlan,
      ...(forced || {}),
    };
    if (visual.keepFacing) this.position.dir = from.dir;
    if (!result) {
      this.movement?.reset();
      return false;
    }
    this.motion.begin(from, this.position, this.now(), {
      running,
      ...(this.movementPlan
        ? { mode: this.movementPlan.mode, duration: this.movementPlan.duration }
        : {}),
      ...(visual.duration ? { duration: visual.duration } : {}),
      jump: !!result.jump || !!visual.jump,
      freezeAnimation: !!visual.freezeAnimation,
      pose: visual.pose || this.movement?.technique || "normal",
    });
    this.lastDirection = direction;
    this.lastStep = {
      from,
      direction,
      forced: !!forced,
      pose: visual.pose || "normal",
      ruleIds: [
        ...new Set([
          ...(this.terrainPlan?.ruleIds || []),
          ...(forced?.ruleIds || []),
        ]),
      ],
    };
    this.pending = result;
    this.scriptedStep = scripted;
    return true;
  }
  tick(now) {
    if (this.disposed || this.motion.moving(now)) return;
    if (!this.pending) {
      this.continueForced();
      return;
    }
    const result = this.pending;
    if (this.movementPlan) this.movement.commit(this.movementPlan);
    this.movementPlan = null;
    this.pending = null;
    const cell = this.pendingCell;
    this.pendingCell = null;
    this.onProgress(cell, { scripted: !!this.scriptedStep });
    if (this.terrain)
      this.onTerrain({
        kind: "step",
        ...this.lastStep,
        position: { ...this.position },
      });
    if (this.scriptedStep) {
      this.scriptedStep = false;
      return;
    }
    if (result.warp) {
      void this.transitions
        .run("door", () => {
          const { map, x, y, dir } = result.warp;
          this.cancelForced("warp");
          this.world.enter(map, x, y, dir);
          this.motion.snap(this.position);
        })
        .then(() => {
          this.onStep(this.world.cell(this.position.x, this.position.y));
          this.scheduleForced(this.lastDirection);
        });
    } else {
      this.onStep(cell);
      this.scheduleForced(this.lastDirection);
      this.continueForced();
    }
  }
}
