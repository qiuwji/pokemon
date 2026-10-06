import {
  readOnly,
  validateSchema,
  validateValue,
  objectSchema,
} from "./extensions/values.js";
/** Visual layer definitions don't set logical weather or discover map cells. */
export class EnvironmentLayers {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [id, d] of Object.entries(definitions)) {
      if (
        !d ||
        Object.keys(d).some(
          (k) =>
            ![
              "name",
              "visual",
              "schema",
              "initialData",
              "opacity",
              "order",
            ].includes(k),
        ) ||
        typeof d.name !== "string" ||
        !d.name ||
        typeof d.visual !== "string" ||
        !d.visual ||
        !Number.isSafeInteger(d.order ?? 0) ||
        Math.abs(d.order ?? 0) > 10000 ||
        !Number.isFinite(d.opacity ?? 1) ||
        (d.opacity ?? 1) < 0 ||
        (d.opacity ?? 1) > 1
      )
        throw new Error(`Invalid environment layer ${id}`);
      const schema = validateSchema(d.schema || objectSchema()),
        initialData = readOnly(d.initialData || {}, 8192);
      if (schema.type !== "object")
        throw new Error("Environment parameters must be an object");
      validateValue(schema, initialData);
      this.definitions.set(
        id,
        readOnly({
          ...d,
          schema,
          initialData,
          opacity: d.opacity ?? 1,
          order: d.order ?? 0,
        }),
      );
    }
  }
  selection(id, data) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown environment layer ${id}`);
    const parameters = readOnly(
      data === undefined ? d.initialData : data,
      8192,
    );
    validateValue(d.schema, parameters);
    return readOnly({
      id,
      visual: d.visual,
      data: parameters,
      opacity: d.opacity,
      order: d.order,
    });
  }
}
