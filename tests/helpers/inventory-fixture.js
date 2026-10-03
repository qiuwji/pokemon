import { createEmeraldInventory } from "../../dist/packs/emerald/inventory.js";
import { ITEMS } from "../../dist/packs/emerald/items.js";
import { inventoryQuantity } from "../../dist/engine/inventory.js";
export { inventoryQuantity };
export const fixtureInventory = (definitions = {}) =>
  createEmeraldInventory({ items: { ...ITEMS, ...definitions } });
/** Authored test stocks use the current slot schema, never a production restore adapter. */
export function createBag(quantities = {}) {
  const extra = Object.fromEntries(
    Object.keys(quantities)
      .filter((id) => !ITEMS[id])
      .map((id) => [id, {}]),
  );
  return fixtureInventory(extra).create(quantities);
}
export function setQuantity(bag, item, count) {
  const extra = Object.fromEntries(
    Object.entries(bag.pockets).flatMap(([pocket, slots]) =>
      slots.filter(Boolean).map((slot) => [slot.item, { pocket }]),
    ),
  );
  const inventory = fixtureInventory({
    ...extra,
    [item]: extra[item] || ITEMS[item] || {},
  });
  const current = inventoryQuantity(bag, item),
    delta = count - current;
  if (delta) {
    const result = inventory.apply(bag, [
      { kind: delta > 0 ? "add" : "remove", item, count: Math.abs(delta) },
    ]);
    if (!result.ok) throw new Error(result.reason);
  }
}
