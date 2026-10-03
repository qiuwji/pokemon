import { DIRECTIONS } from "../world.js";
/** Public content helper: a neighboring cell, without reading or modifying a session. */
export function frontCell(position) {
  const delta = DIRECTIONS[position.dir];
  if (!delta) throw new Error("Unknown field direction");
  return Object.freeze({
    map: position.map,
    x: position.x + delta[0],
    y: position.y + delta[1],
  });
}
