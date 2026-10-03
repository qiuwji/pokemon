import { ItemActionService } from "../../../engine/item-actions.js";
import { FieldActionRegistry } from "../../../engine/field-actions.js";
import { EMERALD_FIELD_ACTIONS } from "../field-actions.js";
import { setLead } from "../../../engine/party.js";
import { createItemService } from "../../../engine/items.js";
import { matchesCondition } from "../../../engine/conditions.js";
import { PartyStorageService } from "../../../engine/party-storage.js";
import { EquipmentService } from "../../../engine/equipment.js";
import { bindApplicationPorts } from "./ports.js";
export const INVENTORY_PORTS = Object.freeze([
  "battle",
  "canManageParty",
  "catalog",
  "conditionQueries",
  "itemDefinitions",
  "inspectFieldAction",
  "performFieldAction",
  "learningView",
  "state",
]);
/** inventory use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class InventoryApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, INVENTORY_PORTS);
    this.items = createItemService(this.catalog.items);
    this.itemActions = new ItemActionService({
      items: this.catalog.items,
      registry: new FieldActionRegistry(
        this.catalog.fieldActions || EMERALD_FIELD_ACTIONS,
      ),
      quantity: (id) => this.state.bag[id] || 0,
      inspect: (...args) => this.inspectFieldAction(...args),
      perform: (...args) => this.performFieldAction(...args),
    });
    this.partyStorage = new PartyStorageService();
    this.equipment = new EquipmentService(this.catalog.heldItems);
  }
  setLead(index) {
    return this.canManageParty() && setLead(this.state, index);
  }
  itemActionOptions(id) {
    return this.itemActions.list(id);
  }
  async performItemAction(id, action) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    return this.itemActions.perform(id, action);
  }
  itemPlan(id, index, inBattle = !!this.battle) {
    const method = this.itemDefinitions[id]?.learningMethod;
    if (method && !inBattle)
      return this.learningView(method, this.state.party[index]?.uid);
    return this.items.prepare({
      id,
      bag: inBattle ? this.battle.bag : this.state.bag,
      party: inBattle ? this.battle.party : this.state.party,
      index,
      context: inBattle ? "battle" : "field",
      enemy: this.battle?.enemy,
      canCapture: this.battle
        ? this.battle.rules.canCapture(this.battle)
        : false,
    });
  }
  useItem(id, index) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    return this.items.use({
      id,
      bag: this.state.bag,
      party: this.state.party,
      index,
      context: "field",
    });
  }
  equipItem(uid, itemId) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    return this.equipment.equip(this.state, uid, itemId);
  }
  canBuyItem(id) {
    const item = this.itemDefinitions[id];
    return (
      !!item &&
      item.shopStock !== false &&
      item.price > 0 &&
      this.state.money >= item.price &&
      matchesCondition(item.purchaseRequires, this.state, this.conditionQueries)
    );
  }
  buyItem(id) {
    const item = this.itemDefinitions[id];
    if (!this.canManageParty() || !this.canBuyItem(id)) return false;
    this.state.money -= item.price;
    this.state.bag[id] = (this.state.bag[id] || 0) + 1;
    return true;
  }
  withdrawBox(index) {
    return (
      this.canManageParty() && this.partyStorage.withdraw(this.state, index)
    );
  }
  exchangeBox(boxIndex, partyIndex) {
    return (
      this.canManageParty() &&
      this.partyStorage.exchange(this.state, boxIndex, partyIndex)
    );
  }
  depositBox(index) {
    return (
      this.canManageParty() && this.partyStorage.deposit(this.state, index)
    );
  }
}
