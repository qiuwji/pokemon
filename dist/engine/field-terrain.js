import { readOnly, callSync } from "./extensions/values.js";
const directions = ["up", "down", "left", "right"];
const beforeKeys = [
  "allowed",
  "duration",
  "jump",
  "keepFacing",
  "freezeAnimation",
  "pose",
];
const afterKeys = [
  "direction",
  "duration",
  "jump",
  "keepFacing",
  "freezeAnimation",
  "resetMomentum",
  "mode",
  "pose",
];
function validateDecision(value, phase) {
  const result = readOnly(value, 4096),
    keys = phase === "before" ? beforeKeys : afterKeys;
  if (
    !result ||
    Array.isArray(result) ||
    typeof result !== "object" ||
    Object.keys(result).some((key) => !keys.includes(key))
  )
    throw new Error(`Invalid terrain ${phase} decision`);
  for (const key of [
    "allowed",
    "jump",
    "keepFacing",
    "freezeAnimation",
    "resetMomentum",
  ])
    if (result[key] !== undefined && typeof result[key] !== "boolean")
      throw new Error(`Invalid terrain ${key}`);
  if (
    result.duration !== undefined &&
    (!Number.isFinite(result.duration) ||
      result.duration <= 0 ||
      result.duration > 60000)
  )
    throw new Error("Invalid terrain duration");
  for (const key of ["mode", "pose"])
    if (
      result[key] !== undefined &&
      (typeof result[key] !== "string" ||
        !/^[a-zA-Z0-9_.:-]{1,128}$/.test(result[key]))
    )
      throw new Error(`Invalid terrain ${key}`);
  if (phase === "after" && !directions.includes(result.direction))
    throw new Error("Invalid forced direction");
  return result;
}
/** Terrain policies decide data only. High priority owns cosmetic overrides; any before-step veto blocks passage. */
export class FieldTerrainRegistry {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [id, definition] of Object.entries(definitions))
      this.register(id, definition);
  }
  register(id, definition) {
    if (
      !/^[a-zA-Z0-9_.:-]{1,128}$/.test(id) ||
      this.definitions.has(id) ||
      !definition ||
      Object.keys(definition).some(
        (key) => !["when", "before", "after", "priority"].includes(key),
      ) ||
      typeof definition.when !== "function" ||
      ![definition.before, definition.after].some(
        (v) => typeof v === "function",
      ) ||
      [definition.before, definition.after].some(
        (v) => v !== undefined && typeof v !== "function",
      ) ||
      (definition.priority !== undefined &&
        (!Number.isInteger(definition.priority) ||
          Math.abs(definition.priority) > 1000))
    )
      throw new Error(`Invalid terrain rule ${id}`);
    this.definitions.set(
      id,
      Object.freeze({ ...definition, id, priority: definition.priority || 0 }),
    );
  }
}
export class FieldTerrainService {
  constructor(registry) {
    this.rules = [...registry.definitions.values()].sort(
      (a, b) =>
        b.priority - a.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  }
  evaluate(phase, context) {
    const view = readOnly(context),
      result = { ruleIds: [] };
    for (const rule of this.rules) {
      if (!rule[phase]) continue;
      const matches = callSync(rule.when, [view]);
      if (typeof matches !== "boolean")
        throw new Error("Terrain predicate must return a boolean");
      if (!matches) continue;
      const decision = callSync(rule[phase], [view]);
      if (decision === null) continue;
      const validated = validateDecision(decision, phase);
      result.ruleIds.push(rule.id);
      for (const [key, value] of Object.entries(validated))
        if (result[key] === undefined || (key === "allowed" && value === false))
          result[key] = value;
      if (phase === "after") break;
    }
    return result;
  }
  before(context) {
    return this.evaluate("before", context);
  }
  after(context) {
    const result = this.evaluate("after", context);
    return result.direction ? result : null;
  }
}
