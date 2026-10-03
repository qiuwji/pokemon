import {
  callSync,
  readOnly,
  objectSchema,
  validateSchema,
  validateValue,
} from "./extensions/values.js";
const directions = ["up", "down", "left", "right"];
const exact = (o, keys) =>
  o &&
  typeof o === "object" &&
  !Array.isArray(o) &&
  Object.keys(o).every((k) => keys.includes(k));
export class MovementInputRegistry {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [id, d] of Object.entries(definitions)) {
      if (
        !/^[a-zA-Z0-9_.:-]{1,128}$/.test(id) ||
        !exact(d, ["schema", "initialState", "decide"]) ||
        typeof d.decide !== "function"
      )
        throw new Error("Invalid movement input rule");
      const schema = validateSchema(d.schema || objectSchema()),
        initialState = readOnly(d.initialState ?? {});
      validateValue(schema, initialState);
      this.definitions.set(id, Object.freeze({ ...d, schema, initialState }));
    }
  }
  validateMovement(movement) {
    for (const d of movement.definitions.values())
      if (d.inputRule !== undefined && !this.definitions.has(d.inputRule))
        throw new Error("Unknown movement input rule");
  }
}
/** Host-sampled logical inputs, independent of keyboard, DOM, map IDs and game RNG. */
export class MovementInputSession {
  constructor({ registry, movement }) {
    Object.assign(this, { registry, movement });
    registry.validateMovement(movement);
    this.reset();
  }
  reset() {
    this.mode = null;
    this.state = null;
    this.previousInput = { direction: null, secondary: false, running: false };
    this.lastNow = null;
    this.timeMs = 0;
    this.blocked = false;
  }
  sample(input, { now, mode, context, busy = false, paused = false }) {
    if (
      !exact(input, ["direction", "secondary", "running"]) ||
      ![null, ...directions].includes(input.direction) ||
      typeof input.secondary !== "boolean" ||
      typeof input.running !== "boolean" ||
      !Number.isFinite(now)
    )
      throw new Error("Invalid logical movement input");
    const definition = this.movement.get(mode),
      policy = this.registry.definitions.get(definition.inputRule);
    if (this.mode !== mode) {
      this.reset();
      this.mode = mode;
      this.state = policy?.initialState ?? {};
    }
    const delta = this.lastNow === null ? 0 : Math.max(0, now - this.lastNow);
    this.lastNow = now;
    if (paused) {
      this.reset();
      this.lastNow = now;
      return null;
    }
    this.timeMs += delta;
    const args = readOnly({
      ...context,
      mode,
      busy,
      timeMs: this.timeMs,
      input,
      previousInput: this.previousInput,
      state: this.state,
      blocked: this.blocked,
    });
    const decision = policy
      ? readOnly(callSync(policy.decide, [args]), 65536)
      : {
          state: {},
          action:
            busy || !input.direction
              ? null
              : { kind: "step", direction: input.direction },
        };
    if (!exact(decision, ["state", "action"]))
      throw new Error("Invalid movement input decision");
    validateValue(policy?.schema || objectSchema(), decision.state);
    const a = decision.action;
    if (
      a != null &&
      (!exact(a, ["kind", "direction", "durationMs", "technique"]) ||
        !["step", "turn"].includes(a.kind) ||
        !directions.includes(a.direction) ||
        (a.durationMs !== undefined &&
          (!Number.isFinite(a.durationMs) ||
            a.durationMs <= 0 ||
            a.durationMs > 60000)) ||
        (a.technique !== undefined &&
          a.technique !== "normal" &&
          !definition.techniques[a.technique]) ||
        busy)
    )
      throw new Error("Invalid movement input action");
    this.state = readOnly(decision.state);
    this.previousInput = readOnly(input);
    this.blocked = false;
    return a ? readOnly(a) : null;
  }
  feedback(success) {
    this.blocked = success === false;
  }
}
