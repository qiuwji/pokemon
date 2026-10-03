import { DIRECTIONS, World } from "./world.js";

/** Pure spatial selection. Script execution remains owned by the story runner. */
export function validateRegion(region, path = "region") {
  if (
    !region ||
    typeof region.map !== "string" ||
    !region.map ||
    !Number.isInteger(region.x) ||
    !Number.isInteger(region.y) ||
    region.x < 0 ||
    region.y < 0 ||
    !Number.isInteger(region.width) ||
    region.width < 1 ||
    !Number.isInteger(region.height) ||
    region.height < 1 ||
    Object.keys(region).some(
      (k) => !["map", "x", "y", "width", "height"].includes(k),
    )
  )
    throw new Error(`Invalid ${path}`);
}
export function matchesRegion(region, position) {
  return (
    !!position &&
    position.map === region.map &&
    position.x >= region.x &&
    position.x < region.x + region.width &&
    position.y >= region.y &&
    position.y < region.y + region.height
  );
}
export function validateTrainerSight(object) {
  if (
    object.sightRange !== undefined &&
    (!object.trainerId ||
      !Number.isInteger(object.sightRange) ||
      object.sightRange < 1 ||
      object.sightRange > 64)
  )
    throw new Error("Invalid trainer sight range");
}
/** Emerald trainer_see.c: directional range, clear path, then approach. No RNG or mutation. */
export function findWatchingTrainer({
  maps,
  position,
  objects,
  eligible = () => true,
  elevation = null,
}) {
  for (const object of objects(position.map)) {
    if (!object.trainerId || !object.sightRange || !eligible(object)) continue;
    const direction = DIRECTIONS[object.dir];
    if (!direction) continue;
    const [dx, dy] = direction;
    const distance = dx
      ? (position.x - object.x) / dx
      : (position.y - object.y) / dy;
    if (
      distance < 1 ||
      distance > object.sightRange ||
      !Number.isInteger(distance) ||
      object.x + dx * distance !== position.x ||
      object.y + dy * distance !== position.y
    )
      continue;
    const from = {
      map: position.map,
      x: object.x,
      y: object.y,
      dir: object.dir,
      ...(elevation
        ? {
            elevation: elevation.level(object, maps[position.map]),
            previousElevation:
              object.previousElevation ??
              elevation.level(object, maps[position.map]),
          }
        : {}),
    };
    const world = new World(maps, from, {
      objects: (map) => objects(map).filter((o) => o.id !== object.id),
      elevation,
    });
    let clear = true;
    // Player occupies the last cell: check terrain there without moving onto the player.
    for (let i = 1; i <= distance; i++) {
      if (
        !world.move(object.dir, { ignoreWarps: true }) ||
        from.map !== position.map
      ) {
        clear = false;
        break;
      }
    }
    if (
      clear &&
      (!elevation ||
        elevation.compatible(
          from.elevation,
          elevation.level(position, maps[position.map]),
        ))
    )
      return object;
  }
  return null;
}
