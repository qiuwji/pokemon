import { World, DIRECTIONS } from "./world.js";
import { readOnly } from "./extensions/values.js";
/** A reusable grid displacement plan. Eligibility and object/terrain types belong to registered actions. */
export function planObjectMotion(
  operation,
  { maps, position, objects, elevation, objectPassage, playerPassage },
) {
  if (
    !operation ||
    Object.keys(operation).some(
      (k) =>
        ![
          "kind",
          "object",
          "direction",
          "follow",
          "mode",
          "scope",
          "duration",
        ].includes(k),
    ) ||
    operation.kind !== "displace" ||
    typeof operation.object !== "string" ||
    !DIRECTIONS[operation.direction] ||
    typeof operation.follow !== "boolean" ||
    !["visit", "permanent"].includes(operation.scope) ||
    typeof operation.mode !== "string" ||
    !Number.isFinite(operation.duration) ||
    operation.duration <= 0 ||
    operation.duration > 60000
  )
    throw new Error("Invalid object motion");
  const map = maps[position.map],
    object = objects.find((o) => o.id === operation.object);
  if (
    !object ||
    /^core:actor\.\d+$/.test(object.id) ||
    object.reserved?.some((p) => p.x !== object.x || p.y !== object.y)
  )
    throw new Error("Object motion requires a stationary world object");
  const from = {
    map: position.map,
    x: object.x,
    y: object.y,
    dir: operation.direction,
    elevation: elevation.level(object, map),
    previousElevation: object.previousElevation ?? elevation.level(object, map),
  };
  const to = { ...from },
    [dx, dy] = DIRECTIONS[operation.direction];
  const obstacles = objects.filter((o) => o.id !== object.id);
  obstacles.push({ ...position, id: "player" });
  const world = new World(maps, to, {
    objects: () => obstacles,
    elevation,
    passage: (c) => !c.warp && objectPassage(operation.mode, c),
  });
  const moved = world.move(operation.direction, { ignoreWarps: true });
  if (
    !moved ||
    moved.jump ||
    to.map !== from.map ||
    to.x !== from.x + dx ||
    to.y !== from.y + dy ||
    map.warps.some((w) => w.x === to.x && w.y === to.y)
  )
    throw new Error("Object motion destination is blocked");
  let follower = null;
  if (operation.follow) {
    if (
      position.x + dx !== from.x ||
      position.y + dy !== from.y ||
      !elevation.compatible(elevation.level(position, map), from.elevation)
    )
      throw new Error("Object follower must be adjacent and aligned");
    follower = { ...position };
    const future = objects.map((o) =>
      o.id === object.id ? { ...o, ...to, reserved: [] } : o,
    );
    const player = new World(maps, follower, {
      objects: () => future,
      elevation,
      passage: (c) => !c.warp && playerPassage(c),
    });
    const step = player.move(operation.direction, { ignoreWarps: true });
    if (
      !step ||
      step.jump ||
      follower.map !== position.map ||
      follower.x !== from.x ||
      follower.y !== from.y
    )
      throw new Error("Object follower destination is blocked");
  }
  return readOnly({
    object: object.id,
    from,
    to,
    follower,
    duration: operation.duration,
    scope: operation.scope,
  });
}
