import { validateMoveAnimation } from "./extensions/visual-contracts.js";
import {
  readOnly,
  validateSchema,
  validateValue,
  objectSchema,
} from "./extensions/values.js";

/** Rules return data plans. Only the host's operation port can commit domain changes. */
export class FieldActionRegistry {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [id, definition] of Object.entries(definitions))
      this.register(id, definition);
  }
  register(id, definition) {
    if (
      !/^[a-z][a-z0-9_.:-]{0,127}$/.test(id) ||
      this.definitions.has(id) ||
      !definition ||
      typeof definition.name !== "string" ||
      !definition.name.length ||
      !["allowed", "target", "plan"].every(
        (key) => typeof definition[key] === "function",
      ) ||
      !Number.isFinite(definition.duration) ||
      definition.duration < 0 ||
      definition.duration > 60000 ||
      typeof definition.cue !== "string" ||
      !definition.cue.length
    )
      throw new Error(`Invalid field action ${id}`);
    if (definition.menu !== undefined && typeof definition.menu !== "boolean")
      throw new Error("Invalid field action menu visibility");
    if (
      definition.triggers !== undefined &&
      (!Array.isArray(definition.triggers) ||
        !definition.triggers.length ||
        new Set(definition.triggers).size !== definition.triggers.length ||
        definition.triggers.some((t) => !["interact", "blocked"].includes(t)))
    )
      throw new Error("Invalid field action triggers");
    if (
      definition.priority !== undefined &&
      (!Number.isInteger(definition.priority) ||
        Math.abs(definition.priority) > 10000)
    )
      throw new Error("Invalid field action priority");
    if (definition.avatar) {
      validateMoveAnimation({
        duration: Math.max(1, definition.duration),
        tracks: [],
        poses: definition.avatar,
      });
      if (definition.avatar.some((p) => p.anchor !== "actor"))
        throw new Error("Field avatars require actor anchors");
    }
    const schema = validateSchema(definition.schema || objectSchema());
    if (schema.type !== "object")
      throw new Error("Field action inputs must be objects");
    if (definition.triggers?.length) validateValue(schema, {});
    this.definitions.set(
      id,
      Object.freeze({
        ...definition,
        ...(definition.avatar ? { avatar: readOnly(definition.avatar) } : {}),
        id,
        schema,
        triggers: Object.freeze([...(definition.triggers || [])]),
      }),
    );
    return id;
  }
}

/** Plans are issuer-owned, one-shot and invalidated by changes to the authoritative field view. */
export class FieldActionService {
  constructor({
    registry,
    query,
    prepareOperation,
    commitOperation,
    emit = () => {},
  }) {
    Object.assign(this, {
      registry,
      query,
      prepareOperation,
      commitOperation,
      emit,
    });
    this.plans = new WeakMap();
  }
  inspect(id, input = {}, context = readOnly(this.query())) {
    const definition = this.registry.definitions.get(id);
    if (!definition) throw new Error(`Unknown field action ${id}`);
    const args = readOnly(input, 4096);
    validateValue(definition.schema, args);
    const permission = definition.allowed(context, args);
    if (permission !== true)
      return {
        ok: false,
        reason: permission?.reason || "现在不能使用这个野外行动。",
      };
    const target = definition.target(context, args);
    if (!target) return { ok: false, reason: "没有可以使用这个行动的目标。" };
    return {
      ok: true,
      definition,
      context,
      target: readOnly(target),
      input: args,
    };
  }
  list(input = {}) {
    const context = readOnly(this.query());
    return [...this.registry.definitions]
      .filter(([, d]) => d.menu !== false)
      .map(([id, definition]) => {
        try {
          const { ok, reason } = this.inspect(id, input[id] || {}, context);
          return {
            id,
            name: definition.name,
            ok,
            ...(reason ? { reason } : {}),
          };
        } catch (error) {
          return {
            id,
            name: definition.name,
            ok: false,
            reason: error.message,
          };
        }
      });
  }
  /** Objects, items and terrain share action qualification/targeting; routing never knows content kinds. */
  interaction(event) {
    if (!["interact", "blocked"].includes(event))
      throw new Error("Unknown field interaction event");
    const context = readOnly(this.query());
    const candidates = [...this.registry.definitions.values()]
      .filter((d) => d.triggers.includes(event))
      .sort(
        (a, b) =>
          (a.priority || 0) - (b.priority || 0) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
    for (const d of candidates) {
      const result = this.inspect(d.id, {}, context);
      if (result.ok) return { id: d.id, name: d.name };
    }
    return null;
  }
  prepare(id, input = {}) {
    const result = this.inspect(id, input);
    if (!result.ok) return result;
    const { definition, context, target } = result;
    const operation = readOnly(
      definition.plan(context, target, result.input),
      65536,
    );
    const prepared = this.prepareOperation(operation, context);
    const plan = readOnly({
      id,
      name: definition.name,
      cue: definition.cue,
      duration: definition.duration,
      avatar: definition.avatar || null,
      target,
      operation,
    });
    this.plans.set(plan, { stamp: JSON.stringify(context), prepared });
    return { ok: true, plan };
  }
  async commit(plan) {
    const record = this.plans.get(plan);
    this.plans.delete(plan);
    if (!record || record.stamp !== JSON.stringify(readOnly(this.query())))
      return { ok: false, reason: "行动目标或条件已经变化，请重新选择。" };
    const result = await this.commitOperation(record.prepared);
    if (result?.ok !== true)
      throw new Error("Field operation must return a committed result");
    this.emit(
      "core:field-action",
      readOnly({
        id: plan.id,
        target: plan.target,
        outcome: result.fishing || null,
      }),
    );
    return result;
  }
  discard(plan) {
    this.plans.delete(plan);
  }
}
