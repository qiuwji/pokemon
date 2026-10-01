import { stageMultiplier } from "./model.js";
import { BATTLE_RULES } from "./battle-rules.js";
import { MoveEffectRegistry } from "./move-effects.js";
import { createItemService } from "./items.js";
import { BattleRoster, duelRoster } from "./battle/roster.js";
import { BattleVolatiles } from "./battle/volatiles.js";
import { BattleEvents, monsterView } from "./battle/events.js";
import { BattleActions } from "./battle/actions.js";
import { BattleOutcomes } from "./battle/outcomes.js";
import { MoveExecutor } from "./battle/moves.js";
import { RoundResolver } from "./battle/round.js";

/** Application facade; each domain service owns one responsibility. Current playable format: singles. */
export class Battle {
  constructor({
    party,
    enemy,
    enemyParty = enemy ? [enemy] : [],
    db,
    rng,
    bag,
    trainer = false,
    script = null,
    effects = {},
    rules = {},
    items = createItemService(),
    topology,
  }) {
    Object.assign(this, { db, rng, trainer, script, items });
    this.rules = { ...BATTLE_RULES, ...rules };
    this.moveEffects =
      effects instanceof MoveEffectRegistry
        ? effects
        : new MoveEffectRegistry({ definitions: effects });
    this.moveEffects.validateMoves(db.moves);
    this.roster = new BattleRoster(
      topology || duelRoster(party, enemyParty, bag),
    );
    const seats = [...this.roster.seats.values()];
    if (
      seats.length !== 2 ||
      this.roster.sides.size !== 2 ||
      seats.some((s) => !this.roster.occupant(s.id))
    )
      throw new Error("Playable singles require one occupied seat per side");
    this.seatIds = seats.map((s) => s.id);
    if (
      this.roster.owner(this.seatId(0)).kind !== "human" ||
      this.roster.owner(this.seatId(1)).kind !== "ai"
    )
      throw new Error("Singles requires human and AI controllers");
    if (!trainer && this.enemyParty.length !== 1)
      throw new Error("Wild singles must have one opponent");
    this.conditions = new BattleVolatiles(this.roster);
    this.recorder = new BattleEvents(this.roster);
    this.actionSequence = 0;
    this.actionId = null;
    this.turn = 0;
    this.fleeAttempts = 0;
    this.ended = false;
    this.result = null;
    this.outcomes = new BattleOutcomes(this);
    this.actions = new BattleActions(this);
    this.moves = new MoveExecutor(this);
    this.rounds = new RoundResolver(this);
  }
  seatId(side) {
    if (![0, 1].includes(side)) throw new Error("Invalid singles side");
    return this.seatIds[side];
  }
  monster(side) {
    return this.roster.occupant(this.seatId(side));
  }
  get party() {
    return this.roster.owner(this.seatId(0)).party;
  }
  get enemyParty() {
    return this.roster.owner(this.seatId(1)).party;
  }
  get bag() {
    return this.roster.owner(this.seatId(0)).bag;
  }
  get active() {
    return this.roster.seat(this.seatId(0)).index;
  }
  get player() {
    return this.monster(0);
  }
  get enemy() {
    return this.monster(1);
  }
  get events() {
    return this.recorder.events;
  }
  get stages() {
    return this.seatIds.map((id) => this.conditions.get(id).stages);
  }
  get bide() {
    return this.seatIds.map((id) => this.conditions.get(id).bide);
  }
  view(mon) {
    return monsterView(mon);
  }
  snapshot() {
    return this.recorder.snapshot();
  }
  name(mon) {
    return this.db.species[mon.species].name;
  }
  emit(text, kind = "text", metadata = {}) {
    const { side, ...extra } = metadata;
    if (side !== undefined) {
      if (["hurt", "heal", "faint", "switch"].includes(kind))
        extra.targetSeat = this.seatId(side);
      if (kind === "move") extra.actorSeat = this.seatId(side);
    }
    return this.recorder.emit(text, kind, this.turn, {
      actionId: this.actionId,
      ...extra,
    });
  }
  speed(mon, side) {
    return Math.floor(
      mon.stats.spe *
        stageMultiplier(
          this.conditions.get(this.seatId(side)).stages.spe || 0,
        ) *
        (mon.status === "paralysis" ? this.rules.paralysisSpeedMultiplier : 1),
    );
  }
  changeStage(side, key, amount) {
    return this.conditions.changeStage(this.seatId(side), key, amount);
  }
  enemyMove() {
    const choices = this.enemy.moves
      .map((m, index) => ({ ...m, index }))
      .filter(
        (m) =>
          m.pp > 0 && this.moveEffects.supports(this.db.moves[m.id].effect),
      );
    return choices.length ? choices[this.rng.int(choices.length)].index : -1;
  }
  /** @param {import("./contracts.js").BattleAction} action */
  act(action) {
    this.recorder.begin();
    this.actionId = null;
    if (this.ended) return this.events;
    const prepared = this.actions.prepare(action);
    if (prepared.error) this.emit(prepared.error, "invalid");
    else {
      this.actionId = `action:${++this.actionSequence}`;
      this.rounds.resolve(prepared);
    }
    return this.events;
  }
  executeMove(side, index) {
    this.moves.execute(side, index);
  }
  checkFaint() {
    this.outcomes.observe();
  }
  finish(result) {
    if (!this.ended) {
      this.ended = true;
      this.result = result;
    }
  }
}
