import { readOnly } from "./extensions/values.js";
export const movementFitsMap = (definition, map) =>
  Object.entries(definition.mapRequires || {}).every(
    ([key, value]) => map[key] === value,
  );
/** Mode rules own permissions and traversal. World and motion consume plans without knowing mode IDs. */
export class MovementRegistry {
  constructor(definitions) {
    this.definitions = new Map();
    for (const [id, definition] of Object.entries(definitions))
      this.register(id, definition);
  }
  register(id, definition) {
    if (
      !/^[a-zA-Z0-9_.:-]+$/.test(id) ||
      this.definitions.has(id) ||
      !definition ||
      typeof definition.traverse !== "function" ||
      typeof definition.allowed !== "function" ||
      !Array.isArray(definition.durations) ||
      !definition.durations.length ||
      definition.durations.some((v) => !Number.isFinite(v) || v <= 0)
    )
      throw new Error(`Invalid movement mode ${id}`);
    if (
      definition.afterStep !== undefined &&
      typeof definition.afterStep !== "function"
    )
      throw new Error("Invalid movement post-step rule");
    const mapRequires =
      definition.mapRequires === undefined
        ? {}
        : readOnly(definition.mapRequires, 4096);
    if (
      !mapRequires ||
      Array.isArray(mapRequires) ||
      typeof mapRequires !== "object" ||
      Object.keys(mapRequires).length > 16 ||
      Object.entries(mapRequires).some(
        ([key, value]) =>
          !/^[a-zA-Z][a-zA-Z0-9_]*$/.test(key) ||
          !["string", "boolean", "number"].includes(typeof value),
      )
    )
      throw new Error("Invalid movement map constraint");
    this.definitions.set(
      id,
      Object.freeze({
        ...definition,
        durations: Object.freeze([...definition.durations]),
        mapRequires,
      }),
    );
  }
  get(id) {
    const result = this.definitions.get(id);
    if (!result) throw new Error(`Unknown movement mode ${id}`);
    return result;
  }
}
export class MovementService {
  constructor({
    registry,
    state,
    context,
    baseMode = "walk",
    runMode = "run",
    onChange = () => {},
  }) {
    Object.assign(this, {
      registry,
      state,
      context,
      baseMode,
      runMode,
      onChange,
    });
    this.registry.get(state.mode);
    this.momentum = { mode: null, direction: null, steps: 0 };
  }
  available(mode, map, { scripted = false } = {}) {
    const definition = this.registry.get(mode);
    return (
      movementFitsMap(definition, map) &&
      definition.allowed({ ...this.context(), map, scripted })
    );
  }
  set(mode, map, options = {}) {
    if (!this.available(mode, map, options))
      return { ok: false, reason: "Movement mode is unavailable here" };
    this.state.mode = mode;
    this.reset();
    this.onChange(mode);
    return { ok: true, mode };
  }
  reset() {
    this.momentum = { mode: null, direction: null, steps: 0 };
  }
  effective({ running = false, mode, scripted = false, map } = {}) {
    if (mode) return this.available(mode, map, { scripted }) ? mode : null;
    if (
      running &&
      this.state.mode === this.baseMode &&
      this.available(this.runMode, map, { scripted })
    )
      return this.runMode;
    return this.available(this.state.mode, map, { scripted })
      ? this.state.mode
      : this.baseMode;
  }
  traversal(mode, context) {
    return this.registry.get(mode).traverse({ ...this.context(), ...context });
  }
  plan(mode, dir, cell, map) {
    const definition = this.registry.get(mode),
      momentum = this.momentum;
    const steps =
      momentum.mode === mode && momentum.direction === dir
        ? momentum.steps + 1
        : 1;
    const duration =
      definition.durations[
        Math.min(steps - 1, definition.durations.length - 1)
      ];
    let afterMode =
      definition.afterStep?.({ ...this.context(), cell, map }) ||
      this.state.mode;
    this.registry.get(afterMode);
    if (!this.available(afterMode, map)) afterMode = this.baseMode;
    return {
      mode,
      duration,
      afterMode,
      momentum: { mode, direction: dir, steps },
    };
  }
  commit(plan) {
    this.momentum = { ...plan.momentum };
    if (this.state.mode !== plan.afterMode) {
      this.state.mode = plan.afterMode;
      this.reset();
      this.onChange(this.state.mode);
    }
  }
  normalize(map) {
    if (!this.available(this.state.mode, map)) {
      this.state.mode = this.baseMode;
      this.reset();
      this.onChange(this.state.mode);
    }
  }
}
