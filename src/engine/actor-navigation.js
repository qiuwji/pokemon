import { DIRECTIONS } from "./world.js";
import { findRoute } from "./pathfinding.js";
import { readOnly } from "./extensions/values.js";
/** Perception is a query; it grants no authority to move or change the observed actor. */
export function perceive(maps, self, entities, radius = 8, elevation = null) {
  const map = maps[self.map];
  const visible = (other) => {
    if (
      elevation &&
      !elevation.compatible(
        elevation.level(self, map),
        elevation.level(other, map),
      )
    )
      return false;
    let x = self.x,
      y = self.y;
    const dx = Math.abs(other.x - x),
      dy = Math.abs(other.y - y),
      sx = x < other.x ? 1 : -1,
      sy = y < other.y ? 1 : -1;
    let error = dx - dy;
    while (x !== other.x || y !== other.y) {
      const e = 2 * error;
      if (e > -dy) {
        error -= dy;
        x += sx;
      }
      if (e < dx) {
        error += dx;
        y += sy;
      }
      if (x === other.x && y === other.y) return true;
      if (((map.blocks[y * map.width + x] >> 10) & 3) !== 0) return false;
    }
    return true;
  };
  return readOnly(
    entities
      .filter((e) => e.map === self.map && e.uid !== self.uid)
      .map((e) => ({
        ...e,
        distance: Math.abs(e.x - self.x) + Math.abs(e.y - self.y),
      }))
      .filter((e) => e.distance <= radius)
      .map((e) => ({ ...e, visible: visible(e) }))
      .sort(
        (a, b) =>
          a.distance - b.distance ||
          (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0),
      ),
  );
}
/** Reuses the actual World collision model. Occupied targets can request a reachable adjacent tile. */
export function nextActorDirection(maps, from, goal, options) {
  const candidates = goal.adjacent
    ? Object.values(DIRECTIONS).map(([dx, dy]) => ({
        map: goal.map,
        x: goal.x + dx,
        y: goal.y + dy,
        ...(goal.elevation !== undefined ? { elevation: goal.elevation } : {}),
      }))
    : [goal];
  const paths = [];
  for (const target of candidates) {
    const m = maps[target.map];
    if (
      !m ||
      target.x < 0 ||
      target.y < 0 ||
      target.x >= m.width ||
      target.y >= m.height
    )
      continue;
    try {
      paths.push(findRoute(maps, from, target, { ...options, limit: 4096 }));
    } catch (error) {
      if (!error.message.startsWith("No walkable route")) throw error;
    }
  }
  paths.sort((a, b) => a.length - b.length);
  return paths[0]?.[0] || null;
}
