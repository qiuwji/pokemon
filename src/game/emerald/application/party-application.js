import { MoveLearningService } from "../../../engine/growth/move-learning.js";
import { learnPendingMove } from "../../../engine/party.js";
import { createMonster } from "../../../engine/model.js";
import { PACK } from "../../../packs/emerald/pack.js";
import { bindApplicationPorts } from "./ports.js";
export const PARTY_PORTS = Object.freeze([
  "facilityActive",
  "battle",
  "catalog",
  "inventory",
  "friendship",
  "busy",
  "db",
  "rng",
  "startBattle",
  "state",
  "storyBusy",
]);
/** party use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class PartyApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, PARTY_PORTS);
    this.learning = new MoveLearningService({
      db: this.db,
      methods: this.catalog.learningMethods,
      items: this.catalog.items,
      inventory: this.inventory,
      friendship: (context) => {
        const mon = { ...context.mon };
        this.friendship.change(mon, "learn", {
          party: context.party.map((value) =>
            value.uid === mon.uid ? mon : value,
          ),
        });
        return mon.friendship;
      },
    });
  }
  seen(id, caught = false) {
    if (!this.state.seen.includes(id)) this.state.seen.push(id);
    if (caught && !this.state.caught.includes(id)) this.state.caught.push(id);
  }
  chooseStarter(id) {
    if (
      this.battle ||
      this.busy ||
      this.state.flags.starter ||
      !PACK.starters.includes(id)
    )
      return false;
    this.state.flags.starter = id;
    this.state.party = [createMonster(id, 5, this.db, this.rng)];
    this.seen(id, true);
    return this.startBattle(createMonster("zigzagoon", 2, this.db, this.rng), {
      script: "rescue",
    });
  }
  canManageParty() {
    return (
      !this.facilityActive && !this.battle && !this.busy && !this.storyBusy
    );
  }
  learningView(method, uid, slot) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    return this.learning.prepare(this.state, method, uid, slot);
  }
  teachMove(method, uid, index, slot) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    return this.learning.use(this.state, method, uid, index, slot);
  }
  canForgetMove(id) {
    return this.learning.canForget(id);
  }
  learnMove(mon, index) {
    return (
      this.canManageParty() &&
      this.state.party.includes(mon) &&
      learnPendingMove(mon, index, this.db, {
        companions: [...this.state.party, ...this.state.box],
        protectedMoves: this.learning.protectedMoves,
      })
    );
  }
}
