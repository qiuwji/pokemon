import { DEFAULT_CONDITION_QUERIES } from "./condition-queries.js";
/** Portable, serializable condition language. Missing progress always means incomplete. */
/** @param {import("./contracts.js").Condition | undefined} condition */
export function matchesCondition(
  condition,
  state,
  queries = DEFAULT_CONDITION_QUERIES,
) {
  if (!condition) return true;
  if (condition.all)
    return condition.all.every((c) => matchesCondition(c, state, queries));
  if (condition.any)
    return condition.any.some((c) => matchesCondition(c, state, queries));
  if (condition.not) return !matchesCondition(condition.not, state, queries);
  if (condition.flag)
    return (
      (state.flags[condition.flag] ?? false) === (condition.equals ?? true)
    );
  if (condition.event)
    return state.story?.completed.includes(condition.event) ?? false;
  if (condition.reward)
    return state.story?.rewards.includes(condition.reward) ?? false;
  if (condition.compare) {
    const { query, op, value } = condition.compare,
      actual = queries.read(query, state);
    if (op === "eq") return actual === value;
    if (op === "ne") return actual !== value;
    if (typeof actual !== "number" || typeof value !== "number") return false;
    return {
      gt: () => actual > value,
      gte: () => actual >= value,
      lt: () => actual < value,
      lte: () => actual <= value,
    }[op]();
  }
  throw new Error("Unknown story condition");
}
export function validateCondition(
  c,
  eventIds = new Set(),
  path = "condition",
  queries = DEFAULT_CONDITION_QUERIES,
) {
  if (c === undefined) return;
  if (!c || typeof c !== "object" || Array.isArray(c))
    throw new Error(`${path}: invalid condition`);
  const keys = [
    "all",
    "any",
    "not",
    "flag",
    "event",
    "reward",
    "compare",
  ].filter((k) => Object.hasOwn(c, k));
  if (keys.length !== 1)
    throw new Error(`${path}: expected one condition operator`);
  const key = keys[0];
  if (["all", "any"].includes(key)) {
    if (!Array.isArray(c[key]) || !c[key].length)
      throw new Error(`${path}.${key}: expected conditions`);
    c[key].forEach((v, i) =>
      validateCondition(v, eventIds, `${path}.${key}[${i}]`, queries),
    );
  } else if (key === "not")
    validateCondition(c.not, eventIds, `${path}.not`, queries);
  else if (key === "compare") {
    const v = c.compare;
    if (
      !v ||
      Object.keys(v).some((k) => !["query", "op", "value"].includes(k)) ||
      !["eq", "ne", "gt", "gte", "lt", "lte"].includes(v.op) ||
      !Object.hasOwn(v, "value") ||
      (v.value !== null &&
        !["number", "string", "boolean"].includes(typeof v.value)) ||
      (typeof v.value === "number" && !Number.isFinite(v.value)) ||
      (!["eq", "ne"].includes(v.op) && typeof v.value !== "number")
    )
      throw new Error(`${path}: invalid comparison`);
    queries.validate(v.query);
  } else if (typeof c[key] !== "string" || !c[key])
    throw new Error(`${path}.${key}: expected an ID`);
  else if (key === "event" && !eventIds.has(c.event))
    throw new Error(`${path}: unknown event ${c.event}`);
  const allowed = key === "flag" ? [key, "equals"] : [key];
  if (Object.keys(c).some((k) => !allowed.includes(k)))
    throw new Error(`${path}: unknown condition field`);
}
