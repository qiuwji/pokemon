const tastes = {
  cool: "atk",
  beauty: "spa",
  cute: "spe",
  smart: "spd",
  tough: "def",
};
const natureStats = ["atk", "def", "spe", "spa", "spd"];
/** Emerald rounds 10% to nearest and modifies only flavors matching the food's overall preference. */
export function applyNutrition(mon, food) {
  if (!mon || mon.egg || (mon.sheen || 0) >= 255) return false;
  const up = natureStats[Math.floor(mon.nature / 5)],
    down = natureStats[mon.nature % 5];
  const relation = (field) =>
    up === down
      ? 0
      : tastes[field] === up
        ? 1
        : tastes[field] === down
          ? -1
          : 0;
  const direction = Math.sign(
    Object.entries(food.flavors).reduce(
      (n, [key, value]) => n + value * relation(key),
      0,
    ),
  );
  let changed = false;
  for (const [field, amount] of Object.entries(food.flavors)) {
    const taste = relation(field),
      delta =
        amount +
        (direction && taste === direction
          ? Math.round(amount / 10) * taste
          : 0);
    const before = mon[field] || 0,
      after = Math.max(0, Math.min(255, before + delta));
    if (after !== before) {
      mon[field] = after;
      changed = true;
    }
  }
  const before = mon.sheen || 0;
  mon.sheen = Math.min(255, before + food.feel);
  return changed || mon.sheen !== before;
}
export function validateFood(food) {
  if (
    !food.flavors ||
    typeof food.flavors !== "object" ||
    Array.isArray(food.flavors) ||
    !Object.keys(food.flavors).length ||
    Object.entries(food.flavors).some(
      ([key, value]) =>
        !Object.hasOwn(tastes, key) ||
        !Number.isInteger(value) ||
        value < 0 ||
        value > 255,
    ) ||
    !Number.isInteger(food.feel) ||
    food.feel < 0 ||
    food.feel > 255
  )
    throw new Error("Invalid food flavors or feel");
}
export const NUTRITION_FIELDS = Object.freeze([
  ...Object.keys(tastes),
  "sheen",
]);
