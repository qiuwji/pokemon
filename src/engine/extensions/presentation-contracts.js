import {
  objectSchema,
  validateSchema,
  validateValue,
  readOnly,
} from "./values.js";

/** Visual registration is data validation only; playback and browser resources belong to hosts. */
export function validatePresentation(definition) {
  if (
    !definition ||
    Object.keys(definition).some(
      (k) => !["duration", "scope", "loop", "schema", "draw"].includes(k),
    ) ||
    typeof definition.draw !== "function" ||
    !Number.isFinite(definition.duration) ||
    definition.duration < 1 ||
    definition.duration > 10000 ||
    (definition.loop !== undefined && typeof definition.loop !== "boolean") ||
    (definition.scope !== undefined &&
      !["page", "field", "battle"].includes(definition.scope))
  )
    throw new Error("Invalid presentation");
  const schema = validateSchema(definition.schema ?? objectSchema());
  if (schema.type !== "object")
    throw new Error("Presentation requires object schema");
  return Object.freeze({
    ...definition,
    schema,
    loop: definition.loop ?? false,
  });
}

export function presentationPayload(
  definition,
  payload = {},
  { feedback = false } = {},
) {
  if (!definition) throw new Error("Unknown presentation");
  if (feedback && definition.loop)
    throw new Error("Loop presentation requires a mounted Canvas");
  const data = readOnly(payload, 8192);
  validateValue(definition.schema, data, "presentation payload");
  return data;
}
