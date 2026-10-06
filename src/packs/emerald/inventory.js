import { InventoryRegistry } from "../../engine/inventory-registry.js";
import { InventoryService } from "../../engine/inventory.js";
import { GEN3_INVENTORY_POCKETS } from "../../engine/rules/gen3/inventory.js";
import { ITEMS } from "./items.js";
/** Native defaults belong to this content pack; every consumer shares the same container policy. */
export function createEmeraldInventory(catalog = { items: ITEMS }) {
  return new InventoryService(
    new InventoryRegistry(catalog.inventoryPockets || GEN3_INVENTORY_POCKETS, {
      items: catalog.items,
      defaultPocket: "items",
    }),
  );
}
