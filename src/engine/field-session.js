import { World, DIRECTIONS } from "./world.js";
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
    onStart = () => {},
    onMap = () => {},
    onWarp = () => {},
    onWarpStart = () => {},
    beforeWarp = () => false,
    doorWarp = null,
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
      onStart,
      onWarp,
      onWarpStart,
      beforeWarp,
      doorWarp,
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
      navigation: () => movement?.registry.get(this.stepMode || movement.state.mode).navigation || {},
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
      onBlocked: (kind, object) => onBlocked(kind, object),
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
    this.doorPlan = null;
    this.warping = false;
    this.disposed = true;
  }
  get busy() {
    return (
      !!this.pending ||
      !!this.force ||
      this.warping ||
      this.transitions.busy ||
      this.motion.moving(this.now())
    );
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
    const plan = this.movement?.registry.get(mode).navigation.ignoreTerrain ? {} :
      this.terrain?.before(this.terrainContext(c, mode)) || {};
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
    if (this.movement?.registry.get(this.movement.state.mode).navigation.ignoreTerrain) return;
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
  pose(direction, visual = {}) {
    if (!DIRECTIONS[direction]) throw new Error("Invalid pose direction");
    if (this.busy || this.disposed) return false;
    this.position.dir = direction;
    this.motion.idle(visual.pose || "normal", this.now(), direction);
    return true;
  }
  face(direction, { duration = 0, visual = {} } = {}) {
    if (
      !DIRECTIONS[direction] ||
      !Number.isFinite(duration) ||
      duration < 0 ||
      duration > 60000
    )
      throw new Error("Invalid facing plan");
    if (this.busy || this.disposed) return false;
    const from = { ...this.position };
    this.position.dir = direction;
    if (duration)
      this.motion.begin(from, this.position, this.now(), {
        duration,
        mode: this.movement?.state.mode || "walk",
        freezeAnimation: true,
        ...visual,
      });
    else this.motion.snap(this.position);
    this.movement?.reset();
    return true;
  }
  move(
    direction,
    {
      running = false,
      scripted = false,
      allowVacatedBy = null,
      mode,
      forced = null,
      jump = false,
      keepFacing = false,
      ignoreActors = [],
      duration,
    } = {},
  ) {
    if (
      duration !== undefined &&
      (!Number.isFinite(duration) || duration <= 0 || duration > 60000)
    )
      throw new Error("Invalid movement duration");
    if (scripted && !this.pending) this.cancelForced("scripted");
    this.lastMove = { moved: false, reason: this.disposed ? "disposed" : "animation" };
    if (this.disposed || this.busy || this.motion.moving(this.now()))
      return false;
    this.stepMode = this.movement?.effective({
      running,
      scripted,
      mode,
      map: this.world.map,
    });
    if (this.movement && !this.stepMode) {
      this.lastMove = { moved: false, reason: "movement-mode" }; return false;
    }
    const from = { ...this.position };
    this.terrainPlan = null;
    const result = this.world.move(direction, {
      ignoreWarps: scripted,
      allowVacatedBy,
      ignoreActors: scripted ? ignoreActors : [],
    });
    // A door opens while the player is still standing in front of it, so the step in is held
    // back by the animation instead of running underneath it (src/field_screen_effect.c
    // Task_DoDoorWarp opens the door before MOVEMENT_ACTION_WALK_NORMAL_UP).
    this.doorPlan =
      !scripted && result?.warp && this.doorWarp
        ? this.doorWarp.enter({
            map: from.map,
            direction,
            door: { ...this.position },
            to: { ...result.warp },
          })
        : null;
    const visual = {
      freezeAnimation: this.movement?.registry.get(this.stepMode).presentation.freezeAnimation,
      ...this.movement?.techniqueVisual(),
      ...this.terrainPlan,
      ...(forced || {}),
      ...(keepFacing ? { keepFacing: true } : {}),
    };
    if (visual.keepFacing) this.position.dir = from.dir;
    if (!result) {
      this.lastMove = { moved: false, reason: this.terrainPlan?.reason || this.world.lastBlocked?.reason || "wall",
        ...(this.world.lastBlocked?.objectId ? { objectId: this.world.lastBlocked.objectId } : {}) };
      this.movement?.reset();
      return false;
    }
    if (duration !== undefined && this.movementPlan)
      this.movementPlan.duration = duration;
    const ledge = result.jump
      ? this.movement?.registry.get(this.stepMode).ledge
      : null;
    this.motion.begin(from, this.position, this.now() + (this.doorPlan?.holdMs || 0), {
      running,
      ...(this.movementPlan
        ? { mode: this.movementPlan.mode, duration: this.movementPlan.duration }
        : {}),
      ...(visual.duration ? { duration: visual.duration } : {}),
      jump: jump || !!result.jump || !!visual.jump,
      freezeAnimation: !!visual.freezeAnimation,
      pose: visual.pose || this.movement?.technique || "normal",
      turnAt: visual.turnAt,
      liftFrames: visual.liftFrames,
      ...(result.jump
        ? { duration: ledge?.durationMs, liftFrames: ledge?.liftFrames }
        : {}),
    });
    this.lastMove = { moved: true, reason: null };
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
    this.onStart({ from, position: { ...this.position }, direction, jump: !!result.jump });
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
    // Coordinate scripts may take control before a warp on the same landed cell. The step
    // still opened the door on the way in, so it has to be put back before they take over.
    if (result.warp && this.beforeWarp(cell)) {
      this.doorPlan?.cancel?.();
      this.doorPlan = null;
      return;
    }
    if (result.warp) {
      const plan = this.doorPlan;
      this.doorPlan = null;
      void this.runWarp(result.warp, plan);
    } else {
      this.onStep(cell);
      this.scheduleForced(this.lastDirection);
      this.continueForced();
    }
  }
  /**
   * Door swaps run outside the transition: the door closes, and only then does the screen
   * cover the map change (src/field_screen_effect.c Task_DoDoorWarp states 0-4).
   */
  async runWarp(warp, plan) {
    this.warping = true;
    try {
      if (plan) await plan.close();
      else this.onWarpStart({ from: { ...this.position }, to: { ...warp } });
      let exit = null;
      const covered = await this.transitions.run("door", () => {
        const { map, x, y, dir } = warp;
        this.cancelForced("warp");
        const from = { ...this.position };
        if (this.world.enter(map, x, y, dir)) this.onWarp({ from, to: { ...this.position } });
        this.motion.snap(this.position);
        // The arrival is up while the screen is still covered, so a player hidden behind
        // the old door is restored and the new door, if any, is already drawn open.
        this.doorWarp?.arrive?.();
        exit =
          this.doorWarp?.exit?.({ map, position: { ...this.position } }) || null;
        exit?.open?.();
      });
      if (!covered) {
        // A refused transition still has to give the player back.
        this.doorWarp?.arrive?.();
        return;
      }
      this.onStep(this.world.cell(this.position.x, this.position.y));
      this.scheduleForced(this.lastDirection);
      if (exit) await exit.close();
    } finally {
      this.doorPlan = null;
      this.warping = false;
    }
  }
}
