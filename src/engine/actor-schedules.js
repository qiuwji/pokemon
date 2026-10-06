import { readOnly } from "./extensions/values.js";
import { isWater } from "./terrain.js";
const integer = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
const exact = (v, keys) =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => keys.includes(k));
const id = (s) =>
  typeof s === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(s) &&
  !["__proto__", "prototype", "constructor"].includes(s);
/** Calendar policies are pure content. They do not move actors or replay missed historical activities. */
export class ActorScheduleRegistry {
  constructor(definitions = {}, { maps, behaviors }) {
    this.definitions = new Map();
    for (const [key, definition] of Object.entries(definitions)) {
      const d = readOnly(definition, 32768);
      if (
        !id(key) ||
        !exact(d, ["entries", "offscreen"]) ||
        !Array.isArray(d.entries) ||
        !d.entries.length ||
        d.entries.length > 64 ||
        (d.offscreen !== undefined &&
          !["hold", "relocate"].includes(d.offscreen))
      )
        throw new Error(`Invalid actor schedule ${key}`);
      const names = new Set();
      for (const entry of d.entries) {
        const p = entry.position,
          map = maps[p?.map];
        if (
          !exact(entry, [
            "id",
            "start",
            "days",
            "position",
            "radius",
            "behavior",
            "config",
            "pose",
          ]) ||
          !id(entry.id) ||
          names.has(entry.id) ||
          !integer(entry.start, 0, 1439) ||
          !exact(p, ["map", "x", "y", "dir", "elevation"]) ||
          !map ||
          !integer(p.x, 0, map.width - 1) ||
          !integer(p.y, 0, map.height - 1) ||
          !["up", "down", "left", "right"].includes(p.dir) ||
          (p.elevation !== undefined && !integer(p.elevation, 0, 14)) ||
          ((map.blocks[p.y * map.width + p.x] >> 10) & 3) !== 0 ||
          isWater(map.behavior[p.y * map.width + p.x]) ||
          map.warps.some((w) => w.x === p.x && w.y === p.y) ||
          (entry.radius !== undefined && !integer(entry.radius, 0, 8)) ||
          (entry.behavior !== undefined &&
            !behaviors.definitions.has(entry.behavior)) ||
          (entry.pose !== undefined &&
            !behaviors.poses.definitions.has(entry.pose)) ||
          (entry.config !== undefined &&
            !exact(entry.config, Object.keys(entry.config || {}))) ||
          (entry.days !== undefined &&
            (!Array.isArray(entry.days) ||
              !entry.days.length ||
              new Set(entry.days).size !== entry.days.length ||
              !entry.days.every((day) => integer(day, 0, 6))))
        )
          throw new Error(`Invalid actor schedule entry ${key}:${entry.id}`);
        names.add(entry.id);
      }
      const days = Array.from({ length: 7 }, (_, day) =>
        d.entries
          .filter((e) => !e.days || e.days.includes(day))
          .sort((a, b) => a.start - b.start),
      );
      if (
        days.some(
          (entries) =>
            entries[0]?.start !== 0 ||
            new Set(entries.map((e) => e.start)).size !== entries.length,
        )
      )
        throw new Error(
          `Actor schedule requires unambiguous full-day coverage ${key}`,
        );
      this.definitions.set(
        key,
        readOnly({ offscreen: d.offscreen || "hold", days }),
      );
    }
  }
  get(id) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown actor schedule ${id}`);
    return d;
  }
  select(id, time) {
    if (!time.initialized) return null;
    if (
      !integer(time.day, 0, Number.MAX_SAFE_INTEGER) ||
      !integer(time.hour, 0, 23) ||
      !integer(time.minute, 0, 59)
    )
      throw new Error("Invalid actor schedule clock");
    const d = this.get(id),
      minute = time.hour * 60 + time.minute;
    const entry = d.days[time.day % 7].findLast((e) => e.start <= minute);
    return readOnly({
      schedule: id,
      day: time.day,
      offscreen: d.offscreen,
      ...entry,
    });
  }
}
export function actorAtRoutine(record, entry, elevation = null, maps = null) {
  return (
    record.map === entry.position.map &&
    Math.abs(record.x - entry.position.x) +
      Math.abs(record.y - entry.position.y) <=
      (entry.radius || 0) &&
    (entry.position.elevation === undefined ||
      (elevation
        ? elevation.level(record, maps[record.map])
        : record.elevation) === entry.position.elevation)
  );
}
