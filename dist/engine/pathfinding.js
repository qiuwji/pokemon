import { World, DIRECTIONS } from "./world.js";

/** Bounded BFS uses the same collision/ledge/connection rules as actual walking. */
export function findRoute(
  maps,
  from,
  to,
  { objects = () => [], limit = 12000 } = {},
) {
  const key = (p) => `${p.map}:${p.x},${p.y}`;
  const queue = [{ position: { ...from }, path: [] }];
  const visited = new Set([key(from)]);
  for (let head = 0; head < queue.length && head < limit; head++) {
    const node = queue[head];
    if (key(node.position) === key(to)) return node.path;
    for (const direction of Object.keys(DIRECTIONS)) {
      const p = { ...node.position };
      const world = new World(maps, p, { objects });
      if (!world.move(direction, { ignoreWarps: true })) continue;
      const id = key(p);
      if (visited.has(id)) continue;
      visited.add(id);
      queue.push({ position: p, path: [...node.path, direction] });
    }
  }
  throw new Error(`No walkable route from ${key(from)} to ${key(to)}`);
}
