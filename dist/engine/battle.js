import { stageMessage } from "./battle/messages.js";
import { BattleAugmentRegistry, BattleAugments } from "./battle/augments.js";
import { BattleWeatherRegistry } from "./battle/weather.js";
import { GEN3_BATTLE_WEATHER } from "./rules/gen3/weather.js";
import { BattleHeldItems } from "./battle/held-items.js";
import { BattleSpoils } from "./battle/spoils.js";
import { BattleReplacementRequests } from "./battle/replacement-requests.js";
import { BattleMajorStatus } from "./battle/major-status.js";
import { CreatureFormRegistry, CreatureForms } from "./creatures/forms.js";
import { BattleActionLifecycle } from "./battle/action-lifecycle.js";
import { stageMultiplier } from "./model.js";
import { BATTLE_RULES } from "./battle-rules.js";
import { MoveEffectRegistry } from "./move-effects.js";
import { createItemService } from "./items.js";
import { BattleRoster, teamRoster } from "./battle/roster.js";
import {
  BattleStateRegistry,
  BattleStateService,
} from "./battle/state-registry.js";
import { GEN3_BATTLE_STATES } from "./rules/gen3/battle-states.js";
import { BattleVolatiles } from "./battle/volatiles.js";
import { BattleEvents, monsterView } from "./battle/events.js";
import { BattleActions } from "./battle/actions.js";
import { BattleOutcomes } from "./battle/outcomes.js";
import { MoveExecutor } from "./battle/moves.js";
import { RoundResolver } from "./battle/round.js";
import { BattleTargeting } from "./battle/targeting.js";
import { BattleDecisions } from "./battle/decisions.js";
import { moveAvailable } from "./battle/move-selection.js";
import { BattleCheckpoint } from "./battle/checkpoint.js";
import { BattleTraits } from "./battle/traits.js";
import { GEN3_HELD_ITEMS } from "./rules/gen3/held-items.js";
import { GEN3_GLOBAL_HOOKS } from "./rules/gen3/global-rules.js";
import { GEN3_ABILITIES } from "./rules/gen3/abilities.js";
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
    trainerId = null,
    script = null,
    effects = {},
    rules = {},
    items = createItemService({}),
    topology,
    format = "singles",
    ai = randomDecision,
    environment = {},
    weatherDefinitions = GEN3_BATTLE_WEATHER,
    states = {},
    augmentDefinitions = {},
    formDefinitions = {},
    formRecords = {},
    traits = {
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
      hooks: GEN3_GLOBAL_HOOKS,
    },
  }) {
    if (!["singles", "doubles"].includes(format))
      throw new Error("Unknown battle format");
    Object.assign(this, { db, rng, trainer, trainerId, script, items, ai });
    this.weatherRegistry = new BattleWeatherRegistry(weatherDefinitions);
    if (environment.weather !== undefined && environment.weather !== null)
      this.weatherRegistry.get(environment.weather);
    this.weather = environment.weather
      ? { kind: environment.weather, turns: null }
      : null;
    this.environment = { terrain: environment.terrain || "grass" };
    this.turnOrder = [];
    this.rules = { ...BATTLE_RULES, ...rules };
    this.moveEffects =
      effects instanceof MoveEffectRegistry
        ? effects
        : new MoveEffectRegistry({ definitions: effects });
    this.moveEffects.validateMoves(db.moves);
    this.weatherRegistry.validateEffects(this.moveEffects, [
      ...Object.values(traits.abilities),
      ...Object.values(traits.heldItems),
      ...Object.values(states),
    ]);
    // Form reference validation follows roster/form construction.
    this.roster = new BattleRoster(
      topology ||
        teamRoster(party, enemyParty, bag, format === "doubles" ? 2 : 1),
    );
    this.forms = new CreatureForms({
      registry: new CreatureFormRegistry(
        formDefinitions,
        db,
        traits.abilities,
        traits.heldItems,
      ),
      records: structuredClone(formRecords),
      creatures: () =>
        [...this.roster.controllers.values()].flatMap((c) => c.party),
    });
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
        !this.items.inventory &&
        Object.keys(controller.bag.pockets).length > 0
      )
        throw new Error("Battle inventory requires an injected item service");
      this.items.inventory?.validate(controller.bag);
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
    this.forms.registry.validateEffects(this.moveEffects);
    this.conditions = new BattleVolatiles(this.roster);
    this.states = new BattleStateService(
      this,
      new BattleStateRegistry({ ...GEN3_BATTLE_STATES, ...states }),
    );
    this.states.registry.validateEffects(this.moveEffects);
    this.actionLifecycle = new BattleActionLifecycle(this);
    this.recorder = new BattleEvents(
      this.roster,
      () => this.decisionView(),
      (seat) =>
        this.traits
          ? {
              species: this.forms.effective(this.roster.occupant(seat)).species,
              sprites:
                this.forms.effective(this.roster.occupant(seat)).sprites ||
                null,
              types: [...this.traits.types(seat)],
              form: this.traits.form(seat),
              volatile: {
                stages: { ...this.conditions.get(seat).stages },
                protected: !!this.conditions.get(seat).protected,
                barriers: this.states
                  .view(seat)
                  .filter((s) =>
                    ["reflect", "light_screen", "mist"].includes(s.id),
                  )
                  .map((s) => s.id),
                substitute: !!this.states.lookup("substitute", seat),
                states: this.states.view(seat),
              },
            }
          : {},
    );
    this.targeting = new BattleTargeting(this);
    this.replacements = new BattleReplacementRequests(this);
    this.decisions = new BattleDecisions(this);
    this.augments = new BattleAugments(
      this,
      new BattleAugmentRegistry(augmentDefinitions, db, this.moveEffects),
    );
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
    this.equipment = new BattleHeldItems(this);
    this.spoils = new BattleSpoils(this);
    this.traits = new BattleTraits(this, traits);
    this.statuses = new BattleMajorStatus(this);
    this.entryView = this.snapshot();
    const initial = new BattleCheckpoint(this);
    try {
      const seats = this.roster.occupied().map((seat, index) => ({
        seat,
        index,
        speed: this.speed(this.roster.occupant(seat.id), seat.id),
      }));
      seats.sort((a, b) => b.speed - a.speed || a.index - b.index);
      for (const { seat } of seats) {
        this.conditions.get(seat.id).entryTurn = 0;
        this.traits.enter(seat.id);
      }
    } catch (error) {
      initial.restore();
      throw error;
    }
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
    return monsterView(this.forms.effective(mon));
  }
  snapshot() {
    return this.recorder.snapshot();
  }
  decisionView() {
    const weather = this.traits?.weather() || null;
    return {
      augmentUsage: this.augments?.view() || [],
      homeAlliance: this.homeAlliance,
      environment: {
        ...this.environment,
        weather,
        weatherVisual: weather
          ? this.weatherRegistry.get(weather).visual || null
          : null,
      },
      actionLifecycle: this.actionLifecycle?.view(),
      replacements: this.replacements?.view() || [],
      decision: {
        required: this.decisions?.required().map((s) => s.id) || [],
        queued: [...(this.decisions?.pending.keys() || [])],
      },
    };
  }
  name(mon) {
    const record = this.forms.records[mon.uid];
    return record?.id
      ? this.forms.registry.get(record.id).name
      : this.db.species[this.forms.effective(mon).species].name;
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
    const context = { actorSeat: this.seatId(seat) };
    const base =
      this.traits?.calculate(
        "speed-base",
        this.forms.effective(mon).stats.spe,
        context,
      ) ?? this.forms.effective(mon).stats.spe;
    const staged = Math.floor(
      base *
        stageMultiplier(this.conditions.get(context.actorSeat).stages.spe || 0),
    );
    const equipped = Math.floor(
      this.traits?.calculate("speed", staged, context) ?? staged,
    );
    return Math.floor(
      equipped *
        (mon.status === "paralysis" ? this.rules.paralysisSpeedMultiplier : 1),
    );
  }

  changeStage(seat, key, amount, { sourceSeat = seat } = {}) {
    const targetSeat = this.seatId(seat),
      permission = {
        targetSeat,
        sourceSeat: this.seatId(sourceSeat),
        key,
        amount,
        allowed: true,
      };
    this.traits?.run("stage-check", permission);
    const before = this.conditions.get(targetSeat).stages[key] || 0;
    const changed =
      permission.allowed &&
      this.conditions.changeStage(targetSeat, key, amount);
    if (changed) {
      this.emit(stageMessage(this.name(this.roster.occupant(targetSeat)), key, this.conditions.get(targetSeat).stages[key] - before), "stage", {
        targetSeat,
        actorSeat: this.seatId(sourceSeat),
        stat: key,
        amount: this.conditions.get(targetSeat).stages[key] - before,
      });
      this.traits?.run("stage-applied", permission);
    }
    return changed;
  }
  applyConfusion(targetSeat, sourceSeat) {
    const state = this.conditions.get(targetSeat);
    if (state.confused || !(this.roster.occupant(targetSeat)?.hp > 0))
      return false;
    const c = { targetSeat, actorSeat: sourceSeat, sourceSeat, allowed: true };
    this.traits.run("confusion-check", c);
    if (!c.allowed) return false;
    state.confused = 2 + this.rng.int(4);
    this.emit("陷入了混乱！", "status", { targetSeat });
    this.traits.run("confusion-applied", c);
    return true;
  }
  applyFlinch(targetSeat, sourceSeat) {
    const c = { targetSeat, actorSeat: sourceSeat, sourceSeat, allowed: true };
    this.traits.run("flinch-check", c);
    if (!c.allowed) return false;
    this.conditions.get(targetSeat).flinched = true;
    return true;
  }

  applyStatus(seat, status, source = {}) {
    return this.statuses.apply(seat, status, source);
  }
  applyAttraction(targetSeat, sourceSeat) {
    const target = this.roster.occupant(targetSeat),
      source = this.roster.occupant(sourceSeat);
    if (
      !target ||
      !source ||
      !["♀", "♂"].includes(target.gender) ||
      !["♀", "♂"].includes(source.gender) ||
      target.gender === source.gender
    )
      return false;
    const c = { targetSeat, sourceSeat, allowed: true };
    this.traits.run("attraction-check", c);
    if (!c.allowed) return false;
    this.conditions.get(targetSeat).attractedTo = source.uid;
    this.emit("陷入了着迷！", "trait", { targetSeat });
    this.traits.run("attraction-applied", c);
    return true;
  }
  movesFor(seat) {
    return this.forms.moves(this.roster.occupant(this.seatId(seat)));
  }
  moveAvailable(seat, index) {
    return moveAvailable(this, this.seatId(seat), index);
  }
  enemyMove() {
    return this.ai(this, this.awaySeat).index;
  }
  /** Collect or execute one legal human command. All human seats choose before AI or RNG advances. */
  act(action) {
    const checkpoint = new BattleCheckpoint(this);
    try {
      return this.applyAction(action);
    } catch (error) {
      checkpoint.restore();
      throw error;
    }
  }
  advance() {
    if (
      this.ended ||
      this.decisions.required().length ||
      this.decisions.pending.size
    )
      return [];
    const checkpoint = new BattleCheckpoint(this);
    try {
      this.recorder.begin();
      this.rounds.resolve([]);
      return this.events;
    } catch (error) {
      checkpoint.restore();
      throw error;
    }
  }
  applyAction(action) {
    this.recorder.begin();
    this.actionId = null;
    if (this.ended) return this.events;
    const prepared = this.actions.prepare(action);
    if (prepared.error) {
      this.emit(prepared.error, "invalid");
      return this.events;
    }
    if (prepared.kind === "form") {
      const mon = this.roster.occupant(prepared.seat);
      this.forms.activate(
        mon,
        prepared.form,
        this.roster.owner(prepared.seat).id,
      );
      this.emit("形态发生了变化！", "form", {
        targetSeat: prepared.seat,
        actorSeat: prepared.seat,
        formId: prepared.form,
      });
      this.traits.enter(prepared.seat);
      this.outcomes.observe();
      return this.events;
    }
    if (prepared.kind === "cancel") {
      this.decisions.pending.clear();
      this.emit("本回合的行动选择已清除。", "choice");
      return this.events;
    }
    prepared.actionId = `action:${++this.actionSequence}`;
    this.actionId = prepared.actionId;
    if (prepared.requestedReplacement) {
      this.phase = "replacement";
      this.replacements.fulfill(prepared);
      this.outcomes.observe();
      this.rounds.resume();
    } else if (prepared.forced && this.rules.forcedReplacementFree) {
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
      this.traits?.run("outcome", { result, winner });
      this.prizeMultiplier =
        this.traits?.calculate("prize-modifier", this.prizeMultiplier || 1, {
          result,
          winner,
        }) ?? 1;
      this.ended = true;
      this.result = result;
      this.winner = winner;
      this.spoils.settle(result);
      for (const seat of this.roster.seats.values()) {
        const original = this.conditions.get(seat.id).originalAbility;
        if (original && this.roster.occupant(seat.id))
          this.roster.occupant(seat.id).ability = original;
      }
      this.equipment.restore();
      this.replacements.clear();
      this.rounds.clear();
      this.states.clear("end");
      this.actionLifecycle.clearAll();
      for (const controller of this.roster.controllers.values())
        for (const mon of controller.party) this.forms.restore(mon, "end");
    }
  }
}
