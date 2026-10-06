import { matchesCondition, validateCondition } from "./conditions.js";
import { readOnly } from "./extensions/values.js";
export function validateStoryProjection(
  rule,
  maps,
  queries,
  eventIds = new Set(),
) {
  const map = maps[rule.map],
    changes = rule.changes;
  if (
    !map ||
    typeof rule.objectId !== "string" ||
    !rule.objectId ||
    !changes ||
    Object.keys(changes).some(
      (key) => !["x", "y", "dir", "hidden", "name", "text"].includes(key),
    ) ||
    ["x", "y"].some(
      (key) =>
        changes[key] !== undefined &&
        (!Number.isInteger(changes[key]) ||
          changes[key] < 0 ||
          changes[key] >= map[key === "x" ? "width" : "height"]),
    ) ||
    (changes.dir !== undefined &&
      !["up", "down", "left", "right"].includes(changes.dir)) ||
    (changes.hidden !== undefined && typeof changes.hidden !== "boolean") ||
    ["name", "text"].some(
      (key) => changes[key] !== undefined && typeof changes[key] !== "string",
    )
  )
    throw new Error(`Invalid story projection: ${rule.map}/${rule.objectId}`);
  validateCondition(rule.requires, eventIds, "story.projection", queries);
}
export function projectStoryObjects(rules, map, objects, state, queries) {
  const output = new Map(objects.map((o) => [o.id, o]));
  for (const rule of rules) {
    if (rule.map !== map || !matchesCondition(rule.requires, state, queries))
      continue;
    const object = output.get(rule.objectId);
    if (!object)
      throw new Error(
        `Story projection object missing: ${map}/${rule.objectId}`,
      );
    if (rule.changes.hidden) output.delete(rule.objectId);
    else
      output.set(rule.objectId, {
        ...object,
        ...readOnly(rule.changes),
        _worldVersion: JSON.stringify([
          object._worldVersion ?? null,
          rule.changes,
        ]),
      });
  }
  return [...output.values()];
}
