/** Decoded Generation III metatile behavior codes; named in one place. */
export const BEHAVIOR = Object.freeze({
  GRASS: 2,
  LONG_GRASS: 3,
  COUNTER: 128,
});
const LEDGE_DIRECTIONS = { 56: "right", 57: "left", 58: "up", 59: "down" };
const BLOCKED_DIRECTIONS = { 48: "right", 49: "left", 50: "up", 51: "down" };
export const ledgeDirection = (code) => LEDGE_DIRECTIONS[code];
export const blockedDirection = (code) => BLOCKED_DIRECTIONS[code];
export const isWater = (code) => code >= 16 && code <= 21;
export const isGrass = (code) =>
  [BEHAVIOR.GRASS, BEHAVIOR.LONG_GRASS].includes(code);
export const isCounter = (code) => code === BEHAVIOR.COUNTER;
