/** Battle-local item removal/consumption is distinct from permanent ownership transfer. */
export class BattleHeldItems {
  constructor(battle) {
    this.battle = battle;
    this.knocked = new Map();
    this.used = new Map();
  }
  consume(mon, id) {
    if (mon.heldItem !== id) return false;
    mon.heldItem = null;
    this.used.set(mon.uid, id);
    return true;
  }
  knockOff(mon) {
    if (!mon.heldItem) return false;
    this.knocked.set(mon.uid, mon.heldItem);
    mon.heldItem = null;
    return true;
  }
  transferable(mon) {
    return (
      !this.knocked.has(mon.uid) &&
      mon.heldItem !== "enigma_berry" &&
      !mon.heldItem?.endsWith("_mail")
    );
  }
  recycle(mon) {
    const item = this.used.get(mon.uid);
    if (!item || mon.heldItem || this.knocked.has(mon.uid)) return false;
    mon.heldItem = item;
    this.used.delete(mon.uid);
    return true;
  }
  restore() {
    for (const controller of this.battle.roster.controllers.values())
      for (const mon of controller.party) {
        if (this.knocked.has(mon.uid)) mon.heldItem = this.knocked.get(mon.uid);
      }
    this.knocked.clear();
    this.used.clear();
  }
}
