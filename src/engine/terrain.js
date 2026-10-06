/** Decoded Generation III metatile behavior codes; named in one place. */
export const BEHAVIOR = Object.freeze({
  EAST_ARROW_WARP: 0x62,
  WEST_ARROW_WARP: 0x63,
  NORTH_ARROW_WARP: 0x64,
  SOUTH_ARROW_WARP: 0x65,
  NON_ANIMATED_DOOR: 0x60,
  LADDER: 0x61,
  ANIMATED_DOOR: 0x69,
  WATER_SOUTH_ARROW_WARP: 0x6d,
  DEEP_SOUTH_WARP: 0x6e,
  GRASS: 2,
  LONG_GRASS: 3,
  COUNTER: 128,
  POND_WATER: 0x10,
  INTERIOR_DEEP_WATER: 0x11,
  DEEP_WATER: 0x12,
  WATERFALL: 0x13,
  SOOTOPOLIS_DEEP_WATER: 0x14,
  OCEAN_WATER: 0x15,
  BRIDGE_OVER_OCEAN: 0x70,
  BRIDGE_OVER_POND_LOW: 0x71,
  BRIDGE_OVER_POND_MED: 0x72,
  BRIDGE_OVER_POND_HIGH: 0x73,
  NO_RUNNING: 0x0a,
  ICE: 0x20,
  THIN_ICE: 0x26,
  CRACKED_ICE: 0x27,
  CRACKED_FLOOR_HOLE: 0x66,
  CRACKED_FLOOR: 0xd2,
  SLIPPERY_FLOOR: 0x48,
  HOT_SPRINGS: 0x28,
  WALK_EAST: 0x40,
  WALK_WEST: 0x41,
  WALK_NORTH: 0x42,
  WALK_SOUTH: 0x43,
  SLIDE_EAST: 0x44,
  SLIDE_WEST: 0x45,
  SLIDE_NORTH: 0x46,
  SLIDE_SOUTH: 0x47,
  CURRENT_EAST: 0x50,
  CURRENT_WEST: 0x51,
  CURRENT_NORTH: 0x52,
  CURRENT_SOUTH: 0x53,
  PACIFIDLOG_LOG_TOP: 0x74,
  PACIFIDLOG_LOG_BOTTOM: 0x75,
  PACIFIDLOG_LOG_LEFT: 0x76,
  PACIFIDLOG_LOG_RIGHT: 0x77,
  FORTREE_BRIDGE: 0x78,
  MUDDY_SLOPE: 0xd0,
  BUMPY_SLOPE: 0xd1,
  ISOLATED_VERTICAL_RAIL: 0xd3,
  ISOLATED_HORIZONTAL_RAIL: 0xd4,
  VERTICAL_RAIL: 0xd5,
  HORIZONTAL_RAIL: 0xd6,
});
const LEDGE_DIRECTIONS = { 56: "right", 57: "left", 58: "up", 59: "down" };
const BLOCKED_DIRECTIONS = { 48: "right", 49: "left", 50: "up", 51: "down" };
export const ledgeDirection = (code) => LEDGE_DIRECTIONS[code];
export const blockedDirection = (code) => BLOCKED_DIRECTIONS[code];
const SURFABLE = new Set([
  0x10, 0x11, 0x12, 0x13, 0x14, 0x15, 0x19, 0x22, 0x2a, 0x50, 0x51, 0x52, 0x53,
  0x6c, 0x6d, 0x6f,
]);
export const isWater = (code) => SURFABLE.has(code);
export const isGrass = (code) =>
  [BEHAVIOR.GRASS, BEHAVIOR.LONG_GRASS].includes(code);
export const isCounter = (code) => code === BEHAVIOR.COUNTER;

/** Encounter bit is independent of surfability (currents and waterfalls have none). */
const ENCOUNTER_TERRAIN = new Set([
  2, 3, 5, 6, 8, 0x0b, 0x10, 0x11, 0x12, 0x15, 0x22, 0x24, 0x25, 0x2a,
]);
export const hasEncounterTerrain = (code) => ENCOUNTER_TERRAIN.has(code);

/** Arrow exits trigger from the occupied cell, on the next outward input. */
export const arrowWarpDirection = (code) => ({
  [BEHAVIOR.EAST_ARROW_WARP]: "right", [BEHAVIOR.WEST_ARROW_WARP]: "left",
  [BEHAVIOR.NORTH_ARROW_WARP]: "up", [BEHAVIOR.SOUTH_ARROW_WARP]: "down",
  [BEHAVIOR.WATER_SOUTH_ARROW_WARP]: "down",
})[code];
/**
 * Arrival facing after a warp, by the destination metatile (src/overworld.c GetAdjustedInitialDirection).
 * Doors and non-animated stairs face south; arrow warps face back into the map; ladders keep the
 * direction the player was travelling. The previous indoor/outdoor guess got 1F↔2F stairs wrong.
 */
export const arrivalDirection = (code, previousDir = "down") => {
  if (code === BEHAVIOR.DEEP_SOUTH_WARP) return "up";
  if (code === BEHAVIOR.NON_ANIMATED_DOOR || code === BEHAVIOR.ANIMATED_DOOR) return "down";
  if (code === BEHAVIOR.SOUTH_ARROW_WARP || code === BEHAVIOR.WATER_SOUTH_ARROW_WARP) return "up";
  if (code === BEHAVIOR.NORTH_ARROW_WARP) return "down";
  if (code === BEHAVIOR.WEST_ARROW_WARP) return "right";
  if (code === BEHAVIOR.EAST_ARROW_WARP) return "left";
  if (code === BEHAVIOR.LADDER) return previousDir;
  return "down";
};
