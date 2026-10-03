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
    if (
      definition.inputRule !== undefined &&
      (typeof definition.inputRule !== "string" ||
        !/^[a-zA-Z0-9_.:-]{1,128}$/.test(definition.inputRule))
    )
      throw new Error("Invalid movement input rule reference");
    if (
      definition.ledge !== undefined &&
      (!definition.ledge ||
        !Number.isFinite(definition.ledge.durationMs) ||
        definition.ledge.durationMs <= 0 ||
        definition.ledge.durationMs > 60000 ||
        !Array.isArray(definition.ledge.liftFrames) ||
        definition.ledge.liftFrames.length < 2 ||
        definition.ledge.liftFrames.length > 128 ||
        definition.ledge.liftFrames.some(
          (n) => !Number.isFinite(n) || n < 0 || n > 64,
        ) ||
        Object.keys(definition.ledge).some(
          (k) => !["durationMs", "liftFrames"].includes(k),
        ))
    )
      throw new Error("Invalid movement ledge profile");
    const ledge = definition.ledge ? readOnly(definition.ledge) : undefined;
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
    const techniques = readOnly(definition.techniques || {}, 8192);
    if (
      !techniques ||
      Array.isArray(techniques) ||
      typeof techniques !== "object" ||
      Object.keys(techniques).length > 32
    )
      throw new Error("Invalid movement techniques");
    for (const [key, value] of Object.entries(techniques)) {
      if (
        !/^[a-zA-Z0-9_.:-]{1,128}$/.test(key) ||
        key === "normal" ||
        !value ||
        typeof value !== "object" ||
        Array.isArray(value) ||
        Object.keys(value).some(
          (k) =>
            ![
              "name",
              "menu",
              "pose",
              "jump",
              "keepFacing",
              "freezeAnimation",
              "oneStep",
              "turnAt",
              "liftFrames",
            ].includes(k),
        ) ||
        !value.name ||
        typeof value.name !== "string" ||
        typeof value.pose !== "string" ||
        !/^[a-zA-Z0-9_.:-]{1,128}$/.test(value.pose) ||
        (value.liftFrames !== undefined &&
          (!Array.isArray(value.liftFrames) ||
            value.liftFrames.length < 2 ||
            value.liftFrames.length > 128 ||
            value.liftFrames.some(
              (n) => !Number.isFinite(n) || n < 0 || n > 64,
            ))) ||
        (value.turnAt !== undefined &&
          (!Number.isFinite(value.turnAt) ||
            value.turnAt < 0 ||
            value.turnAt > 1)) ||
        ["jump", "keepFacing", "freezeAnimation", "oneStep", "menu"].some(
          (k) => value[k] !== undefined && typeof value[k] !== "boolean",
        )
      )
        throw new Error("Invalid movement technique definition");
    }
    this.definitions.set(
      id,
      Object.freeze({
        ...definition,
        ledge,
        durations: Object.freeze([...definition.durations]),
        mapRequires,
        techniques,
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
    this.technique = "normal";
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
    this.technique = "normal";
    this.reset();
    this.onChange(mode);
    return { ok: true, mode };
  }
  reset() {
    this.momentum = { mode: null, direction: null, steps: 0 };
  }
  setTechnique(id, map) {
    const definition = this.registry.get(this.state.mode);
    if (
      !this.available(this.state.mode, map) ||
      (id !== "normal" && !definition.techniques[id])
    )
      return { ok: false, reason: "Movement technique is unavailable" };
    if (this.technique === id) return { ok: true, technique: id };
    this.technique = id;
    this.onChange(this.state.mode);
    return { ok: true, technique: id };
  }
  techniqueVisual() {
    return this.registry.get(this.state.mode).techniques[this.technique] || {};
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
    if (this.techniqueVisual().oneStep) this.technique = "normal";
    this.momentum = { ...plan.momentum };
    if (this.state.mode !== plan.afterMode) {
      this.state.mode = plan.afterMode;
      this.technique = "normal";
      this.reset();
      this.onChange(this.state.mode);
    }
  }
  normalize(map) {
    if (!this.available(this.state.mode, map)) {
      this.state.mode = this.baseMode;
      this.technique = "normal";
      this.reset();
      this.onChange(this.state.mode);
    }
  }
}
