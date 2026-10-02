import {
  jsonValue,
  readOnly,
  validateSchema,
  validateValue,
} from "./values.js";
/** Extension-owned persistent records. Lifetime clocks are gameplay clocks, not animation time. */
export class PluginState {
  constructor(definitions) {
    this.definitions = definitions;
  }
  validate(record, owner) {
    jsonValue(record);
    if (
      !Number.isInteger(record.version) ||
      record.version < 1 ||
      !record.data ||
      typeof record.data !== "object" ||
      Array.isArray(record.data) ||
      !record.states ||
      typeof record.states !== "object" ||
      Array.isArray(record.states)
    )
      throw new Error("Invalid plugin record");
    for (const [uid, values] of Object.entries(record.states)) {
      if (!uid || !values || Array.isArray(values))
        throw new Error("Invalid status owner");
      for (const [id, state] of Object.entries(values)) {
        const definition = this.definitions.get(id);
        if (
          !definition ||
          definition.owner !== owner ||
          !Number.isInteger(state.remaining) ||
          state.remaining < -1 ||
          state.remaining === 0
        )
          throw new Error(`Invalid saved extension state ${id}`);
        validateValue(definition.schema, state.data);
        if (definition.clock === "permanent" && state.remaining !== -1)
          throw new Error("Permanent state cannot expire");
      }
    }
  }
  attach(record, id, uid, { duration = -1, data = {} } = {}) {
    const definition = this.definitions.get(id);
    if (
      !definition ||
      !uid ||
      !Number.isInteger(duration) ||
      duration === 0 ||
      duration < -1 ||
      duration > 1000000 ||
      (definition.clock === "permanent" && duration !== -1)
    )
      throw new Error("Invalid status attachment");
    const copied = jsonValue(data);
    validateValue(definition.schema, copied);
    record.states[uid] ||= {};
    record.states[uid][id] = { remaining: duration, data: copied };
    return readOnly(record.states[uid][id]);
  }
  remove(record, id, uid) {
    const state = record.states[uid]?.[id];
    if (!state) return null;
    delete record.states[uid][id];
    if (!Object.keys(record.states[uid]).length) delete record.states[uid];
    return readOnly(state);
  }
  list(record, uid) {
    return readOnly(record?.states[uid] || {});
  }
}
export function validateStateDefinition(definition) {
  if (!["step", "round", "manual", "permanent"].includes(definition.clock))
    throw new Error("Unknown state clock");
  for (const key of ["onApply", "onTick", "onRemove"])
    if (definition[key] !== undefined && typeof definition[key] !== "function")
      throw new Error("Invalid lifecycle callback");
  return { ...definition, schema: validateSchema(definition.schema) };
}
