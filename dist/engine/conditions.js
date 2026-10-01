/** Portable, serializable condition language. Missing progress always means incomplete. */
/** @param {import("./contracts.js").Condition | undefined} condition */
export function matchesCondition(condition, state) {
  if (!condition) return true;
  if (condition.all)
    return condition.all.every((c) => matchesCondition(c, state));
  if (condition.any)
    return condition.any.some((c) => matchesCondition(c, state));
  if (condition.not) return !matchesCondition(condition.not, state);
  if (condition.flag)
    return (
      (state.flags[condition.flag] ?? false) === (condition.equals ?? true)
    );
  if (condition.event)
    return state.story?.completed.includes(condition.event) ?? false;
  if (condition.reward)
    return state.story?.rewards.includes(condition.reward) ?? false;
  throw new Error("Unknown story condition");
}
export function validateCondition(c, eventIds = new Set(), path = "condition") {
  if (c === undefined) return;
  if (!c || typeof c !== "object" || Array.isArray(c))
    throw new Error(`${path}: invalid condition`);
  const keys = ["all", "any", "not", "flag", "event", "reward"].filter((k) =>
    Object.hasOwn(c, k),
  );
  if (keys.length !== 1)
    throw new Error(`${path}: expected one condition operator`);
  const key = keys[0];
  if (["all", "any"].includes(key)) {
    if (!Array.isArray(c[key]) || !c[key].length)
      throw new Error(`${path}.${key}: expected conditions`);
    c[key].forEach((v, i) =>
      validateCondition(v, eventIds, `${path}.${key}[${i}]`),
    );
  } else if (key === "not") validateCondition(c.not, eventIds, `${path}.not`);
  else if (typeof c[key] !== "string" || !c[key])
    throw new Error(`${path}.${key}: expected an ID`);
  else if (key === "event" && !eventIds.has(c.event))
    throw new Error(`${path}: unknown event ${c.event}`);
  const allowed = key === "flag" ? [key, "equals"] : [key];
  if (Object.keys(c).some((k) => !allowed.includes(k)))
    throw new Error(`${path}: unknown condition field`);
}
