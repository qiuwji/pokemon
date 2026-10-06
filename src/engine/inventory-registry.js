import { readOnly } from "./extensions/values.js";

const positive = (value) => Number.isSafeInteger(value) && value > 0;
/** Container policies and item routing are content. No native pocket names or capacities live here. */
export class InventoryRegistry {
  constructor(definitions, { items, defaultPocket } = {}) {
    if (
      !definitions ||
      typeof definitions !== "object" ||
      Array.isArray(definitions) ||
      !items ||
      typeof items !== "object" ||
      Array.isArray(items)
    )
      throw new Error("Expected inventory pocket and item catalogs");
    this.definitions = readOnly(definitions);
    for (const [id, pocket] of Object.entries(this.definitions)) {
      if (
        !id ||
        !pocket ||
        Array.isArray(pocket) ||
        Object.keys(pocket).some(
          (key) =>
            !["label", "capacity", "stackLimit", "allowDuplicates"].includes(
              key,
            ),
        ) ||
        typeof pocket.label !== "string" ||
        !pocket.label ||
        !positive(pocket.capacity) ||
        !positive(pocket.stackLimit) ||
        !Number.isSafeInteger(pocket.capacity * pocket.stackLimit) ||
        typeof pocket.allowDuplicates !== "boolean"
      )
        throw new Error(`Invalid inventory pocket ${id}`);
    }
    this.get(defaultPocket);
    this.defaultPocket = defaultPocket;
    this.itemPockets = readOnly(
      Object.fromEntries(
        Object.entries(items).map(([id, item]) => {
          if (!item || typeof item !== "object" || Array.isArray(item))
            throw new Error(`Invalid inventory item ${id}`);
          const pocket = item.pocket ?? defaultPocket;
          if (!id || typeof pocket !== "string")
            throw new Error(`Invalid inventory item ${id}`);
          this.get(pocket);
          return [id, pocket];
        }),
      ),
    );
  }
  get(id) {
    if (!Object.hasOwn(this.definitions, id))
      throw new Error(`Unknown inventory pocket ${id}`);
    return this.definitions[id];
  }
  pocketOf(item) {
    if (!Object.hasOwn(this.itemPockets, item))
      throw new Error(`Unknown inventory item ${item}`);
    return this.itemPockets[item];
  }
}
