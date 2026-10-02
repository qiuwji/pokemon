/** Collects one action per occupied human seat. This state never mutates monsters or advances RNG. */
export class BattleDecisions {
  constructor(battle) {
    this.battle = battle;
    this.pending = new Map();
  }
  forced() {
    const b = this.battle;
    return [...b.roster.seats.values()].filter(
      (s) =>
        b.roster.owner(s.id).kind === "human" &&
        !(b.roster.occupant(s.id)?.hp > 0) &&
        b.roster.bench(s.id).length,
    );
  }
  required() {
    const b = this.battle,
      forced = this.forced();
    if (b.replacements.required().length) return b.replacements.required();
    if (forced.length) return forced;
    return [...b.roster.seats.values()].filter(
      (s) =>
        b.roster.owner(s.id).kind === "human" &&
        b.roster.occupant(s.id)?.hp > 0 &&
        !this.pending.has(s.id) &&
        !b.actionLifecycle.locked(s.id),
    );
  }
  next() {
    return this.required()[0]?.id ?? null;
  }
  add(action) {
    this.pending.set(action.seat, action);
  }
  take() {
    const result = [...this.pending.values()];
    this.pending.clear();
    return result;
  }
  reservation(action) {
    const b = this.battle,
      owner = b.roster.owner(action.seat),
      queued = [...this.pending.values()].filter(
        (a) => b.roster.owner(a.seat).id === owner.id,
      );
    if (
      action.kind === "switch" &&
      queued.some((a) => a.kind === "switch" && a.index === action.index)
    )
      return "这位伙伴已经安排在另一席位上场。";
    if (
      action.kind === "item" &&
      queued.filter((a) => a.kind === "item" && a.item === action.item)
        .length >= (owner.bag[action.item] || 0)
    )
      return "这件道具已被另一行动预留。";
    return null;
  }
}
