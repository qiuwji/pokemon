import { experienceDistribution } from "../experience.js";
import { FriendshipService } from "../growth/friendship.js";
import { PartyTraits } from "../rules/party-traits.js";
/** Faint settlement and participation are per UID; victory is based on living alliances, not active seats. */
export class BattleOutcomes {
  constructor(battle) {
    this.battle = battle;
    this.defeated = new Set();
    this.encounters = new Map();
    for (const seat of battle.roster.occupied()) this.enter(seat.id);
  }
  enter(seat) {
    const b = this.battle;
    for (const target of b.roster.occupied()) {
      const mon = b.roster.occupant(target.id);
      if (!this.encounters.has(mon.uid))
        this.encounters.set(mon.uid, new Set());
      for (const participant of b.roster.occupied())
        if (b.roster.isOpposing(target.id, participant.id))
          this.encounters
            .get(mon.uid)
            .add(b.roster.occupant(participant.id).uid);
    }
  }
  observe() {
    const b = this.battle;
    if (b.ended) return;
    const seats = [...b.roster.seats.values()].sort(
      (a, c) =>
        Number(b.roster.alliance(a.id) === b.homeAlliance) -
        Number(b.roster.alliance(c.id) === b.homeAlliance),
    );
    while (true) {
      const seat = seats.find((s) => {
        const mon = b.roster.occupant(s.id);
        return mon && mon.hp <= 0 && !this.defeated.has(mon.uid);
      });
      if (!seat) break;
      const mon = b.roster.occupant(seat.id);
      this.defeated.add(mon.uid);
      b.replacements.clear(seat.id);
      b.phase = "faint";
      b.emit(`${b.name(mon)} 倒下了！`, "faint", {
        targetSeat: seat.id,
        message: { id: "fainted", params: { mon: b.name(mon) } },
      });
      b.traits?.run("faint", { targetSeat: seat.id, ownerSeat: seat.id });
      b.states.clear("faint", seat.id);
      b.actionLifecycle.leave(seat.id);
      b.forms.restore(mon, "faint");
      const friendship = new FriendshipService({
        abilities: b.traits.abilities,
        heldItems: b.traits.heldItems,
      });
      friendship.change(mon, "faint", { party: b.roster.owner(seat.id).party });
      for (const alliance of new Set(
        [...b.roster.controllers.values()]
          .filter((c) => c.kind === "human")
          .map((c) => b.roster.sides.get(c.sideId).allianceId),
      ))
        if (alliance !== b.roster.alliance(seat.id))
          this.experience(mon, alliance);
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
        .filter(
          (c) => c.kind === "human" && c.party.some((m) => m.hp > 0 && !m.egg),
        )
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
  experience(defeated, alliance = this.battle.homeAlliance) {
    const b = this.battle,
      spec = b.db.species[defeated.species],
      participants = this.encounters.get(defeated.uid) || new Set();
    const party = [...b.roster.controllers.values()]
      .filter((c) => b.roster.sides.get(c.sideId).allianceId === alliance)
      .flatMap((c) => c.party);
    const traits = new PartyTraits({
      party,
      abilities: b.traits.abilities,
      heldItems: b.traits.heldItems,
    });
    const friendship = new FriendshipService({
      abilities: b.traits.abilities,
      heldItems: b.traits.heldItems,
    });
    const distribution = experienceDistribution({
      party,
      participants,
      total: b.rules.experienceAward({
        species: spec,
        level: defeated.level,
        trainer: false,
      }),
      isShare: (mon) =>
        b.traits.heldItems[mon.heldItem]?.holdEffect === "exp_share",
    });
    b.traits?.run("experience", {
      defeatedUid: defeated.uid,
      alliance,
      recipients: distribution.map((d) => d.mon.uid),
    });
    b.phase = "experience";
    for (const { mon, amount } of distribution) {
      let xp = Math.floor(traits.calculate("experience-modifier", amount, mon));
      xp = b.rules.experienceFinal({
        amount: xp,
        trainer: b.trainer,
        traded: !!mon.traded,
      });
      b.emit(`${b.name(mon)} 获得了 ${xp} 点经验！`, "text", {
        targetUid: mon.uid,
      });
      for (const event of b.rules.grantExperience(mon, xp, spec, b.db, {
        evMultiplier: traits.calculate("ev-modifier", 1, mon),
      })) {
        if (event.kind === "level") friendship.change(mon, "level", { party });
        b.emit(event.text, event.kind, { targetUid: mon.uid });
      }
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
