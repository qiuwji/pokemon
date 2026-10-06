import { readOnly } from "./extensions/values.js";

/** Source slots are the original implicit local IDs, never the object's current coordinates. */
export const sourceLocalId = (source, index) =>
  String(source.local_id ?? index + 1);
export const sourceObjectId = (map, kind, source, index) =>
  source.id || `core:${kind}.${map}.${sourceLocalId(source, index)}`;
export const nativeSigns = (map, definition) =>
  (definition.signs || []).map((sign, index) => ({
    ...sign,
    id: sourceObjectId(map, "sign", sign, index),
    sourceLocalId: sourceLocalId(sign, index),
    kind: "sign",
  }));

export const WORLD_OBJECT_FIELDS = Object.freeze([
  "x", "y", "actor", "dir", "elevation", "previousElevation", "kind",
  "name", "text", "dialogue", "trainerId", "sightRange", "movement", "requires",
]);
export const dialogueInteraction = (object) =>
  ["talk", "sign"].includes(object.kind);
export function objectCapabilities(object, available = true) {
  const actor = /^core:actor\.\d+$/.test(object.id);
  if (!available || actor)
    return { fields: [], hidden: false, reason: actor ? "actor-commands-required" : "not-instantiated" };
  const fields = object.kind === "sign"
    ? ["x", "y", "dir", "elevation", "previousElevation", "name", "text", "dialogue"]
    : WORLD_OBJECT_FIELDS.filter((field) => field !== "dialogue" || dialogueInteraction(object));
  return { fields, hidden: true, reason: null };
}

/** Joins source definitions and effective objects. Does not own or mutate world state. */
export function inspectWorldObjects({ map, source, definitions, objects, record, revision, id }) {
  const active = new Map(objects.map((o) => [o.id, o]));
  const known = new Map(definitions.map((o) => [o.id, o]));
  for (const [key, entry] of Object.entries(record.objects))
    if (entry.spawn) known.set(key, { ...entry.changes, id: key });
  const rows = new Map();
  const describe = (key, definition, implemented, origin) => {
    const object = active.get(key) || { ...definition, ...record.objects[key]?.changes };
    return {
      id: key, map, sourceId: definition.sourceLocalId ?? null, origin,
      kind: object.kind || "npc", x: object.x, y: object.y,
      name: object.name || null, actor: object.actor || null, dir: object.dir || null,
      script: object.script || null, dialogue: object.dialogue || null,
      text: object.text || null,
      availability: !implemented ? "not-instantiated" : active.has(key) ? "active" : "inactive",
      hidden: record.objects[key]?.hidden ?? false,
      capabilities: objectCapabilities(object, implemented),
    };
  };
  for (const [key, definition] of known)
    rows.set(key, describe(key, definition, true,
      definition.sourceLocalId !== undefined ? "source" : "runtime"));
  for (const [index, npc] of (source.npcs || []).entries()) {
    const local = sourceLocalId(npc, index);
    if (definitions.some((o) => String(o.sourceLocalId) === local && o.kind !== "sign")) continue;
    const key = sourceObjectId(map, "npc", npc, index);
    rows.set(key, describe(key, { ...npc, sourceLocalId: local }, false, "source"));
  }
  if (id && !rows.has(id)) throw new Error(`Unknown world object: ${map}/${id}`);
  return readOnly({ map, revision, objects: id ? [rows.get(id)] : [...rows.values()] });
}
