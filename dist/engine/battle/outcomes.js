/** Faint settlement and participation are per UID; victory is based on living alliances, not active seats. */
export class BattleOutcomes {
  constructor(battle) {
    this.battle = battle;
    this.defeated = new Set();
    this.encounters = new Map();
    for (const seat of battle.roster.occupied()) this.enter(seat.id);
  }
  friendly() {
    const b = this.battle;
    return b.roster
      .occupied()
      .filter((s) => b.roster.alliance(s.id) === b.homeAlliance);
  }
  enter(seat) {
    const b = this.battle,
      mon = b.roster.occupant(seat);
    if (!(mon?.hp > 0)) return;
    if (b.roster.alliance(seat) === b.homeAlliance) {
      for (const enemy of b.roster
        .occupied()
        .filter((s) => b.roster.isOpposing(seat, s.id))) {
        const uid = b.roster.occupant(enemy.id).uid;
        if (!this.encounters.has(uid)) this.encounters.set(uid, new Set());
        this.encounters.get(uid).add(mon.uid);
      }
    } else if (!this.encounters.has(mon.uid))
      this.encounters.set(
        mon.uid,
        new Set(this.friendly().map((s) => b.roster.occupant(s.id).uid)),
      );
  }
  observe() {
    const b = this.battle;
    if (b.ended) return;
    const seats = [...b.roster.seats.values()].sort(
      (a, c) =>
        Number(b.roster.alliance(a.id) === b.homeAlliance) -
        Number(b.roster.alliance(c.id) === b.homeAlliance),
    );
    for (const seat of seats) {
      const mon = b.roster.occupant(seat.id);
      if (!mon || mon.hp > 0 || this.defeated.has(mon.uid)) continue;
      this.defeated.add(mon.uid);
      b.phase = "faint";
      b.emit(`${b.name(mon)} 倒下了！`, "faint", { targetSeat: seat.id });
      if (b.roster.alliance(seat.id) !== b.homeAlliance) this.experience(mon);
    }
    const alliances = new Map();
    for (const side of b.roster.sides.values())
      alliances.set(
        side.allianceId,
        (alliances.get(side.allianceId) || 0) + b.roster.living(side.id).length,
      );
    const livingAlliances = [...alliances.keys()].filter(
      (id) => alliances.get(id) > 0,
    );
    const interactiveAlliances = new Set(
      [...b.roster.controllers.values()]
        .filter((c) => c.kind === "human" && c.party.some((m) => m.hp > 0))
        .map((c) => b.roster.sides.get(c.sideId).allianceId),
    );
    const outcome = b.rules.outcome({
      homeAlive: alliances.get(b.homeAlliance) || 0,
      awayAlive: [...alliances]
        .filter(([id]) => id !== b.homeAlliance)
        .reduce((n, [, alive]) => n + alive, 0),
      livingAlliances,
      homeAlliance: b.homeAlliance,
      interactiveAlliances,
    });
    if (outcome) {
      const result = typeof outcome === "string" ? outcome : outcome.result;
      b.finish(
        result,
        typeof outcome === "object"
          ? outcome.winner
          : livingAlliances[0] || null,
      );
      b.phase = "outcome";
      if (result === "loss") b.emit("没有能够继续战斗的宝可梦了…", "end");
    }
  }
  experience(defeated) {
    const b = this.battle,
      spec = b.db.species[defeated.species],
      participants = this.encounters.get(defeated.uid) || new Set();
    const recipients = [...b.roster.controllers.values()]
      .filter((c) => b.roster.sides.get(c.sideId).allianceId === b.homeAlliance)
      .flatMap((c) => c.party)
      .filter((m) => m.hp > 0 && participants.has(m.uid));
    const total = b.rules.experienceAward({
      species: spec,
      level: defeated.level,
      trainer: b.trainer,
    });
    b.phase = "experience";
    for (const mon of recipients) {
      const xp = Math.max(1, Math.floor(total / recipients.length));
      b.emit(`${b.name(mon)} 获得了 ${xp} 点经验！`, "text", {
        targetUid: mon.uid,
      });
      for (const event of b.rules.grantExperience(mon, xp, spec, b.db))
        b.emit(event.text, event.kind, { targetUid: mon.uid });
    }
  }
  vacancies() {
    const b = this.battle;
    if (b.ended) return;
    for (const seat of b.roster.seats.values()) {
      if (b.roster.occupant(seat.id)?.hp > 0) continue;
      const next = b.roster.bench(seat.id)[0];
      if (next && b.roster.owner(seat.id).kind === "ai") {
        b.phase = "replacement";
        b.actions.switch(seat.id, next.index);
      } else if (!next && seat.index !== -1) {
        const old = b.roster.occupant(seat.id);
        seat.index = -1;
        b.emit("该席位暂时空缺。", "vacancy", {
          targetSeat: seat.id,
          previousUid: old?.uid,
        });
      }
    }
  }
  replaceOpponent() {
    this.vacancies();
  }
}
