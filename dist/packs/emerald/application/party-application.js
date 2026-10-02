import { learnPendingMove } from "../../../engine/party.js";
import { createMonster } from "../../../engine/model.js";
import { PACK } from "../pack.js";
import { bindApplicationPorts } from "./ports.js";
export const PARTY_PORTS = Object.freeze([
  "battle",
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
    return !this.battle && !this.busy && !this.storyBusy;
  }
  learnMove(mon, index) {
    return (
      this.canManageParty() &&
      this.state.party.includes(mon) &&
      learnPendingMove(mon, index, this.db, {
        companions: [...this.state.party, ...this.state.box],
      })
    );
  }
}
