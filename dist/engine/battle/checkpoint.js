const clone = (value) => structuredClone(value);
const replace = (target, source) => {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, clone(source));
};
/** An action journal restores domain identities, inventories, queues and seeded RNG after a rule fault. */
export class BattleCheckpoint {
  constructor(b) {
    this.battle = b;
    this.controllers = [...b.roster.controllers.values()].map((owner) => ({
      owner,
      members: [...owner.party],
      monsters: owner.party.map((mon) => ({ mon, data: clone(mon) })),
      bag: clone(owner.bag),
    }));
    this.seats = [...b.roster.seats.values()].map((seat) => ({
      seat,
      index: seat.index,
    }));
    this.conditions = clone(b.conditions.states);
    this.defeated = clone(b.outcomes.defeated);
    this.encounters = clone(b.outcomes.encounters);
    this.pending = clone(b.decisions.pending);
    this.fields = {};
    for (const key of [
      "turn",
      "turnOrder",
      "fleeAttempts",
      "ended",
      "result",
      "winner",
      "actionSequence",
      "actionId",
      "phase",
      "waterSport",
      "mudSport",
      "weather",
      "prizeMultiplier",
    ])
      this.fields[key] = {
        present: Object.hasOwn(b, key),
        value: clone(b[key]),
      };
    this.sequence = b.recorder.sequence;
    this.events = [...b.recorder.events];
    this.rng =
      typeof b.rng.snapshot === "function" ? b.rng.snapshot() : undefined;
  }
  restore() {
    const b = this.battle;
    for (const { owner, members, monsters, bag } of this.controllers) {
      owner.party.splice(0, owner.party.length, ...members);
      for (const { mon, data } of monsters) replace(mon, data);
      replace(owner.bag, bag);
    }
    for (const { seat, index } of this.seats) seat.index = index;
    b.conditions.states = clone(this.conditions);
    b.outcomes.defeated = clone(this.defeated);
    b.outcomes.encounters = clone(this.encounters);
    b.decisions.pending = clone(this.pending);
    for (const [key, field] of Object.entries(this.fields))
      if (field.present) b[key] = clone(field.value);
      else delete b[key];
    b.recorder.sequence = this.sequence;
    b.recorder.events = this.events;
    if (this.rng !== undefined) b.rng.restore(this.rng);
  }
}
