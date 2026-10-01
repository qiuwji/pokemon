export function monsterView(mon) {
  return mon
    ? {
        uid: mon.uid,
        species: mon.species,
        level: mon.level,
        gender: mon.gender,
        hp: mon.hp,
        stats: { hp: mon.stats.hp },
        status: mon.status,
        exp: mon.exp,
      }
    : null;
}
/** Detached projections and stable seat/UID metadata; no full-party serialization. */
export class BattleEvents {
  constructor(roster) {
    this.roster = roster;
    this.sequence = 0;
    this.events = [];
  }
  begin() {
    this.events = [];
  }
  snapshot() {
    return {
      combatants: [...this.roster.seats.values()].map((seat) => ({
        seatId: seat.id,
        sideId: seat.sideId,
        controllerId: seat.controllerId,
        monster: monsterView(this.roster.occupant(seat.id)),
      })),
      sides: [...this.roster.sides.values()].map((s) => ({
        ...s,
        total: [...this.roster.controllers.values()]
          .filter((c) => c.sideId === s.id)
          .reduce((n, c) => n + c.party.length, 0),
        remaining: this.roster.living(s.id).length,
      })),
    };
  }
  emit(text, kind, round, { actorSeat, targetSeat, ...metadata } = {}) {
    const event = {
      ...metadata,
      kind,
      text,
      round,
      sequence: ++this.sequence,
      ...this.snapshot(),
    };
    if (actorSeat)
      Object.assign(event, {
        actorSeat,
        actorUid: this.roster.occupant(actorSeat)?.uid ?? null,
      });
    if (targetSeat)
      Object.assign(event, {
        targetSeat,
        targetUid: this.roster.occupant(targetSeat)?.uid ?? null,
      });
    this.events.push(event);
    return event;
  }
}
