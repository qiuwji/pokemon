import { objectSchema, readOnly, validateValue } from "../values.js";
export const text = { type: "string", minLength: 1, maxLength: 128 };
export const integer = (minimum, maximum) => ({ type: "integer", minimum, maximum });
export const array = (items, minItems, maxItems) => ({ type: "array", items, minItems, maxItems });
export const transfer = objectSchema({ money: integer(0, 100000000), items: array(objectSchema({ id: text, count: integer(1, 999) }, ["id", "count"]), 0, 32) }, ["money"]);
export const reward = (value) => ({ money: value.money,
  ...(value.items?.length ? { items: Object.fromEntries(value.items.map(i => [i.id, i.count])) } : {}) });
export function parameters(schema, value) {
  validateValue(schema, value);
  return readOnly(value);
}
export function validateRewards(values, refs) {
  for (const value of values) {
    const ids = (value.items || []).map(item => item.id);
    if (new Set(ids).size !== ids.length || ids.some(id => !Object.hasOwn(refs.items, id)))
      throw new Error("Unknown or duplicate template reward item");
  }
}
