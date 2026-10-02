/** Strict JSON at extension/save/protocol boundaries; no callable values or prototype keys. */
export function jsonValue(value, maxBytes = 65536) {
  const seen = new Set();
  const visit = (v, depth) => {
    if (depth > 24) throw new Error("Data nesting limit exceeded");
    if (v === null || typeof v === "boolean" || typeof v === "string") return;
    if (typeof v === "number" && Number.isFinite(v)) return;
    if (
      !v ||
      typeof v !== "object" ||
      seen.has(v) ||
      (!Array.isArray(v) &&
        Object.getPrototypeOf(v) !== Object.prototype &&
        Object.getPrototypeOf(v) !== null)
    )
      throw new Error("Expected finite JSON data");
    seen.add(v);
    for (const [k, child] of Object.entries(v)) {
      if (["__proto__", "prototype", "constructor"].includes(k))
        throw new Error("Reserved data key");
      visit(child, depth + 1);
    }
    seen.delete(v);
  };
  visit(value, 0);
  if (new TextEncoder().encode(JSON.stringify(value)).length > maxBytes)
    throw new Error("Data size limit exceeded");
  return structuredClone(value);
}
export function freeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value)) freeze(child);
  }
  return value;
}
export const readOnly = (value) => freeze(jsonValue(value, 1024 * 1024));
export const localId = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9_.-]{0,63}$/.test(value);
export function qualified(owner, id) {
  if (!localId(owner) || !localId(id))
    throw new Error("Invalid extension identifier");
  return `${owner}:${id}`;
}
/** Small, explicit schema subset shared by commands, controls and state. Unknown keywords fail at registration. */
export function validateSchema(schema) {
  if (!schema || typeof schema !== "object" || Array.isArray(schema))
    throw new Error("Invalid schema");
  const keys = [
    "type",
    "properties",
    "required",
    "additionalProperties",
    "items",
    "enum",
    "minimum",
    "maximum",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
  ];
  if (
    Object.keys(schema).some((k) => !keys.includes(k)) ||
    ![
      "object",
      "array",
      "string",
      "integer",
      "number",
      "boolean",
      "null",
    ].includes(schema.type)
  )
    throw new Error("Unsupported schema");
  if (schema.enum && (!Array.isArray(schema.enum) || !schema.enum.length))
    throw new Error("Invalid schema enum");
  if (schema.type === "object") {
    if (
      schema.additionalProperties !== false ||
      !schema.properties ||
      typeof schema.properties !== "object" ||
      Array.isArray(schema.properties) ||
      !Array.isArray(schema.required || [])
    )
      throw new Error("Object schema must explicitly reject extra properties");
    for (const [key, child] of Object.entries(schema.properties)) {
      jsonValue({ [key]: null });
      validateSchema(child);
    }
    if (
      (schema.required || []).some(
        (key) => !Object.hasOwn(schema.properties, key),
      )
    )
      throw new Error("Unknown required schema property");
  }
  if (schema.type === "array") validateSchema(schema.items);
  for (const key of [
    "minimum",
    "maximum",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
  ])
    if (
      schema[key] !== undefined &&
      (!Number.isFinite(schema[key]) ||
        ((key.includes("Length") || key.includes("Items")) &&
          (!Number.isInteger(schema[key]) || schema[key] < 0)))
    )
      throw new Error("Invalid schema bound");
  for (const [min, max] of [
    ["minimum", "maximum"],
    ["minLength", "maxLength"],
    ["minItems", "maxItems"],
  ])
    if (
      schema[min] !== undefined &&
      schema[max] !== undefined &&
      schema[min] > schema[max]
    )
      throw new Error("Contradictory schema bounds");
  if (new Set(schema.required || []).size !== (schema.required || []).length)
    throw new Error("Duplicate required schema property");
  if (schema.enum)
    for (const value of schema.enum)
      validateValue({ ...schema, enum: undefined }, jsonValue(value));
  return freeze(jsonValue(schema));
}
export function validateValue(schema, value, path = "input") {
  const type =
    value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  if (
    schema.type === "integer"
      ? !Number.isSafeInteger(value)
      : type !== schema.type
  )
    throw new Error(`${path}: expected ${schema.type}`);
  if (
    schema.enum &&
    !schema.enum.some((v) => JSON.stringify(v) === JSON.stringify(value))
  )
    throw new Error(`${path}: invalid option`);
  if (
    typeof value === "number" &&
    (!Number.isFinite(value) ||
      value < (schema.minimum ?? -Infinity) ||
      value > (schema.maximum ?? Infinity))
  )
    throw new Error(`${path}: outside numeric bounds`);
  if (
    typeof value === "string" &&
    (value.length < (schema.minLength ?? 0) ||
      value.length > (schema.maxLength ?? 4096))
  )
    throw new Error(`${path}: outside text bounds`);
  if (type === "array") {
    if (
      value.length < (schema.minItems ?? 0) ||
      value.length > (schema.maxItems ?? 256)
    )
      throw new Error(`${path}: outside array bounds`);
    value.forEach((v, i) => validateValue(schema.items, v, `${path}[${i}]`));
  }
  if (type === "object") {
    for (const key of Object.keys(value))
      if (!Object.hasOwn(schema.properties, key))
        throw new Error(`${path}: unknown property ${key}`);
    for (const key of schema.required || [])
      if (!Object.hasOwn(value, key))
        throw new Error(`${path}: missing ${key}`);
    for (const [key, v] of Object.entries(value))
      validateValue(schema.properties[key], v, `${path}.${key}`);
  }
  return value;
}
export const objectSchema = (properties = {}, required = []) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
/** Drain an accidentally async callback, reject its contract, and prevent unhandled rejections. */
export function callSync(fn, args = [], onError = () => {}) {
  if (!fn) return undefined;
  const result = fn(...args);
  if (result?.then) {
    Promise.resolve(result).catch(onError);
    throw new Error("Callback must be synchronous");
  }
  return result;
}
