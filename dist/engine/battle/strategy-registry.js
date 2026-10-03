import { inventoryCounts } from "../inventory.js";
import { TACTICAL_STRATEGY } from "../rules/gen3/tactical-strategy.js";
import { analyzeCandidate } from "./analysis.js";
import { readOnly, callSync } from "../extensions/values.js";
import { randomDecision } from "./ai.js";

/** A policy chooses a candidate index from detached observations; the battle owns legality and RNG. */
export class BattleStrategyRegistry {
  constructor(definitions = {}) {
    this.definitions = new Map([
      ["random", null],
      ["tactical", TACTICAL_STRATEGY],
    ]);
    for (const [id, definition] of Object.entries(definitions)) {
      if (this.definitions.has(id) || typeof definition?.decide !== "function")
        throw new Error(`Invalid battle strategy ${id}`);
      this.definitions.set(id, definition);
    }
  }
  has(id) {
    return this.definitions.has(id);
  }
  decide(battle, seat) {
    const strategy = battle.roster.owner(seat).strategy || "random";
    if (!this.has(strategy))
      throw new Error(`Unknown battle strategy ${strategy}`);
    const definition = this.definitions.get(strategy);
    if (!definition) return randomDecision(battle, seat);
    const mon = battle.roster.occupant(seat),
      candidates = [];
    const slots = battle
      .movesFor(seat)
      .map((_, index) => index)
      .filter((index) => battle.moveAvailable(seat, index));
    for (const index of slots.length ? slots : [-1]) {
      const move =
        index < 0
          ? { effect: "recoil", target: "selected" }
          : battle.db.moves[battle.movesFor(seat)[index].id];
      const mode = battle.targeting.mode(move);
      const targets = ["selected", "user-or-selected"].includes(mode)
        ? battle.targeting
            .candidates(seat, move)
            .map((target) => ({ kind: "seat", id: target.id }))
        : [undefined];
      for (const target of targets)
        candidates.push({
          kind: "move",
          seat,
          actor: mon.uid,
          index,
          ...(target ? { target } : {}),
        });
    }
    for (const { index } of battle.roster.bench(seat)) {
      const action = { kind: "switch", seat, actor: mon.uid, index };
      if (!battle.actions.prepare(action, seat).error) candidates.push(action);
    }
    for (const [item, count] of Object.entries(
      inventoryCounts(battle.roster.owner(seat).bag),
    )) {
      if (count <= 0) continue;
      for (
        let index = 0;
        index < battle.roster.owner(seat).party.length;
        index++
      ) {
        const action = { kind: "item", seat, actor: mon.uid, item, index };
        if (!battle.actions.prepare(action, seat).error)
          candidates.push(action);
      }
    }
    if (!candidates.length)
      throw new Error(`No strategy candidates for ${seat}`);
    const view = readOnly({
      seat,
      turn: battle.turn,
      snapshot: battle.snapshot(),
      candidates,
      analyses: candidates.map((action) => analyzeCandidate(battle, action)),
      roll: battle.rng.next(),
    });
    const choice = callSync(definition.decide, [view]);
    if (!Number.isInteger(choice) || choice < 0 || choice >= candidates.length)
      throw new Error(`Invalid strategy choice ${strategy}`);
    return candidates[choice];
  }
}
