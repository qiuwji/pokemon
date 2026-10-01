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
    onMap = () => {},
    onBlocked = () => {},
  }) {
    Object.assign(this, { position, motion, transitions, now, onStep });
    this.npcs = new NPCSystem(maps, objects);
    this.world = new World(maps, position, {
      deferWarps: true,
      objects: (map = position.map) =>
        this.npcs
          .objects(map)
          .map((n) => ({ ...n, reserved: this.npcs.reserved(n) })),
      onMap,
      onBlocked,
      onStep: (cell) => {
        this.pendingCell = cell;
      },
    });
    this.pending = null;
    this.motion.snap(position);
  }
  get busy() {
    return !!this.pending || this.transitions.busy;
  }
  move(
    direction,
    { running = false, scripted = false, allowVacatedBy = null } = {},
  ) {
    if (this.busy || this.motion.moving(this.now())) return false;
    const from = { ...this.position };
    const result = this.world.move(direction, {
      ignoreWarps: scripted,
      allowVacatedBy,
    });
    if (!result) return false;
    this.motion.begin(from, this.position, this.now(), {
      running,
      jump: result.jump,
    });
    this.pending = result;
    this.scriptedStep = scripted;
    return true;
  }
  tick(now) {
    if (!this.pending || this.motion.moving(now)) return;
    const result = this.pending;
    this.pending = null;
    const cell = this.pendingCell;
    this.pendingCell = null;
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
