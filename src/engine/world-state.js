import { validateTrainerSight } from "./field-triggers.js";
import { ConditionQueries } from "./condition-queries.js";
import { jsonValue, readOnly } from "./extensions/values.js";
import { validateCondition } from "./conditions.js";
import { WORLD_OBJECT_FIELDS, nativeSigns } from "./world-object-index.js";

export const emptyWorldState = () => ({
  revision: 0,
  maps: {},
  visits: {},
  activeMap: null,
});
const identifier = (value) =>
  typeof value === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(value) &&
  !["__proto__", "constructor", "prototype"].includes(value);
const TILE_FIELDS = Object.freeze(["block", "behavior", "appearance"]);
const OBJECT_ENTRY_FIELDS = Object.freeze(["hidden", "spawn"]);
const OPERATION_FIELDS = Object.freeze({
  tile: Object.freeze(["kind", "map", "x", "y", "scope", ...TILE_FIELDS]),
  object: Object.freeze(["kind", "map", "id", "changes", "scope", ...OBJECT_ENTRY_FIELDS]),
});
const pickFields = (value, fields) => Object.fromEntries(
  fields.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]),
);
const directions = ["up", "down", "left", "right"];
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((k) => keys.includes(k));

/** Immutable content plus saved overlays. Runtime maps are read projections, never the source catalog. */
export class WorldStateService {
  constructor({ db, state = emptyWorldState(), objects = () => [], dialogues = new Set() }) {
    Object.assign(this, { db, state, objects, dialogues });
    this.queries = new ConditionQueries(db.conditionQueries);
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
    if (
      !exact(value, TILE_FIELDS) ||
      !Object.keys(value).length
    )
      throw new Error("Invalid world tile patch");
    for (const [key, n] of Object.entries(value)) {
      if (key === "appearance" && n === null) continue;
      if (!Number.isInteger(n) || n < 0 || n > 65535)
        throw new Error("Invalid world tile value");
      if (key === "appearance" && n > 1023)
        throw new Error("Invalid metatile appearance");
      if (
        ["block", "appearance"].includes(key) &&
        !this.db.tilesets[this.db.maps[map].tileset].metatiles[n & 1023]
      )
        throw new Error("Unknown world metatile");
    }
  }
  object(map, id, value, { full = false } = {}) {
    if (!identifier(id) || !exact(value, WORLD_OBJECT_FIELDS))
      throw new Error("Invalid world object patch");
    const m = this.db.maps[map];
    for (const key of ["elevation", "previousElevation"])
      if (
        value[key] !== undefined &&
        (!Number.isInteger(value[key]) || value[key] < 0 || value[key] > 15)
      )
        throw new Error("Invalid object elevation");
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
    if (value.dialogue != null && !this.dialogues.has(value.dialogue))
      throw new Error(`Unknown world dialogue: ${value.dialogue}`);
    if (value.trainerId !== undefined && !this.db.trainers?.[value.trainerId])
      throw new Error("Unknown world trainer");
    if (value.sightRange !== undefined)
      validateTrainerSight({
        ...value,
        trainerId: value.trainerId || (!full ? "existing" : undefined),
      });
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
    validateCondition(
      value.requires,
      new Set(),
      "object.requires",
      this.queries,
    );
  }
  validateState(state) {
    jsonValue(state, 512 * 1024);
    if (
      !exact(state, ["revision", "maps", "visits", "activeMap"]) ||
      !Number.isSafeInteger(state.revision) ||
      state.revision < 0 ||
      !exact(state.maps, Object.keys(this.db.maps)) ||
      (state.visits !== undefined &&
        !exact(state.visits, Object.keys(this.db.maps))) ||
      (state.activeMap != null && !this.db.maps[state.activeMap])
    )
      throw new Error("Invalid persistent world state");
    for (const [map, record] of [
      ...Object.entries(state.maps),
      ...Object.entries(state.visits || {}),
    ]) {
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
          (entry.hidden !== undefined && typeof entry.hidden !== "boolean") ||
          !entry.changes ||
          (entry.spawn !== undefined && typeof entry.spawn !== "boolean")
        )
          throw new Error("Invalid world object state");
        this.object(map, id, entry.changes, { full: entry.spawn });
      }
    }
    return true;
  }
  /** Persistent fields compose below temporary fields; neither layer mutates the other. */
  record(map, state = this.state) {
    const persistent = state.maps[map],
      temporary = state.visits?.[map];
    const output = { tiles: {}, objects: {} };
    for (const layer of [persistent, temporary]) {
      for (const [index, tile] of Object.entries(layer?.tiles || {}))
        output.tiles[index] = { ...output.tiles[index], ...tile };
      for (const [id, entry] of Object.entries(layer?.objects || {})) {
        const previous = output.objects[id];
        output.objects[id] = {
          ...previous,
          ...entry,
          changes: { ...previous?.changes, ...entry.changes },
        };
      }
    }
    return output;
  }
  /** Prepare before collision checks. Reloading a save resumes its current visit. */
  prepareVisit(map, { resume = false } = {}) {
    if (!this.db.maps[map]) throw new Error("Unknown world map");
    if (resume && this.state.activeMap === map) return null;
    const draft = structuredClone(this.state);
    draft.visits ||= {};
    delete draft.visits[map];
    draft.activeMap = map;
    draft.revision++;
    return draft;
  }
  map(id, state = this.state) {
    const base = this.db.maps[id];
    if (!base) throw new Error("Unknown world map");
    if (this.cacheRevision !== this.state.revision) {
      this.cache.clear();
      this.cacheRevision = this.state.revision;
    }
    if (state !== this.state || !this.cache.has(id)) {
      const blocks = [...base.blocks],
        behavior = [...base.behavior],
        appearances = {};
      for (const [index, tile] of Object.entries(
        this.record(id, state).tiles,
      )) {
        if (tile.block !== undefined) blocks[index] = tile.block;
        if (tile.behavior !== undefined) behavior[index] = tile.behavior;
        if (tile.appearance != null) appearances[index] = tile.appearance;
      }
      const projected = Object.freeze({
        ...base,
        blocks: Object.freeze(blocks),
        behavior: Object.freeze(behavior),
        appearances: Object.freeze(appearances),
        signs: Object.freeze(this.projectObjects(id, nativeSigns(id, base), state)
          .filter((object) => object.kind === "sign").map(Object.freeze)),
      });
      if (state !== this.state) return projected;
      this.cache.set(id, projected);
    }
    return this.cache.get(id);
  }
  projectObjects(map, definitions = this.objects(map), state = this.state) {
    const entries = this.record(map, state).objects,
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
        _dialogueOverride: entry.changes.dialogue != null,
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
      if (op.scope !== undefined && !["permanent", "visit"].includes(op.scope))
        throw new Error("Invalid world patch scope");
      if (op.scope === "visit" && op.map !== this.state.activeMap)
        throw new Error("Temporary patches require the active map visit");
      if (op.kind === "tile") {
        if (!exact(op, OPERATION_FIELDS.tile))
          throw new Error("Invalid tile operation");
        this.cell(op.map, op.x, op.y);
        this.tile(op.map, pickFields(op, TILE_FIELDS));
      } else if (op.kind === "object") {
        if (
          !exact(op, OPERATION_FIELDS.object) ||
          !identifier(op.id) ||
          OBJECT_ENTRY_FIELDS.some(key => op[key] !== undefined && typeof op[key] !== "boolean")
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
      const layer = op.scope === "visit" ? (draft.visits ||= {}) : draft.maps;
      const record = (layer[op.map] ||= { tiles: {}, objects: {} });
      if (op.kind === "tile") {
        const index = this.cell(op.map, op.x, op.y),
          values = pickFields(op, TILE_FIELDS);
        record.tiles[index] = { ...record.tiles[index], ...values };
      } else if (op.kind === "object") {
        const existing = record.objects[op.id];
        const effective = this.record(op.map, draft).objects[op.id];
        const current = this.objects(op.map).find((o) => o.id === op.id);
        if (
          !(op.scope === "visit" ? effective : existing) &&
          !current &&
          !op.spawn
        )
          throw new Error("Unknown world object");
        if (op.spawn && (current || effective?.spawn))
          throw new Error("Duplicate world object");
        const entry = {
          ...existing,
          ...pickFields(op, OBJECT_ENTRY_FIELDS),
          changes: { ...existing?.changes, ...(op.changes || {}) },
        };
        this.object(op.map, op.id, entry.changes, { full: entry.spawn });
        validateTrainerSight({
          ...current,
          ...effective?.changes,
          ...entry.changes,
        });
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
    this.state.visits = draft.visits || {};
    this.state.activeMap = draft.activeMap ?? null;
    return { ok: true, revision: this.state.revision };
  }
  apply(operations) {
    return this.commit(this.prepare(operations));
  }
  view() {
    return readOnly(this.state);
  }
}
