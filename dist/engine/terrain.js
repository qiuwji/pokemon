/** Decoded Generation III metatile behavior codes; named in one place. */
export const BEHAVIOR = Object.freeze({
  GRASS: 2,
  LONG_GRASS: 3,
  COUNTER: 128,
  WATERFALL: 0x13,
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
