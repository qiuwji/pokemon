/** Equipping is an atomic inventory transaction by creature UID, independent of any UI. */
export class EquipmentService {
  constructor(definitions, inventory) {
    this.definitions = definitions;
    this.inventory = inventory;
  }
  equip(state, uid, itemId) {
    const mon = [...state.party, ...(state.box || [])].find(
      (m) => m.uid === uid,
    );
    if (
      !mon ||
      mon.egg ||
      (itemId !== null &&
        (!Object.hasOwn(this.definitions, itemId) ||
          this.inventory.quantity(state.bag, itemId) < 1))
    )
      return { ok: false, reason: "现在无法持有这个道具。" };
    if (mon.heldItem === itemId)
      return { ok: false, reason: "已经持有这个道具。" };
    const previous = mon.heldItem || null;
    if (previous && !Object.hasOwn(this.definitions, previous))
      return { ok: false, reason: "持有道具定义缺失。" };
    const result = this.inventory.apply(state.bag, [
      ...(itemId !== null ? [{ kind: "remove", item: itemId, count: 1 }] : []),
      ...(previous ? [{ kind: "add", item: previous, count: 1 }] : []),
    ]);
    if (!result.ok) return result;
    mon.heldItem = itemId;
    return { ok: true, uid, itemId, previous };
  }
}
