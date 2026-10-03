import {
  MovementInputRegistry,
  MovementInputSession,
} from "../../../engine/movement-input.js";
import { GEN3_MOVEMENT_INPUTS } from "../../../engine/rules/gen3/bike-input.js";
import { MovementRegistry, MovementService } from "../../../engine/movement.js";
import { TravelService } from "../../../engine/travel.js";
import { TravelDirector } from "../../../presentation/travel-director.js";
import { DIRECTIONS } from "../../../engine/world.js";
import { emeraldFieldCapabilities } from "../field-capabilities.js";
import { isWater, BEHAVIOR } from "../../../engine/terrain.js";
import { bindApplicationPorts } from "./ports.js";
export const MOVEMENT_PORTS = Object.freeze([
  "battle",
  "actionBusy",
  "growthBusy",
  "growthDirector",
  "sceneDirector",
  "canManageParty",
  "catalog",
  "clearInput",
  "enter",
  "field",
  "stepField",
  "reducedMotion",
  "save",
  "state",
  "storyBusy",
  "timeline",
  "transitions",
  "ui",
  "world",
  "worldState",
]);
/** movement use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class MovementApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, MOVEMENT_PORTS);
  }
  resetFieldInput() {
    this.input?.reset();
    this.movement?.setTechnique("normal", this.world.map);
    this.field?.motion.idle(
      "normal",
      this.timeline.now(),
      this.state.position.dir,
    );
  }
  handleFieldInput(input) {
    const paused = !!(
        this.battle ||
        this.storyBusy ||
        this.ui?.blocked ||
        this.actionBusy ||
        this.growthBusy ||
        this.growthDirector.busy ||
        this.sceneDirector?.busy ||
        this.transitions.busy ||
        this.travelDirector?.busy ||
        (!this.canManageParty() && !this.field.busy)
      ),
      action = this.input.sample(input, {
        now: this.timeline.now(),
        mode: this.state.movement.mode,
        busy: this.field.busy,
        paused,
        context: {
          position: { ...this.state.position },
          cell: this.world.cell(this.state.position.x, this.state.position.y),
          momentum: { ...this.movement.momentum },
        },
      });
    if (paused) this.resetFieldInput();
    if (!action) return false;
    if (action.technique !== undefined)
      this.movement.setTechnique(action.technique, this.world.map);
    const visual = this.movement.techniqueVisual();
    const result =
      action.kind === "pose"
        ? this.field.pose(action.direction, visual)
        : action.kind === "turn"
          ? this.field.face(action.direction, {
              duration: action.durationMs || 0,
              visual,
            })
          : this.stepField(action.direction, {
              running: input.running,
              ...(action.durationMs ? { duration: action.durationMs } : {}),
            });
    this.input.feedback(result);
    return result;
  }
  visitMap() {
    const id = this.state.position.map;
    if (
      this.catalog.destinations[id] &&
      !this.state.movement.visited.includes(id)
    )
      this.state.movement.visited.push(id);
  }
  fieldCapabilities() {
    return emeraldFieldCapabilities(this.state);
  }
  movementOptions() {
    return Object.keys(this.catalog.movement)
      .filter((id) => !["run", "surf", "dive", "waterfall"].includes(id))
      .map((id) => ({
        id,
        name: this.catalog.movement[id].name,
        allowed: this.inspectMovementMode(id).ok,
      }));
  }
  inspectMovementMode(mode) {
    if (
      !Object.hasOwn(this.catalog.movement, mode) ||
      ["run", "surf", "dive", "waterfall"].includes(mode)
    )
      return { ok: false, reason: "现在不能更换移动方式。" };
    const cell = this.world.cell(this.state.position.x, this.state.position.y);
    if (isWater(cell?.behavior)) return { ok: false, reason: "请先上岸。" };
    if (
      ["mach-bike", "acro-bike"].includes(this.state.movement.mode) &&
      mode !== this.state.movement.mode &&
      (this.state.flags.cyclingRoad ||
        [
          BEHAVIOR.VERTICAL_RAIL,
          BEHAVIOR.HORIZONTAL_RAIL,
          BEHAVIOR.ISOLATED_VERTICAL_RAIL,
          BEHAVIOR.ISOLATED_HORIZONTAL_RAIL,
        ].includes(cell?.behavior))
    )
      return { ok: false, reason: "在自行车道或轨道上不能下车。" };
    return this.movement.available(mode, this.world.map)
      ? { ok: true }
      : { ok: false, reason: "尚未获得这辆自行车，或这里不能骑车。" };
  }
  setMovementMode(mode) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    const result = this.inspectMovementMode(mode);
    if (!result.ok) return result;
    const changed = this.movement.set(mode, this.world.map);
    if (changed.ok) this.resetFieldInput();
    return changed;
  }
  movementTechniqueOptions() {
    const definition = this.movement.registry.get(this.state.movement.mode);
    return [
      { id: "normal", name: "普通骑行" },
      ...Object.entries(definition.techniques)
        .filter(([, t]) => t.menu !== false)
        .map(([id, t]) => ({
          id,
          name: t.name,
        })),
    ];
  }
  setMovementTechnique(id) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前移动。" };
    return this.movement.setTechnique(id, this.world.map);
  }
  async boardSurf() {
    if (!this.canManageParty() || !this.fieldCapabilities().surf)
      return { ok: false, reason: "还不能使用冲浪。" };
    const dir = this.state.position.dir,
      [dx, dy] = DIRECTIONS[dir];
    if (
      !isWater(
        this.world.cell(this.state.position.x + dx, this.state.position.y + dy)
          ?.behavior,
      )
    )
      return { ok: false, reason: "请面向岸边的水面。" };
    // Use an explicit mode plan. Persistent mode changes only when the boarding step finishes.
    this.clearInput();
    if (!this.field.move(dir, { mode: "surf" }))
      return { ok: false, reason: "水面被挡住了。" };
    await this.waitForMovement();
    return { ok: true };
  }
  async flyTo(id) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    const result = this.travel.prepare(id);
    if (!result.ok) return result;
    this.clearInput();
    try {
      const completed = await this.travelDirector.fly(() => {
        const changed = this.travel.commit(result.plan);
        if (!changed.ok) throw new Error(changed.reason);
        this.movement.set("walk", this.world.map);
      });
      return { ok: completed };
    } catch (error) {
      return { ok: false, reason: error.message };
    } finally {
      this.clearInput();
      this.ui?.updateSide();
      this.save();
    }
  }
  async waitForMovement() {
    // Automation returns at a story/UI boundary rather than waiting for player input.
    while (
      this.field.busy &&
      !this.storyBusy &&
      !this.battle &&
      !this.ui?.blocked
    )
      await this.timeline.wait(16);
  }
  bind() {
    this.state.movement ||= {
      mode: "walk",
      visited: [this.state.position.map],
    };
    this.movement = new MovementService({
      registry: new MovementRegistry(this.catalog.movement),
      state: this.state.movement,
      context: () => ({ capabilities: this.fieldCapabilities() }),
      onChange: () => this.ui?.updateSide(),
    });
    this.input = new MovementInputSession({
      registry: new MovementInputRegistry(
        this.catalog.movementInputs || GEN3_MOVEMENT_INPUTS,
      ),
      movement: this.movement.registry,
    });
    this.travel = new TravelService({
      maps: this.worldState.maps,
      destinations: this.catalog.destinations,
      position: this.state.position,
      context: () => ({
        capabilities: this.fieldCapabilities(),
        visited: this.state.movement.visited,
      }),
      preview: (map) => this.world.entryPreview(map),
      enter: (position) => this.enter(position),
    });
    this.travelDirector = new TravelDirector({
      timeline: this.timeline,
      transitions: this.transitions,
      reducedMotion: this.reducedMotion,
    });
  }
}
