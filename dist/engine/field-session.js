import { World } from "./world.js";
import { NPCSystem } from "./npcs.js";

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
    onBlocked = () => {},
    movement = null,
  }) {
    Object.assign(this, {
      position,
      motion,
      transitions,
      now,
      onStep,
      onProgress,
      movement,
    });
    this.npcs = new NPCSystem(maps, objects);
    this.world = new World(maps, position, {
      deferWarps: true,
      objects: (map = position.map) =>
        this.npcs
          .objects(map)
          .map((n) => ({ ...n, reserved: this.npcs.reserved(n) })),
      onMap: (map) => {
        movement?.normalize(maps[map]);
        onMap(map);
      },
      ...(movement
        ? {
            passage: (c) =>
              movement.traversal(this.stepMode || movement.state.mode, c),
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
    this.disposed = true;
  }
  get busy() {
    return !!this.pending || this.transitions.busy;
  }
  move(
    direction,
    { running = false, scripted = false, allowVacatedBy = null, mode } = {},
  ) {
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
    const result = this.world.move(direction, {
      ignoreWarps: scripted,
      allowVacatedBy,
    });
    if (!result) {
      this.movement?.reset();
      return false;
    }
    this.motion.begin(from, this.position, this.now(), {
      running,
      ...(this.movementPlan
        ? { mode: this.movementPlan.mode, duration: this.movementPlan.duration }
        : {}),
      jump: result.jump,
    });
    this.pending = result;
    this.scriptedStep = scripted;
    return true;
  }
  tick(now) {
    if (this.disposed || !this.pending || this.motion.moving(now)) return;
    const result = this.pending;
    if (this.movementPlan) this.movement.commit(this.movementPlan);
    this.movementPlan = null;
    this.pending = null;
    const cell = this.pendingCell;
    this.pendingCell = null;
    this.onProgress(cell, { scripted: !!this.scriptedStep });
    if (this.scriptedStep) {
      this.scriptedStep = false;
      return;
    }
    if (result.warp) {
      void this.transitions
        .run("door", () => {
          const { map, x, y, dir } = result.warp;
          this.world.enter(map, x, y, dir);
          this.motion.snap(this.position);
        })
        .then(() =>
          this.onStep(this.world.cell(this.position.x, this.position.y)),
        );
    } else this.onStep(cell);
  }
}
