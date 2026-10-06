/** Reusable condition registry. Rule packs may add predicates without editing the evolution service. */
export class GrowthConditions {
  constructor(custom = {}) {
    this.predicates = { ...GROWTH_CONDITIONS, ...custom };
  }
  validate(conditions) {
    if (!Array.isArray(conditions))
      throw new Error("Expected growth conditions");
    for (const condition of conditions) {
      const predicate = this.predicates[condition?.type];
      if (
        !Object.hasOwn(this.predicates, condition?.type) ||
        typeof predicate !== "function"
      )
        throw new Error(`Unknown growth condition ${condition?.type}`);
      predicate.validate?.(condition);
    }
  }
  test(conditions, context) {
    this.validate(conditions);
    return conditions.every((c) => this.predicates[c.type](context, c));
  }
}
const positive = (c, key) => {
  if (!Number.isInteger(c[key]) || c[key] < 0)
    throw new Error(`Invalid growth ${key}`);
};
export const GROWTH_CONDITIONS = {
  level: (c, s) => c.mon.level >= s.value,
  friendship: (c, s) => (c.mon.friendship ?? 70) >= s.value,
  beauty: (c, s) => (c.mon.beauty ?? 0) >= s.value,
  time: (c, s) =>
    s.period === "day"
      ? c.hour >= 12 && c.hour < 24
      : c.hour >= 0 && c.hour < 12,
  item: (c, s) => c.item === s.id,
  heldItem: (c, s) => c.mon.heldItem === s.id,
  statCompare: (c, s) =>
    s.relation === "gt"
      ? c.mon.stats[s.left] > c.mon.stats[s.right]
      : s.relation === "lt"
        ? c.mon.stats[s.left] < c.mon.stats[s.right]
        : c.mon.stats[s.left] === c.mon.stats[s.right],
  personality: (c, s) =>
    ((c.mon.personality ?? 0) >>> 16) % 10 >= s.min &&
    ((c.mon.personality ?? 0) >>> 16) % 10 <= s.max,
};
for (const type of ["level", "friendship", "beauty"])
  GROWTH_CONDITIONS[type].validate = (c) => positive(c, "value");
GROWTH_CONDITIONS.time.validate = (c) => {
  if (!["day", "night"].includes(c.period))
    throw new Error("Invalid growth time");
};
for (const type of ["item", "heldItem"])
  GROWTH_CONDITIONS[type].validate = (c) => {
    if (typeof c.id !== "string" || !c.id)
      throw new Error("Invalid growth item");
  };
GROWTH_CONDITIONS.statCompare.validate = (c) => {
  if (
    !["atk", "def", "spa", "spd", "spe"].includes(c.left) ||
    !["atk", "def", "spa", "spd", "spe"].includes(c.right) ||
    !["gt", "lt", "eq"].includes(c.relation)
  )
    throw new Error("Invalid stat comparison");
};
GROWTH_CONDITIONS.personality.validate = (c) => {
  if (
    !Number.isInteger(c.min) ||
    !Number.isInteger(c.max) ||
    c.min < 0 ||
    c.max > 9 ||
    c.min > c.max
  )
    throw new Error("Invalid personality branch");
};
