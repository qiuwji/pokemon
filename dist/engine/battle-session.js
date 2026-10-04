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
      let entry;
      await this.transitions.run("encounter", () => {
        this.battle = preparedBattle;
        const view = this.battle.entryView || this.battle.snapshot();
        this.director.reset(view);
        entry = {
          kind: "entry",
          trainers: options.trainer ? options.presentation?.trainers || [] : [],
          ...view,
          text: options.trainer ? "训练家发起了挑战！" : "野生宝可梦出现了！",
        };
        this.director.stage(entry);
        this.onChange();
      });
      await this.director.play(entry, { message: this.onMessage });
      for (const event of this.battle.events)
        await this.director.play(event, { message: this.onMessage });
      return true;
    } finally {
      this.locked = false;
      this.onChange();
    }
  }
  /** Always return control; owners recover uncommitted domain transactions. */
  async finish() {
    const battle = this.battle;
    let result, committed = false, failure;
    try {
      result = this.pendingResult = this.onResult(battle);
      await this.transitions.run("battle-exit", () => {
        result.commit?.();
        committed = true;
      });
    } catch (error) {
      failure = error;
      if (!committed) await this.onFailure(error, battle);
    } finally {
      this.battle = null;
      this.pendingResult = null;
      this.locked = false;
      this.director.reset();
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
