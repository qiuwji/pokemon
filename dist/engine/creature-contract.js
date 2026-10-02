/** Shared value contracts. Persistence adapters add content and custody reference checks. */
export const CREATURE_STATS = Object.freeze([
  "hp",
  "atk",
  "def",
  "spa",
  "spd",
  "spe",
]);
export const STATUSES = Object.freeze([
  "poison",
  "toxic",
  "burn",
  "paralysis",
  "sleep",
  "freeze",
]);
const integer = (value, min, max = Number.MAX_SAFE_INTEGER) =>
  Number.isSafeInteger(value) && value >= min && value <= max;
export function validStatusValues(mon) {
  if (mon.status != null && !STATUSES.includes(mon.status)) return false;
  if (mon.status === "sleep") return integer(mon.sleep, 1, 7);
  return mon.sleep === undefined || mon.sleep === 0;
}
export function validStatValues(values, min, max) {
  return (
    !!values &&
    typeof values === "object" &&
    !Array.isArray(values) &&
    Object.keys(values).length === 6 &&
    CREATURE_STATS.every((key) => integer(values[key], min, max))
  );
}
export function validCreatureValues(mon) {
  return (
    !!mon &&
    typeof mon.uid === "string" &&
    mon.uid.length > 0 &&
    mon.uid.length <= 256 &&
    typeof mon.species === "string" &&
    integer(mon.level, 1, 100) &&
    integer(mon.exp, 0) &&
    integer(mon.nature, 0, 24) &&
    integer(mon.personality, 0, 0xffffffff) &&
    ["♂", "♀", "—"].includes(mon.gender) &&
    typeof mon.originalTrainer === "string" &&
    mon.originalTrainer.length > 0 &&
    mon.originalTrainer.length <= 256 &&
    validStatValues(mon.iv, 0, 31) &&
    validStatValues(mon.ev, 0, 255) &&
    Object.values(mon.ev).reduce((sum, value) => sum + value, 0) <= 510 &&
    validStatValues(mon.stats, 1, 0x7fffffff) &&
    integer(mon.hp, 0, mon.stats.hp) &&
    validStatusValues(mon) &&
    (mon.friendship === undefined || integer(mon.friendship, 0, 255)) &&
    (mon.evolutionSkipped === undefined ||
      integer(mon.evolutionSkipped, 1, mon.level)) &&
    (mon.pendingMoves === undefined ||
      (Array.isArray(mon.pendingMoves) &&
        mon.pendingMoves.length <= 128 &&
        new Set(mon.pendingMoves).size === mon.pendingMoves.length)) &&
    (mon.growthCompanions === undefined ||
      (Array.isArray(mon.growthCompanions) &&
        mon.growthCompanions.length <= 16 &&
        new Set(mon.growthCompanions).size === mon.growthCompanions.length))
  );
}
