/** Equipping is an atomic inventory transaction by creature UID, independent of any UI. */
export class EquipmentService {
  constructor(definitions) {
    this.definitions = definitions;
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
          !Number.isInteger(state.bag[itemId]) ||
          state.bag[itemId] < 1))
    )
      return { ok: false, reason: "现在无法持有这个道具。" };
    if (mon.heldItem === itemId)
      return { ok: false, reason: "已经持有这个道具。" };
    const previous = mon.heldItem || null;
    if (previous && !Object.hasOwn(this.definitions, previous))
      return { ok: false, reason: "持有道具定义缺失。" };
    if (itemId !== null) state.bag[itemId]--;
    if (previous) state.bag[previous] = (state.bag[previous] || 0) + 1;
    mon.heldItem = itemId;
    return { ok: true, uid, itemId, previous };
  }
}
