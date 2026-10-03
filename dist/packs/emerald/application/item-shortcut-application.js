import { ItemShortcutService } from "../../../engine/item-shortcut.js";
import { bindApplicationPorts } from "./ports.js";
export const ITEM_SHORTCUT_PORTS = Object.freeze([
  "canManageParty",
  "itemDefinitions",
  "itemActionOptions",
  "performItemAction",
  "plugins",
  "save",
  "state",
  "ui",
]);
/** Shortcut lifecycle only. Inventory rules and field choreography remain owned by their existing services. */
export class ItemShortcutApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, ITEM_SHORTCUT_PORTS);
    this.service = new ItemShortcutService({
      items: this.itemDefinitions,
      selection: () => this.state.registeredItem,
      quantity: (item) => this.state.bag[item] || 0,
      setSelection: (selection) => {
        this.state.registeredItem = selection;
      },
      inspect: (item, action) =>
        this.itemActionOptions(item).find((entry) => entry.id === action),
      perform: (item, action) => this.performItemAction(item, action),
      emit: (type, payload) => this.plugins?.events.emit(type, payload),
    });
  }
  view() {
    return this.service.view();
  }
  register(item, action) {
    if (!this.canManageParty() || this.ui?.dialog)
      return { ok: false, reason: "请先结束当前行动。" };
    const result = this.service.register(item, action);
    if (result.ok) {
      this.ui?.updateSide();
      this.save();
    }
    return result;
  }
  unregister() {
    if (!this.canManageParty() || this.ui?.dialog)
      return { ok: false, reason: "请先结束当前行动。" };
    const result = this.service.unregister();
    this.ui?.updateSide();
    this.save();
    return result;
  }
  async use() {
    if (!this.canManageParty() || this.ui?.blocked || this.ui?.dialog)
      return { ok: false, reason: "请先结束当前行动或关闭菜单。" };
    const previous = this.state.registeredItem;
    try {
      return await this.service.use();
    } finally {
      // Real item actions already own their save boundary. Only missing-item cleanup needs another save.
      if (previous !== this.state.registeredItem) {
        this.ui?.updateSide();
        this.save();
      }
    }
  }
}
