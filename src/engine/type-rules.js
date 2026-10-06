/** Generation III category policy; a different ruleset may inject its own damage calculator. */
export const PHYSICAL_TYPES = new Set([
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
]);
export const isPhysical = (move) => PHYSICAL_TYPES.has(move.type);
