const fresh = () => ({
  stages: {},
  confused: 0,
  focus: false,
  protected: false,
  bide: null,
  traps: 0,
  flinched: false,
  fury: 0,
});
/** Temporary effects belong to seats; leaving the field resets that seat's scope. */
export class BattleVolatiles {
  constructor(roster) {
    this.states = new Map([...roster.seats.keys()].map((id) => [id, fresh()]));
  }
  get(id) {
    const state = this.states.get(id);
    if (!state) throw new Error(`Unknown volatile scope ${id}`);
    return state;
  }
  reset(id) {
    this.states.set(id, fresh());
  }
  startRound() {
    for (const state of this.states.values()) {
      state.protected = false;
      state.flinched = false;
    }
  }
  changeStage(id, key, amount) {
    const stages = this.get(id).stages,
      before = stages[key] || 0;
    stages[key] = Math.max(-6, Math.min(6, before + amount));
    return stages[key] !== before;
  }
}
