import { jsonValue, readOnly } from "./extensions/values.js";
import { validateCondition } from "./conditions.js";

export const emptyWorldState = () => ({ revision: 0, maps: {} });
const identifier = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(value) &&
  !["__proto__", "constructor", "prototype"].includes(value);
const directions = ["up", "down", "left", "right"];
const objectFields = [
  "x",
  "y",
  "actor",
  "dir",
  "kind",
  "name",
  "text",
  "trainerId",
  "movement",
  "requires",
];
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((k) => keys.includes(k));

/** Immutable content plus saved overlays. Runtime maps are read projections, never the source catalog. */
export class WorldStateService {
  constructor({ db, state = emptyWorldState(), objects = () => [] }) {
    Object.assign(this, { db, state, objects });
    this.cache = new Map();
    this.cacheRevision = -1;
    this.validateState(state);
    this.maps = Object.fromEntries(
      Object.keys(db.maps).map((id) => [id, null]),
    );
    for (const id of Object.keys(this.maps))
      Object.defineProperty(this.maps, id, {
        enumerable: true,
        get: () => this.map(id),
      });
    Object.freeze(this.maps);
  }
  cell(map, x, y) {
    const m = this.db.maps[map];
    if (
      !m ||
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      y < 0 ||
      x >= m.width ||
      y >= m.height
    )
      throw new Error("Invalid world cell");
    return y * m.width + x;
  }
  tile(map, value) {
    if (!exact(value, ["block", "behavior"]) || !Object.keys(value).length)
      throw new Error("Invalid world tile patch");
    for (const [key, n] of Object.entries(value)) {
      if (!Number.isInteger(n) || n < 0 || n > 65535)
        throw new Error("Invalid world tile value");
      if (
        key === "block" &&
        !this.db.tilesets[this.db.maps[map].tileset].metatiles[n & 1023]
      )
        throw new Error("Unknown world metatile");
    }
  }
  object(map, id, value, { full = false } = {}) {
    if (!identifier(id) || !exact(value, objectFields))
      throw new Error("Invalid world object patch");
    const m = this.db.maps[map];
    for (const key of ["x", "y"])
      if (
        value[key] !== undefined &&
        (!Number.isInteger(value[key]) ||
          value[key] < 0 ||
          value[key] >= (key === "x" ? m.width : m.height))
      )
        throw new Error("Invalid object coordinate");
    if (
      full &&
      (value.x === undefined || value.y === undefined || !value.actor)
    )
      throw new Error("Spawn needs coordinates and actor");
    if (value.actor !== undefined && !this.db.actors[value.actor])
      throw new Error("Unknown object actor");
    if (value.dir !== undefined && !directions.includes(value.dir))
      throw new Error("Invalid object direction");
    for (const key of ["kind", "name", "text"])
      if (
        value[key] !== undefined &&
        (typeof value[key] !== "string" || value[key].length > 4096)
      )
        throw new Error("Invalid object text");
    if (value.trainerId !== undefined && !this.db.trainers?.[value.trainerId])
      throw new Error("Unknown world trainer");
    if (value.movement !== undefined) {
      const movement = value.movement;
      if (
        !exact(movement, ["mode", "rangeX", "rangeY"]) ||
        typeof movement.mode !== "string" ||
        ["rangeX", "rangeY"].some(
          (k) =>
            movement[k] !== undefined &&
            (!Number.isInteger(movement[k]) ||
              movement[k] < 0 ||
              movement[k] > 64),
        )
      )
        throw new Error("Invalid world movement");
    }
    validateCondition(value.requires);
  }
  validateState(state) {
    jsonValue(state, 512 * 1024);
    if (
      !exact(state, ["revision", "maps"]) ||
      !Number.isSafeInteger(state.revision) ||
      state.revision < 0 ||
      !exact(state.maps, Object.keys(this.db.maps))
    )
      throw new Error("Invalid persistent world state");
    for (const [map, record] of Object.entries(state.maps)) {
      if (
        !exact(record, ["tiles", "objects"]) ||
        !record.tiles ||
        !record.objects ||
        Array.isArray(record.tiles) ||
        Array.isArray(record.objects) ||
        typeof record.tiles !== "object" ||
        typeof record.objects !== "object"
      )
        throw new Error("Invalid world map state");
      for (const [index, value] of Object.entries(record.tiles)) {
        if (
          !/^(0|[1-9]\d*)$/.test(index) ||
          Number(index) >= this.db.maps[map].width * this.db.maps[map].height
        )
          throw new Error("Invalid tile index");
        this.tile(map, value);
      }
      for (const [id, entry] of Object.entries(record.objects)) {
        if (
          !exact(entry, ["hidden", "spawn", "changes"]) ||
          typeof entry.hidden !== "boolean" ||
          !entry.changes ||
          typeof entry.spawn !== "boolean"
        )
          throw new Error("Invalid world object state");
        this.object(map, id, entry.changes, { full: entry.spawn });
      }
    }
    return true;
  }
  map(id) {
    const base = this.db.maps[id];
    if (!base) throw new Error("Unknown world map");
    if (this.cacheRevision !== this.state.revision) {
      this.cache.clear();
      this.cacheRevision = this.state.revision;
    }
    if (!this.cache.has(id)) {
      const blocks = [...base.blocks],
        behavior = [...base.behavior];
      for (const [index, tile] of Object.entries(
        this.state.maps[id]?.tiles || {},
      )) {
        if (tile.block !== undefined) blocks[index] = tile.block;
        if (tile.behavior !== undefined) behavior[index] = tile.behavior;
      }
      this.cache.set(
        id,
        Object.freeze({
          ...base,
          blocks: Object.freeze(blocks),
          behavior: Object.freeze(behavior),
        }),
      );
    }
    return this.cache.get(id);
  }
  projectObjects(map, definitions = this.objects(map)) {
    const entries = this.state.maps[map]?.objects || {},
      output = new Map(definitions.map((d) => [d.id, d]));
    for (const [id, entry] of Object.entries(entries)) {
      if (entry.hidden) {
        output.delete(id);
        continue;
      }
      const base = output.get(id);
      if (!base && !entry.spawn) continue;
      output.set(id, {
        ...base,
        ...entry.changes,
        id,
        _worldVersion: JSON.stringify(entry),
      });
    }
    return [...output.values()];
  }
  validateOperations(operations) {
    const batch = jsonValue(operations, 65536);
    if (!Array.isArray(batch) || !batch.length || batch.length > 128)
      throw new Error("Invalid world patch batch");
    for (const op of batch) {
      if (!this.db.maps[op.map]) throw new Error("Unknown world map");
      if (op.kind === "tile") {
        if (!exact(op, ["kind", "map", "x", "y", "block", "behavior"]))
          throw new Error("Invalid tile operation");
        this.cell(op.map, op.x, op.y);
        this.tile(op.map, {
          ...("block" in op ? { block: op.block } : {}),
          ...("behavior" in op ? { behavior: op.behavior } : {}),
        });
      } else if (op.kind === "object") {
        if (
          !exact(op, ["kind", "map", "id", "changes", "hidden", "spawn"]) ||
          !identifier(op.id) ||
          (op.hidden !== undefined && typeof op.hidden !== "boolean") ||
          (op.spawn !== undefined && typeof op.spawn !== "boolean")
        )
          throw new Error("Invalid object operation");
        this.object(op.map, op.id, op.changes || {}, {
          full: op.spawn === true,
        });
      } else throw new Error("Unknown world operation");
    }
    return batch;
  }
  prepare(operations) {
    const batch = this.validateOperations(operations);
    const draft = structuredClone(this.state);
    for (const op of batch) {
      if (!this.db.maps[op.map]) throw new Error("Unknown world map");
      const record = (draft.maps[op.map] ||= { tiles: {}, objects: {} });
      if (op.kind === "tile") {
        if (!exact(op, ["kind", "map", "x", "y", "block", "behavior"]))
          throw new Error("Invalid tile operation");
        const index = this.cell(op.map, op.x, op.y),
          values = {
            ...("block" in op ? { block: op.block } : {}),
            ...("behavior" in op ? { behavior: op.behavior } : {}),
          };
        this.tile(op.map, values);
        record.tiles[index] = { ...record.tiles[index], ...values };
      } else if (op.kind === "object") {
        if (
          !exact(op, ["kind", "map", "id", "changes", "hidden", "spawn"]) ||
          !identifier(op.id) ||
          (op.hidden !== undefined && typeof op.hidden !== "boolean") ||
          (op.spawn !== undefined && typeof op.spawn !== "boolean")
        )
          throw new Error("Invalid object operation");
        const existing = record.objects[op.id];
        const current = this.objects(op.map).find((o) => o.id === op.id);
        if (!existing && !current && !op.spawn)
          throw new Error("Unknown world object");
        if (op.spawn && (current || existing?.spawn))
          throw new Error("Duplicate world object");
        const entry = {
          hidden: op.hidden ?? existing?.hidden ?? false,
          spawn: op.spawn ?? existing?.spawn ?? false,
          changes: { ...existing?.changes, ...(op.changes || {}) },
        };
        this.object(op.map, op.id, entry.changes, { full: entry.spawn });
        record.objects[op.id] = entry;
      } else throw new Error("Unknown world operation");
    }
    draft.revision++;
    this.validateState(draft);
    return draft;
  }
  commit(draft) {
    this.validateState(draft);
    if (draft.revision !== this.state.revision + 1)
      throw new Error("Stale world patch");
    this.state.revision = draft.revision;
    this.state.maps = draft.maps;
    return { ok: true, revision: this.state.revision };
  }
  apply(operations) {
    return this.commit(this.prepare(operations));
  }
  view() {
    return readOnly(this.state);
  }
}
