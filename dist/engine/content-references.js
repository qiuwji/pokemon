const normalized = (id) =>
  id.replace(/^MAP_/i, "").replace(/_/g, "").toUpperCase();
/** Source references may be deliberately pending, but never silently dangling. */
export function validateContentReferences(db) {
  const errors = [],
    pending = db.references || { maps: {}, scripts: {} };
  for (const kind of [
    "maps",
    "scripts",
    ...(pending.ignoredScripts ? ["ignoredScripts"] : []),
  ])
    if (
      !pending[kind] ||
      typeof pending[kind] !== "object" ||
      Array.isArray(pending[kind]) ||
      Object.values(pending[kind]).some(
        (reason) => typeof reason !== "string" || !reason.trim(),
      )
    )
      errors.push(`references.${kind}`);
  if (errors.length) return errors;
  const maps = new Map();
  for (const [id, map] of Object.entries(db.maps)) {
    const key = normalized(id);
    if (maps.has(key)) errors.push(`maps.${id}: ambiguous map identity`);
    maps.set(key, map);
  }
  const resolve = (id) =>
    typeof id === "string" ? maps.get(normalized(id)) : null;
  const cell = (map, value) =>
    value &&
    Number.isInteger(value.x) &&
    Number.isInteger(value.y) &&
    value.x >= 0 &&
    value.x < map.width &&
    value.y >= 0 &&
    value.y < map.height;
  for (const [id, map] of Object.entries(db.maps)) {
    const seen = new Set();
    for (const [index, warp] of (map.warps || []).entries()) {
      const path = `maps.${id}.warps[${index}]`;
      if (
        !cell(map, warp) ||
        !Number.isInteger(warp.elevation) ||
        warp.elevation < 0 ||
        warp.elevation > 15
      ) {
        errors.push(path + ": invalid position");
        continue;
      }
      const key = `${warp.x},${warp.y},${warp.elevation}`;
      if (seen.has(key)) errors.push(path + ": duplicate entrance");
      seen.add(key);
      const target = resolve(warp.dest_map);
      if (!target && !Object.hasOwn(pending.maps, warp.dest_map))
        errors.push(path + ": unknown destination " + warp.dest_map);
      if (
        !/^\d+$/.test(String(warp.dest_warp_id)) ||
        (target && Number(warp.dest_warp_id) >= target.warps.length)
      )
        errors.push(path + ": invalid destination index");
    }
    for (const [index, connection] of (map.connections || []).entries())
      if (
        (!resolve(connection.map) &&
          !Object.hasOwn(pending.maps, connection.map)) ||
        !["up", "down", "left", "right"].includes(connection.direction) ||
        !Number.isInteger(connection.offset)
      )
        errors.push(`maps.${id}.connections[${index}]: invalid reference`);
    for (const kind of ["npcs", "signs"])
      for (const [index, object] of (map[kind] || []).entries()) {
        const path = `maps.${id}.${kind}[${index}]`;
        if (!cell(map, object)) errors.push(path + ": invalid position");
        if (object.actor && !db.actors[object.actor])
          errors.push(path + ": unknown actor " + object.actor);
        if (
          object.script &&
          !Object.hasOwn(pending.scripts, object.script) &&
          !Object.hasOwn(pending.ignoredScripts || {}, object.script)
        )
          errors.push(path + ": unclassified source script " + object.script);
      }
  }
  return errors;
}
