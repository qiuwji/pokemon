import { World, DIRECTIONS } from "./world.js";

/** Bounded BFS uses the same collision/ledge/connection rules as actual walking. */
export function findRoute(
  maps,
  from,
  to,
  { objects = () => [], limit = 12000, passage, elevation = null } = {},
) {
  const key = (p) =>
    `${p.map}:${p.x},${p.y}${elevation ? ":" + p.elevation : ""}`;
  const start = { ...from };
  elevation?.initialize(start, maps[start.map]);
  const queue = [{ position: start, path: [] }];
  const visited = new Set([key(start)]);
  for (let head = 0; head < queue.length && head < limit; head++) {
    const node = queue[head];
    if (
      node.position.map === to.map &&
      node.position.x === to.x &&
      node.position.y === to.y &&
      (to.elevation === undefined || node.position.elevation === to.elevation)
    )
      return node.path;
    for (const direction of Object.keys(DIRECTIONS)) {
      const p = { ...node.position };
      const world = new World(maps, p, {
        objects,
        elevation,
        ...(passage ? { passage } : {}),
      });
      if (!world.move(direction, { ignoreWarps: true })) continue;
      const id = key(p);
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push({ position: p, path: [...node.path, direction] });
    }
  }
  throw new Error(`No walkable route from ${key(from)} to ${key(to)}`);
}
