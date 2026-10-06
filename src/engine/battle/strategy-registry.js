import { inventoryCounts } from "../inventory.js";
import { TACTICAL_STRATEGY } from "../rules/gen3/tactical-strategy.js";
import { analyzeCandidate } from "./analysis.js";
import { readOnly, callSync } from "../extensions/values.js";
import { randomDecision } from "./ai.js";

const validTrainerStrategy = (definition) =>
  typeof definition?.decide === "function" ||
  (definition?.version === 2 && typeof definition.score === "function");

/** A policy chooses a candidate index from detached observations; the battle owns legality and RNG. */
export class BattleStrategyRegistry {
  constructor(definitions = {}, creatureDefinitions = {}) {
    this.definitions = new Map([
      ["random", null],
      ["tactical", TACTICAL_STRATEGY],
    ]);
    for (const [id, definition] of Object.entries(definitions)) {
      if (this.definitions.has(id) || !validTrainerStrategy(definition))
        throw new Error(`Invalid battle strategy ${id}`);
      this.definitions.set(id, definition);
    }
    this.creatures = new Map();
    for (const [id, definition] of Object.entries(creatureDefinitions)) {
      if (
        this.creatures.has(id) ||
        definition?.version !== 1 ||
        typeof definition.score !== "function"
      )
        throw new Error(`Invalid creature strategy ${id}`);
      this.creatures.set(id, definition);
    }
  }
  has(id) {
    return this.definitions.has(id);
  }
  hasCreature(id) {
    return this.creatures.has(id);
  }
  definition(id) {
    return this.definitions.get(id);
  }
  trainerV2(id) {
    const definition = this.definitions.get(id);
    return definition?.version === 2 ? definition : null;
  }
  creature(id) {
    return this.creatures.get(id) || null;
  }
  isV2(id) {
    return this.definitions.get(id)?.version === 2;
  }
  /** Router: controllers bound to the new `ai` contract go through the host decision service. */
  decide(battle, seat) {
    if (battle.roster.owner(seat).ai && battle.aiRuntime)
      return battle.aiRuntime.decideSeat(seat);
    return this.decideLegacy(battle, seat);
  }
  /** The unchanged legacy path: original view, index return and RNG semantics. */
  decideLegacy(battle, seat) {
    const strategy = battle.roster.owner(seat).strategy || "random";
    if (!this.has(strategy))
      throw new Error(`Unknown battle strategy ${strategy}`);
    const definition = this.definitions.get(strategy);
    if (!definition) return randomDecision(battle, seat);
    if (typeof definition.decide !== "function")
      throw new Error(`Battle strategy ${strategy} requires the decision service`);
    const mon = battle.roster.occupant(seat),
      candidates = [];
    const slots = battle
      .movesFor(seat)
      .map((_, index) => index)
      .filter((index) => battle.moveAvailable(seat, index));
    for (const index of slots.length ? slots : [-1]) {
      const variants = [
        {
          augment: null,
          moveId: index < 0 ? null : battle.movesFor(seat)[index].id,
        },
        ...battle.augments
          .options(seat, index)
          .map((o) => ({ augment: o.id, moveId: o.moveId })),
      ];
      for (const variant of variants) {
        const move = variant.moveId
          ? battle.db.moves[variant.moveId]
          : { effect: "recoil", target: "selected" };
        const targets = ["selected", "user-or-selected"].includes(
          battle.targeting.mode(move),
        )
          ? battle.targeting
              .candidates(seat, move)
              .map((s) => ({ kind: "seat", id: s.id }))
          : [undefined];
        for (const target of targets)
          candidates.push({
            kind: "move",
            seat,
            actor: mon.uid,
            index,
            ...(variant.augment ? { augment: variant.augment } : {}),
            ...(target ? { target } : {}),
          });
      }
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
