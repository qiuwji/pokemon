import { readOnly } from "./extensions/values.js";

/** Persistent selection is content identity, never a cached eligibility result or an executable callback. */
export function validItemShortcut(selection, items) {
  if (selection === null) return true;
  if (
    !selection ||
    typeof selection !== "object" ||
    Array.isArray(selection) ||
    Object.keys(selection).length !== 2 ||
    Object.keys(selection).some((key) => !["item", "action"].includes(key)) ||
    typeof selection.item !== "string" ||
    typeof selection.action !== "string"
  )
    return false;
  const item = Object.hasOwn(items, selection.item)
    ? items[selection.item]
    : null;
  return (
    item?.registerable === true &&
    item.target === "field" &&
    Array.isArray(item.actions) &&
    item.actions.some((binding) => binding.id === selection.action)
  );
}

/** Registration checks possession; activation delegates current qualifications and scene ownership to item actions. */
export class ItemShortcutService {
  constructor({
    items,
    selection,
    quantity,
    setSelection,
    inspect,
    perform,
    emit = () => {},
  }) {
    Object.assign(this, {
      items,
      selection,
      quantity,
      setSelection,
      inspect,
      perform,
      emit,
    });
  }
  view() {
    const selection = this.selection();
    if (!validItemShortcut(selection, this.items))
      throw new Error("Invalid registered item");
    if (selection === null)
      return {
        selection: null,
        owned: false,
        usable: false,
        reason: "请先在背包中登记一件关键道具。",
      };
    const owned = this.quantity(selection.item) > 0,
      result = owned
        ? this.inspect(selection.item, selection.action)
        : { ok: false, reason: "背包里已经没有登记的道具。" };
    return readOnly({
      selection,
      name: this.items[selection.item].name,
      owned,
      usable: result.ok,
      ...(result.reason ? { reason: result.reason } : {}),
    });
  }
  change(selection, cause) {
    const current = this.selection();
    if (!validItemShortcut(current, this.items))
      throw new Error("Invalid registered item");
    if (
      current === null
        ? selection === null
        : selection !== null &&
          current.item === selection.item &&
          current.action === selection.action
    )
      return false;
    this.setSelection(selection === null ? null : { ...selection });
    this.emit("core:item-registration", readOnly({ selection, cause }));
    return true;
  }
  register(item, action) {
    const selection = { item, action };
    if (!validItemShortcut(selection, this.items) || !(this.quantity(item) > 0))
      return { ok: false, reason: "只能登记实际持有且开放快捷操作的道具。" };
    this.change(selection, "register");
    return { ok: true, selection: readOnly(selection) };
  }
  unregister() {
    this.change(null, "unregister");
    return { ok: true, selection: null };
  }
  async use() {
    const view = this.view();
    if (view.selection === null) return { ok: false, reason: view.reason };
    if (!view.owned) {
      this.change(null, "missing-item");
      return { ok: false, reason: view.reason };
    }
    if (!view.usable) return { ok: false, reason: view.reason };
    return this.perform(view.selection.item, view.selection.action);
  }
}
