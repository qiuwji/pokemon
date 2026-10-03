import { BEHAVIOR, isWater } from "../../terrain.js";
import { GEN3_ELEVATION } from "./elevation.js";
const fishable = new Set([
  BEHAVIOR.POND_WATER,
  BEHAVIOR.OCEAN_WATER,
  BEHAVIOR.INTERIOR_DEEP_WATER,
  BEHAVIOR.DEEP_WATER,
  BEHAVIOR.SOOTOPOLIS_DEEP_WATER,
  BEHAVIOR.CURRENT_EAST,
  BEHAVIOR.CURRENT_WEST,
  BEHAVIOR.CURRENT_NORTH,
  BEHAVIOR.CURRENT_SOUTH,
]);
/** item_use.c CanFish / field_player_avatar.c IsPlayerFacingSurfableFishableWater.
 * Shore fishing requires elevation 3 and an unblocked elevation mismatch, not merely a blue-looking tile.
 * Surfing also permits a bridge over water without an edge, as specified by the original rule.
 */
export function gen3CanFish({ mode, underwater, elevation, cell }) {
  if (
    !cell ||
    mode === "dive" ||
    underwater ||
    cell.behavior === BEHAVIOR.WATERFALL
  )
    return false;
  if (mode === "surf")
    return (
      (isWater(cell.behavior) && cell.collision === 0) ||
      (cell.behavior >= BEHAVIOR.BRIDGE_OVER_OCEAN &&
        cell.behavior <= BEHAVIOR.BRIDGE_OVER_POND_HIGH)
    );
  return (
    elevation === 3 &&
    cell.collision === 0 &&
    !GEN3_ELEVATION.canEnter(elevation, cell.elevation) &&
    fishable.has(cell.behavior)
  );
}
/** field_player_avatar.c Fishing_* at fixed reference revision; 60 frames per second. */
export function gen3FishingRules(rod) {
  const index = ["old", "good", "super"].indexOf(rod);
  if (index < 0) throw new Error("Unknown fishing rod");
  return Object.freeze({
    castDuration: 1000,
    dotDuration: (20 * 1000) / 60,
    reelDuration: ([36, 33, 30][index] * 1000) / 60,
    minimumRounds: (roll) => 1 + roll([1, 3, 6][index]),
    dots: (round, roll) => Math.min(10, roll(10) + (round === 0 ? 4 : 1)),
    bite: (lead, roll) =>
      (!lead?.egg &&
        ["suction_cups", "sticky_hold"].includes(lead?.ability) &&
        roll(100) > 14) ||
      roll(2) === 0,
    extraRound: (round, roll) =>
      round < 2 &&
      roll(100) <
        [
          [0, 0],
          [40, 10],
          [70, 30],
        ][index][round],
  });
}
