import { Random } from "./model.js";
import { validateFrameData } from "./frame-data.js";
import {
  readOnly,
  jsonValue,
  validateSchema,
  validateValue,
  callSync,
} from "./extensions/values.js";

/** One fixed logical step. Display framerate never changes business results. */
export const INTERACTION_STEP_MS = 1000 / 60;
const actionName = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9_.-]{0,63}$/.test(value);
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));
const outcomes = ["success", "failure"];

/** One registered definition, normalized and frozen. Shared by the host and the registry. */
export function validateInteraction(id, d) {
  if (
    !exact(d, [
      "version",
      "parameters",
      "state",
      "result",
      "inputs",
      "visual",
      "completion",
      "init",
      "step",
      "view",
      "pausePolicy",
      "cancellationPolicy",
    ]) ||
    !Number.isSafeInteger(d.version) ||
    d.version < 1 ||
    !Array.isArray(d.inputs) ||
    !d.inputs.length ||
    d.inputs.length > 16 ||
    new Set(d.inputs).size !== d.inputs.length ||
    d.inputs.some((name) => !actionName(name)) ||
    typeof d.init !== "function" ||
    typeof d.step !== "function" ||
    typeof d.view !== "function" ||
    (d.visual !== undefined &&
      (typeof d.visual !== "string" || !d.visual)) ||
    (d.completion !== undefined &&
      (typeof d.completion !== "string" || !d.completion)) ||
    (d.pausePolicy !== undefined && d.pausePolicy !== "pauseOnFocusLoss") ||
    (d.cancellationPolicy !== undefined &&
      d.cancellationPolicy !== "discardUncommitted")
  )
    throw new Error(`Invalid interaction ${id}`);
  return Object.freeze({
    ...d,
    parameters: validateSchema(d.parameters),
    state: validateSchema(d.state),
    result: validateSchema(d.result),
    inputs: Object.freeze([...d.inputs]),
  });
}

/** Validates registered real-time interaction definitions; execution is host-owned. */
export class InteractionRegistry {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [id, d] of Object.entries(definitions))
      this.definitions.set(id, validateInteraction(id, d));
  }
  get(id) {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown interaction ${id}`);
    return definition;
  }
  has(id) {
    return this.definitions.has(id);
  }
}

/** Host-owned instances; plugins return JSON state and a bounded terminal result only. */
export class InteractionSessionService {
  constructor({
    registry,
    random = null,
    stepMs = INTERACTION_STEP_MS,
    maxCatchUp = 8,
    onError = () => {},
  }) {
    this.registry = registry;
    this.random = random;
    this.stepMs = stepMs;
    this.maxCatchUp = maxCatchUp;
    this.onError = onError;
    this.sessions = new Map();
    this.sequence = 0;
  }
  get active() {
    for (const session of this.sessions.values())
      if (["running", "paused", "finishing"].includes(session.lifecycle))
        return true;
    return false;
  }
  current() {
    for (const session of this.sessions.values())
      if (["running", "paused", "finishing"].includes(session.lifecycle))
        return session.id;
    return null;
  }
  start(owner, id, parameters = {}, context = {}, source = null) {
    const definition = this.registry.get(id);
    validateValue(definition.parameters, parameters);
    if (this.active) throw new Error("An interaction session is already active");
    const seed = this.random ? this.random.int(0x100000000) : 0;
    const session = {
      id: `interaction.${++this.sequence}`,
      owner,
      definition: id,
      version: definition.version,
      lifecycle: "running",
      source: typeof source === "string" && source ? source : null,
      context: jsonValue(context),
      parameters: jsonValue(parameters),
      state: null,
      clock: { tick: 0, nowMs: 0, elapsedMs: 0, dtMs: this.stepMs },
      seed,
      held: new Set(),
      frameEdges: [],
      edgeSequence: 0,
      random: new Random(seed),
      accumulator: 0,
      lastNowMs: null,
      terminal: null,
      reason: null,
      receipt: null,
    };
    session.state = jsonValue(
      callSync(
        definition.init,
        [
          readOnly(session.context),
          readOnly(session.parameters),
          Object.freeze({
            int: (max) => {
              if (!Number.isSafeInteger(max) || max < 1)
                throw new Error("Invalid interaction random bound");
              return session.random.int(max);
            },
          }),
        ],
        this.onError,
      ),
    );
    validateValue(definition.state, session.state);
    this.sessions.set(session.id, session);
    return this.view(session.id);
  }
  view(instanceId) {
    const session = this.#session(instanceId);
    return readOnly({
      id: session.id,
      owner: session.owner,
      definition: session.definition,
      version: session.version,
      lifecycle: session.lifecycle,
      state: session.state,
      source: session.source,
      context: session.context,
      clock: { ...session.clock },
      seed: session.seed,
      terminal: session.terminal,
      reason: session.reason,
      receipt: session.receipt,
    });
  }
  frame(instanceId) {
    const session = this.#session(instanceId);
    const definition = this.registry.get(session.definition);
    let data;
    try {
      const view = callSync(
        definition.view,
        [
          readOnly(session.state),
          readOnly({
            clock: { ...session.clock },
            viewport: { width: 240, height: 160 },
            reducedMotion: false,
          }),
        ],
        this.onError,
      );
      data = validateFrameData(view);
    } catch (error) {
      this.onError(error);
      data = { nodes: [] };
    }
    return readOnly({
      instance: session.id,
      visual: definition.visual || null,
      data,
    });
  }
  /** Host reports the currently held semantic actions; edges are derived by the service. */
  setInput(instanceId, held = []) {
    const session = this.#session(instanceId);
    const definition = this.registry.get(session.definition);
    if (!Array.isArray(held) || held.some((name) => !definition.inputs.includes(name)))
      throw new Error("Unknown interaction input");
    const next = new Set(held);
    for (const action of next)
      if (!session.held.has(action))
        session.frameEdges.push({ action, kind: "pressed", sequence: ++session.edgeSequence });
    for (const action of session.held)
      if (!next.has(action))
        session.frameEdges.push({ action, kind: "released", sequence: ++session.edgeSequence });
    session.held = next;
    return this.view(instanceId);
  }
  /** Single-action convenience used by the public input command. */
  input(instanceId, action, active) {
    const session = this.#session(instanceId);
    const definition = this.registry.get(session.definition);
    if (!definition.inputs.includes(action) || typeof active !== "boolean")
      throw new Error("Unknown interaction input");
    const held = new Set(session.held);
    if (active) held.add(action);
    else held.delete(action);
    return this.setInput(instanceId, [...held]);
  }
  /** Focus-loss pause: freeze the logical clock and rebase it on resume so background time is not replayed. */
  pause(instanceId) {
    const session = this.#session(instanceId);
    if (session.lifecycle === "running") session.lifecycle = "paused";
    return this.view(instanceId);
  }
  resume(instanceId) {
    const session = this.#session(instanceId);
    if (session.lifecycle === "paused") {
      session.lifecycle = "running";
      session.lastNowMs = null;
      session.accumulator = 0;
    }
    return this.view(instanceId);
  }
  /** Wall-clock driver for the browser frame loop. */
  advance(nowMs) {
    const terminals = [];
    for (const session of this.sessions.values()) {
      if (session.lifecycle !== "running") continue;
      if (!Number.isFinite(nowMs)) throw new Error("Invalid interaction clock");
      if (session.lastNowMs === null) session.lastNowMs = nowMs;
      let elapsed = nowMs - session.lastNowMs;
      if (elapsed < 0) elapsed = 0;
      session.lastNowMs = nowMs;
      session.accumulator += elapsed;
      let steps = Math.floor(session.accumulator / this.stepMs);
      if (steps > this.maxCatchUp) {
        steps = this.maxCatchUp;
        session.accumulator = 0;
      } else session.accumulator -= steps * this.stepMs;
      for (let i = 0; i < steps && session.lifecycle === "running"; i++)
        this.#step(session);
      if (session.lifecycle === "finishing") terminals.push(this.view(session.id));
    }
    return terminals;
  }
  /** Deterministic driver for tests and AI: exactly `ticks` logical steps. */
  advanceTicks(instanceId, ticks) {
    const session = this.#session(instanceId);
    if (!Number.isSafeInteger(ticks) || ticks < 0 || ticks > 4096)
      throw new Error("Invalid interaction tick count");
    for (let i = 0; i < ticks && session.lifecycle === "running"; i++)
      this.#step(session);
    return session.lifecycle === "finishing"
      ? [this.view(session.id)]
      : [];
  }
  cancel(instanceId) {
    const session = this.#session(instanceId);
    if (["completed", "cancelled", "failed"].includes(session.lifecycle))
      return this.view(instanceId);
    session.lifecycle = "cancelled";
    session.held = new Set();
    session.frameEdges = [];
    return this.view(instanceId);
  }
  complete(instanceId, receipt = {}) {
    const session = this.#session(instanceId);
    if (["completed", "cancelled", "failed"].includes(session.lifecycle))
      return this.view(instanceId);
    if (session.lifecycle !== "finishing" || !session.terminal)
      throw new Error("Interaction is not ready to complete");
    session.lifecycle = "completed";
    session.receipt = jsonValue(receipt);
    session.held = new Set();
    return this.view(instanceId);
  }
  fail(instanceId, reason) {
    const session = this.#session(instanceId);
    if (["completed", "cancelled"].includes(session.lifecycle))
      return this.view(instanceId);
    session.lifecycle = "failed";
    session.reason = typeof reason === "string" && reason ? reason : "interaction-failed";
    session.held = new Set();
    return this.view(instanceId);
  }
  #step(session) {
    const definition = this.registry.get(session.definition);
    const edges = session.frameEdges;
    session.frameEdges = [];
    const input = {
      held: [...session.held].sort(),
      pressed: edges.filter((e) => e.kind === "pressed").map((e) => e.action),
      released: edges.filter((e) => e.kind === "released").map((e) => e.action),
      edges: edges.map((e) => ({ ...e })),
    };
    try {
      const result = callSync(
        definition.step,
        [
          readOnly(session.state),
          readOnly({ clock: { ...session.clock }, input, context: session.context }),
        ],
        this.onError,
      );
      if (!result || typeof result !== "object")
        throw new Error("Interaction step must return a result");
      if (result.kind === "terminal") {
        if (!outcomes.includes(result.outcome))
          throw new Error("Interaction terminal requires an outcome");
        validateValue(definition.state, result.state);
        validateValue(definition.result, result.result);
        session.state = jsonValue(result.state);
        session.terminal = jsonValue({ outcome: result.outcome, result: result.result });
        session.lifecycle = "finishing";
      } else if (result.kind === "running") {
        validateValue(definition.state, result.state);
        session.state = jsonValue(result.state);
      } else throw new Error("Interaction step returned an invalid kind");
      session.clock.tick++;
      session.clock.nowMs = session.clock.elapsedMs = session.clock.elapsedMs + this.stepMs;
      session.clock.dtMs = this.stepMs;
    } catch (error) {
      // A business fault must not propagate into the host frame loop.
      session.lifecycle = "failed";
      session.reason = error?.message || "interaction-step-failed";
      session.held = new Set();
      session.frameEdges = [];
      this.onError(error);
    }
  }
  #session(instanceId) {
    const session = this.sessions.get(instanceId);
    if (!session) throw new Error(`Unknown interaction instance ${instanceId}`);
    return session;
  }
}
