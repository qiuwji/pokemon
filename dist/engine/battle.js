import { stageMultiplier } from "./model.js";
import { BATTLE_RULES } from "./battle-rules.js";
import { MoveEffectRegistry } from "./move-effects.js";
import { createItemService } from "./items.js";
import { BattleRoster, teamRoster } from "./battle/roster.js";
import { BattleVolatiles } from "./battle/volatiles.js";
import { BattleEvents, monsterView } from "./battle/events.js";
import { BattleActions } from "./battle/actions.js";
import { BattleOutcomes } from "./battle/outcomes.js";
import { MoveExecutor } from "./battle/moves.js";
import { RoundResolver } from "./battle/round.js";
import { BattleTargeting } from "./battle/targeting.js";
import { BattleDecisions } from "./battle/decisions.js";
import { randomDecision } from "./battle/ai.js";

/** Composition facade. Domain services use seat IDs; numeric convenience references are singles aliases. */
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
    format = "singles",
    ai = randomDecision,
  }) {
    if (!["singles", "doubles"].includes(format))
      throw new Error("Unknown battle format");
    Object.assign(this, { db, rng, trainer, script, items, ai });
    this.rules = { ...BATTLE_RULES, ...rules };
    this.moveEffects =
      effects instanceof MoveEffectRegistry
        ? effects
        : new MoveEffectRegistry({ definitions: effects });
    this.moveEffects.validateMoves(db.moves);
    this.roster = new BattleRoster(
      topology ||
        teamRoster(party, enemyParty, bag, format === "doubles" ? 2 : 1),
    );
    const human = [...this.roster.seats.values()].find(
      (s) => this.roster.owner(s.id).kind === "human",
    );
    if (!human)
      throw new Error("An interactive battle requires a human controller");
    this.homeSeat = human.id;
    this.homeAlliance = this.roster.alliance(human.id);
    this.awaySeat = [...this.roster.seats.keys()].find((id) =>
      this.roster.isOpposing(this.homeSeat, id),
    );
    if (!this.awaySeat) throw new Error("An opponent seat is required");
    if (!trainer && this.roster.seats.size !== 2)
      throw new Error("Wild encounters currently require two seats");
    for (const controller of this.roster.controllers.values()) {
      if (
        controller.party.some((m) =>
          m.moves.some(
            (slot) =>
              !db.moves[slot.id] || !Number.isInteger(slot.pp) || slot.pp < 0,
          ),
        )
      )
        throw new Error("Invalid battle move reference");
    }
    this.conditions = new BattleVolatiles(this.roster);
    this.recorder = new BattleEvents(this.roster, () => this.decisionView());
    this.targeting = new BattleTargeting(this);
    this.decisions = new BattleDecisions(this);
    this.actionSequence = 0;
    this.actionId = null;
    this.phase = "entry";
    this.turn = 0;
    this.fleeAttempts = 0;
    this.ended = false;
    this.result = null;
    this.winner = null;
    this.outcomes = new BattleOutcomes(this);
    this.actions = new BattleActions(this);
    this.moves = new MoveExecutor(this);
    this.rounds = new RoundResolver(this);
  }
  seatId(reference) {
    const id =
      typeof reference === "number"
        ? [this.homeSeat, this.awaySeat][reference]
        : reference;
    if (!id) throw new Error("Invalid battle seat reference");
    this.roster.seat(id);
    return id;
  }
  monster(reference) {
    return this.roster.occupant(this.seatId(reference));
  }
  get seatIds() {
    return [this.homeSeat, this.awaySeat];
  }
  get commandSeat() {
    return this.decisions.next() || this.homeSeat;
  }
  get party() {
    return this.roster.owner(this.commandSeat).party;
  }
  get enemyParty() {
    return this.roster.owner(this.awaySeat).party;
  }
  get bag() {
    return this.roster.owner(this.commandSeat).bag;
  }
  get active() {
    return this.roster.seat(this.commandSeat).index;
  }
  get player() {
    return this.roster.occupant(this.commandSeat);
  }
  get enemy() {
    return this.roster.occupant(
      this.roster.opposing(this.homeSeat)[0]?.id || this.awaySeat,
    );
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
  decisionView() {
    return {
      homeAlliance: this.homeAlliance,
      decision: {
        required: this.decisions?.required().map((s) => s.id) || [],
        queued: [...(this.decisions?.pending.keys() || [])],
      },
    };
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
      phase: this.phase,
      ...extra,
    });
  }
  speed(mon, seat) {
    return Math.floor(
      mon.stats.spe *
        stageMultiplier(
          this.conditions.get(this.seatId(seat)).stages.spe || 0,
        ) *
        (mon.status === "paralysis" ? this.rules.paralysisSpeedMultiplier : 1),
    );
  }
  changeStage(seat, key, amount) {
    return this.conditions.changeStage(this.seatId(seat), key, amount);
  }
  enemyMove() {
    return this.ai(this, this.awaySeat).index;
  }
  /** Collect or execute one legal human command. All human seats choose before AI or RNG advances. */
  act(action) {
    this.recorder.begin();
    this.actionId = null;
    if (this.ended) return this.events;
    const prepared = this.actions.prepare(action);
    if (prepared.error) {
      this.emit(prepared.error, "invalid");
      return this.events;
    }
    if (prepared.kind === "cancel") {
      this.decisions.pending.clear();
      this.emit("本回合的行动选择已清除。", "choice");
      return this.events;
    }
    prepared.actionId = `action:${++this.actionSequence}`;
    this.actionId = prepared.actionId;
    if (prepared.forced && this.rules.forcedReplacementFree) {
      this.phase = "replacement";
      this.actions.switch(prepared.seat, prepared.index);
      this.outcomes.vacancies();
    } else {
      this.decisions.add(prepared);
      if (this.decisions.required().length)
        this.emit("行动已选择，请为下一位伙伴选择行动。", "choice", {
          actorSeat: prepared.seat,
        });
      else this.rounds.resolve(this.decisions.take());
    }
    return this.events;
  }
  executeMove(seat, index, target) {
    this.moves.execute({ seat: this.seatId(seat), index, target });
  }
  checkFaint() {
    this.outcomes.observe();
  }
  finish(result, winner = null) {
    if (!this.ended) {
      this.ended = true;
      this.result = result;
      this.winner = winner;
    }
  }
}
