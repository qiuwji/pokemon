import { Battle } from "./battle.js";

/** Serializes domain actions and their presentation. No DOM or story knowledge. */
export class BattleSession {
  constructor({
    director,
    transitions,
    createBattle = (options) => new Battle(options),
    onMessage = () => {},
    onChange = () => {},
    onResult = () => ({}),
    onFailure = () => {},
  }) {
    Object.assign(this, {
      director,
      transitions,
      createBattle,
      onMessage,
      onChange,
      onResult,
      onFailure,
    });
    this.battle = null;
    this.enteringBattle = null;
    this.locked = false;
    this.pendingResult = null;
  }
  get busy() {
    return this.locked || this.transitions.busy || this.director.busy;
  }
  async start(options) {
    if (this.battle || this.busy) return false;
    this.locked = true;
    try {
      const preparedBattle = this.createBattle(options);
      this.exitTransition = options.presentation?.exitTransition;
      // Presentation can select entry audio before the covered scene swap.
      // The interactive battle is still published only at the transition midpoint.
      this.enteringBattle = preparedBattle;
      let entry;
      const transition = options.presentation?.transition;
      await this.transitions.run(transition?.kind || "encounter", () => {
        this.battle = preparedBattle;
        const view = this.battle.entryView || this.battle.snapshot();
        this.director.reset(view);
        entry = {
          kind: "entry",
          trainers: options.presentation?.trainers || [],
          ...view,
          text: options.trainer ? "训练家发起了挑战！" : "野生宝可梦出现了！",
          message: {
            id: options.trainer ? "trainer-challenge" : "wild-appeared",
            params: {},
          },
        };
        this.director.stage({ ...entry, ...options.presentation?.entryPhases?.[0] });
        this.onChange();
      }, transition);
      const phases = options.presentation?.entryPhases || [{}];
      for (const phase of phases) {
        const event = { ...entry, ...phase };
        if (phase.sendBack !== undefined)
          event.sendSeats = entry.combatants.filter(c =>
            (entry.sides.find(s => s.id === c.sideId)?.allianceId === entry.homeAlliance) === phase.sendBack,
          ).map(c => c.seatId);
        await this.director.play(event, { message: this.onMessage });
        if (phase.dialogue) await options.presentation.dialogue?.(phase.dialogue);
      }
      for (const event of this.battle.events)
        await this.director.play(event, { message: this.onMessage });
      return true;
    } catch (error) {
      // Failed dialogue/presentation after the covered swap must not leave a partial battle.
      if (this.battle) {
        const failed = this.battle;
        this.battle = null;
        this.director.reset();
        await this.onFailure(error, failed);
      }
      throw error;
    } finally {
      this.enteringBattle = null;
      this.locked = false;
      this.onChange();
    }
  }
  /** Always return control; owners recover uncommitted domain transactions. */
  async finish() {
    const battle = this.battle;
    let result, committed = false, cleared = false, failure;
    try {
      result = this.pendingResult = this.onResult(battle);
      for (const event of result.presentation || []) {
        await this.director.play(event, { message: this.onMessage });
        if (event.dialogue) await result.dialogue?.(event.dialogue);
      }
      await this.transitions.run("battle-exit", () => {
        result.commit?.();
        committed = true;
        // Reveal the destination, not the ended battle. Keep the lock until the fade ends.
        this.battle = null;
        this.director.reset();
        cleared = true;
        this.onChange();
      }, this.exitTransition);
    } catch (error) {
      failure = error;
      if (!committed) await this.onFailure(error, battle);
    } finally {
      this.battle = null;
      this.pendingResult = null;
      this.locked = false;
      if (!cleared) this.director.reset();
      this.onChange();
    }
    // A failed exit animation must not discard an already committed continuation.
    if (committed) await result.after?.();
    if (failure) throw failure;
  }
  async act(action) {
    if (!this.battle || this.busy) return false;
    this.locked = true;
    try {
      // Calculate once, then present immutable snapshots in order.
      const events = this.battle.act(action);
      for (const event of events)
        await this.director.play(event, { message: this.onMessage });
      let automaticRounds = 0;
      while (!this.battle.ended && !this.battle.decisions.required().length) {
        if (++automaticRounds > 32)
          throw new Error("Automatic action limit exceeded");
        const automatic = this.battle.advance();
        for (const event of automatic)
          await this.director.play(event, { message: this.onMessage });
      }
      if (this.battle.ended) {
        await this.finish();
      }
      return true;
    } finally {
      this.locked = false;
      this.onChange();
    }
  }
}
