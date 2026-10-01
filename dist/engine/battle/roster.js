const identifier = (id) =>
  typeof id === "string" && /^[a-zA-Z0-9_.:-]+$/.test(id);

/** Validates topology before creating any battle-local state. Party objects remain domain-owned. */
export class BattleRoster {
  /** @param {import("../contracts.js").BattleTopology} definition */
  constructor(definition) {
    if (!Array.isArray(definition?.sides) || definition.sides.length < 2)
      throw new Error("Battle requires at least two sides");
    this.sides = new Map();
    this.controllers = new Map();
    this.seats = new Map();
    const creatures = new Set();
    for (const side of definition.sides) {
      if (
        !identifier(side.id) ||
        !identifier(side.allianceId) ||
        this.sides.has(side.id) ||
        !Array.isArray(side.controllers) ||
        !side.controllers.length ||
        !Array.isArray(side.seats) ||
        !side.seats.length
      )
        throw new Error("Invalid or duplicate battle side");
      this.sides.set(side.id, { id: side.id, allianceId: side.allianceId });
      for (const controller of side.controllers) {
        if (
          !identifier(controller.id) ||
          this.controllers.has(controller.id) ||
          !["human", "ai"].includes(controller.kind) ||
          !Array.isArray(controller.party) ||
          !controller.party.length ||
          controller.party.length > 6
        )
          throw new Error(`Invalid controller ${controller.id}`);
        for (const mon of controller.party) {
          if (
            !mon?.uid ||
            creatures.has(mon.uid) ||
            !Number.isInteger(mon.hp) ||
            mon.hp < 0 ||
            !Number.isInteger(mon.stats?.hp) ||
            mon.hp > mon.stats.hp ||
            !Array.isArray(mon.moves)
          )
            throw new Error("Invalid or duplicate combatant UID");
          creatures.add(mon.uid);
        }
        this.controllers.set(controller.id, {
          ...controller,
          bag: controller.bag ?? {},
          sideId: side.id,
        });
      }
      const assigned = new Set();
      for (const seat of side.seats) {
        const owner = this.controllers.get(seat.controllerId);
        if (
          !identifier(seat.id) ||
          this.seats.has(seat.id) ||
          owner?.sideId !== side.id
        )
          throw new Error(`Invalid seat ${seat.id}`);
        const index =
          seat.index ??
          owner.party.findIndex((m) => m.hp > 0 && !assigned.has(m.uid));
        const mon = owner.party[index];
        if (
          index !== -1 &&
          (!Number.isInteger(index) ||
            !mon ||
            mon.hp <= 0 ||
            assigned.has(mon.uid))
        )
          throw new Error(`Invalid seat occupant ${seat.id}`);
        if (mon) assigned.add(mon.uid);
        this.seats.set(seat.id, {
          id: seat.id,
          sideId: side.id,
          controllerId: owner.id,
          index,
        });
      }
    }
    if (new Set([...this.sides.values()].map((s) => s.allianceId)).size < 2)
      throw new Error("Battle needs opposing alliances");
  }
  seat(id) {
    const seat = this.seats.get(id);
    if (!seat) throw new Error(`Unknown battle seat ${id}`);
    return seat;
  }
  owner(id) {
    return this.controllers.get(this.seat(id).controllerId);
  }
  occupant(id) {
    const seat = this.seat(id);
    return this.owner(id).party[seat.index] || null;
  }
  living(sideId) {
    if (!this.sides.has(sideId))
      throw new Error(`Unknown battle side ${sideId}`);
    return [...this.controllers.values()]
      .filter((c) => c.sideId === sideId)
      .flatMap((c) => c.party)
      .filter((m) => m.hp > 0);
  }
  bench(id) {
    const owner = this.owner(id);
    const occupied = new Set(
      [...this.seats.values()]
        .filter((s) => s.controllerId === owner.id)
        .map((s) => s.index),
    );
    return owner.party
      .map((mon, index) => ({ mon, index }))
      .filter(({ mon, index }) => mon.hp > 0 && !occupied.has(index));
  }
  canReplace(id, index) {
    return (
      Number.isInteger(index) &&
      this.bench(id).some((entry) => entry.index === index)
    );
  }
  replace(id, index) {
    if (!this.canReplace(id, index)) throw new Error("Invalid replacement");
    this.seat(id).index = index;
    return this.occupant(id);
  }
  opposing(id) {
    const alliance = this.sides.get(this.seat(id).sideId).allianceId;
    return [...this.seats.values()].filter(
      (seat) =>
        this.sides.get(seat.sideId).allianceId !== alliance &&
        this.occupant(seat.id)?.hp > 0,
    );
  }
  /** @param {string} actorId @param {import("../contracts.js").TargetRef} ref */
  target(actorId, ref) {
    this.seat(actorId);
    if (ref?.kind === "side" && !this.sides.has(ref.id))
      throw new Error(`Unknown target side ${ref.id}`);
    if (ref?.kind === "self") return [this.seat(actorId)];
    if (ref?.kind === "seat")
      return [this.seat(ref.id)].filter((s) => this.occupant(s.id)?.hp > 0);
    if (ref?.kind === "side")
      return [...this.seats.values()].filter(
        (s) => s.sideId === ref.id && this.occupant(s.id)?.hp > 0,
      );
    if (ref?.kind === "field")
      return [...this.seats.values()].filter(
        (s) => this.occupant(s.id)?.hp > 0,
      );
    throw new Error("Invalid target reference");
  }
}
export function duelRoster(party, enemies, bag) {
  return {
    sides: [
      {
        id: "home",
        allianceId: "home",
        controllers: [{ id: "trainer", kind: "human", party, bag }],
        seats: [{ id: "home:0", controllerId: "trainer" }],
      },
      {
        id: "away",
        allianceId: "away",
        controllers: [{ id: "opponent", kind: "ai", party: enemies }],
        seats: [{ id: "away:0", controllerId: "opponent" }],
      },
    ],
  };
}
