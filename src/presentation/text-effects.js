import {
  objectSchema,
  validateSchema,
  validateValue,
  readOnly,
  callSync,
} from "../engine/extensions/values.js";
/** Text effects compute bounded visual offsets only. The host applies and cleans them up. */
export class TextEffectRegistry {
  constructor() {
    this.definitions = new Map();
    this.sealed = false;
  }
  effect(id, d) {
    if (
      this.sealed ||
      this.definitions.has(id) ||
      typeof id !== "string" ||
      !id ||
      !d ||
      Object.keys(d).some(
        (k) => !["schema", "initialData", "sample"].includes(k),
      ) ||
      typeof d.sample !== "function"
    )
      throw new Error(`Invalid text effect ${id}`);
    const schema = validateSchema(d.schema || objectSchema()),
      initialData = readOnly(d.initialData || {}, 8192);
    if (schema.type !== "object")
      throw new Error("Text effect parameters must be an object");
    validateValue(schema, initialData);
    this.definitions.set(
      id,
      Object.freeze({ schema, initialData, sample: d.sample }),
    );
    return this;
  }
  parameters(id, data) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown text effect ${id}`);
    const value = readOnly(data === undefined ? d.initialData : data, 8192);
    validateValue(d.schema, value);
    return value;
  }
  sample(id, parameters, { elapsedMs, index, reducedMotion = false }) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown text effect ${id}`);
    if (reducedMotion) return { x: 0, y: 0, opacity: 1 };
    const result = readOnly(
      callSync(d.sample, [
        parameters,
        readOnly({ elapsedMs, index, reducedMotion }),
      ]),
    );
    if (
      !result ||
      Array.isArray(result) ||
      Object.keys(result).some((k) => !["x", "y", "opacity"].includes(k)) ||
      ["x", "y"].some(
        (k) =>
          result[k] !== undefined &&
          (!Number.isFinite(result[k]) || Math.abs(result[k]) > 8),
      ) ||
      (result.opacity !== undefined &&
        (!Number.isFinite(result.opacity) ||
          result.opacity < 0 ||
          result.opacity > 1))
    )
      throw new Error(`Invalid text effect sample ${id}`);
    return { x: result.x || 0, y: result.y || 0, opacity: result.opacity ?? 1 };
  }
  seal() {
    this.sealed = true;
    return this;
  }
}
export function createTextEffects(host = null) {
  const registry = new TextEffectRegistry();
  registry.effect("dialogue.shake", {
    sample: (_, c) => ({
      x: Math.sin(c.elapsedMs / 60 + c.index * 1.7),
      y: Math.sin(c.elapsedMs / 75 + c.index) * 0.5,
    }),
  });
  registry.effect("dialogue.blink", {
    sample: (_, c) => ({ opacity: 0.55 + Math.sin(c.elapsedMs / 250) * 0.45 }),
  });
  for (const [id, d] of host?.textEffects || []) {
    const { id: registered, owner, ...definition } = d;
    registry.effect(id, definition);
  }
  return registry.seal();
}
