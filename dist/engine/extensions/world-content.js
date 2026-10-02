const resolveMap = (maps, id) =>
  typeof id === "string" &&
  Object.keys(maps).find(
    (k) =>
      k.replace(/_/g, "").toUpperCase() ===
      id.replace(/^MAP_/i, "").replace(/_/g, "").toUpperCase(),
  );
const cell = (map, entry) =>
  Number.isInteger(entry.x) &&
  Number.isInteger(entry.y) &&
  entry.x >= 0 &&
  entry.x < map.width &&
  entry.y >= 0 &&
  entry.y < map.height;
/** Extension references must resolve inside the assembled catalog, including forward references. */
export function validateWorldExtensions(catalog, entries) {
  const validateWarps = (map, warps) => {
    for (const warp of warps) {
      const target = catalog.maps[resolveMap(catalog.maps, warp.dest_map)],
        index = Number(warp.dest_warp_id);
      if (
        !cell(map, warp) ||
        !target ||
        !/^\d+$/.test(String(warp.dest_warp_id)) ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= target.warps.length
      )
        throw new Error("Invalid extension warp reference");
    }
  };
  const validateConnections = (connections) => {
    for (const connection of connections)
      if (
        !["up", "down", "left", "right"].includes(connection.direction) ||
        !Number.isInteger(connection.offset) ||
        !resolveMap(catalog.maps, connection.map)
      )
        throw new Error("Invalid extension map connection");
  };
  for (const { kind, id, value } of entries) {
    if (kind === "maps") {
      const map = catalog.maps[id];
      if (
        [...map.blocks, ...map.border, ...map.behavior].some(
          (v) => !Number.isInteger(v) || v < 0 || v > 65535,
        )
      )
        throw new Error("Invalid extension grid values");
      validateWarps(map, map.warps);
      validateConnections(map.connections);
      for (const object of [...map.npcs, ...map.signs])
        if (
          !cell(map, object) ||
          (object.actor && !catalog.actors[object.actor])
        )
          throw new Error("Invalid extension scene object");
    }
    if (kind === "mapExtensions") {
      validateWarps(catalog.maps[value.map], value.warps || []);
      validateConnections(value.connections || []);
    }
  }
  for (const map of Object.values(catalog.maps)) {
    const ids = (map.elements || []).map((e) => e.id);
    if (new Set(ids).size !== ids.length)
      throw new Error("Duplicate map element identity");
  }
}
