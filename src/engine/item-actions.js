import { readOnly, validateValue } from "./extensions/values.js";

/** Item bindings are data. Rules, one-shot plans, animation and commits remain owned by field actions. */
export function validateItemActions(items, registry) {
  const bindings = new Map();
  for (const [itemId, item] of Object.entries(items)) {
    if (item.actions === undefined) continue;
    if (
      item.target !== "field" ||
      item.contexts.length !== 1 ||
      item.contexts[0] !== "field" ||
      item.effects.length ||
      !Array.isArray(item.actions) ||
      !item.actions.length ||
      item.actions.length > 32
    )
      throw new Error(
        `items.${itemId}: actions require a nonconsuming field item`,
      );
    const entries = new Map();
    for (const binding of item.actions) {
      if (
        !binding ||
        typeof binding !== "object" ||
        Object.keys(binding).some(
          (k) => !["id", "fieldAction", "input"].includes(k),
        ) ||
        !/^[a-z][a-z0-9_.:-]{0,127}$/.test(binding.id) ||
        entries.has(binding.id) ||
        typeof binding.fieldAction !== "string" ||
        !registry.definitions.has(binding.fieldAction)
      )
        throw new Error(
          `items.${itemId}: invalid or unknown field action binding`,
        );
      const entry = readOnly({ ...binding, input: binding.input ?? {} });
      validateValue(
        registry.definitions.get(entry.fieldAction).schema,
        entry.input,
      );
      entries.set(entry.id, entry);
    }
    bindings.set(itemId, entries);
  }
  return bindings;
}

/** Selects a declared action only while its item is owned. Never consumes a key item or bypasses domain rules. */
export class ItemActionService {
  constructor({ items, registry, quantity, inspect, perform }) {
    this.bindings = validateItemActions(items, registry);
    Object.assign(this, {
      registry,
      quantity,
      inspectAction: inspect,
      performAction: perform,
    });
  }
  inspect(item, action) {
    const binding = this.bindings.get(item)?.get(action);
    if (!binding) return { ok: false, reason: "道具没有这个行动。" };
    if (!(this.quantity(item) > 0))
      return { ok: false, reason: "背包里没有这个道具。" };
    const { ok, reason } = this.inspectAction(
      binding.fieldAction,
      binding.input,
    );
    return { ok, ...(reason ? { reason } : {}) };
  }
  list(item) {
    return [...(this.bindings.get(item)?.values() || [])].map((binding) => ({
      id: binding.id,
      name: this.registry.definitions.get(binding.fieldAction).name,
      ...this.inspect(item, binding.id),
    }));
  }
  async perform(item, action) {
    const result = this.inspect(item, action);
    if (!result.ok) return result;
    const binding = this.bindings.get(item).get(action);
    return this.performAction(binding.fieldAction, binding.input);
  }
}
