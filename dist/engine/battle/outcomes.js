/** Settles each defeated UID once; a defeated active enemy does not imply team defeat. */
export class BattleOutcomes {
  constructor(battle) {
    this.battle = battle;
    this.defeated = new Set();
    this.participants = new Set([battle.player.uid]);
  }
  observe() {
    const b = this.battle;
    if (b.ended) return;
    for (const side of [1, 0]) {
      const mon = b.monster(side);
      if (!mon || mon.hp > 0 || this.defeated.has(mon.uid)) continue;
      this.defeated.add(mon.uid);
      b.emit(`${b.name(mon)} 倒下了！`, "faint", {
        side,
        targetSeat: b.seatId(side),
      });
      if (side === 1) this.experience(mon);
    }
    const result = b.rules.outcome({
      homeAlive: b.roster.living(b.roster.seat(b.seatId(0)).sideId).length,
      awayAlive: b.roster.living(b.roster.seat(b.seatId(1)).sideId).length,
    });
    if (result) {
      b.finish(result);
      if (result === "loss") b.emit("没有能够继续战斗的宝可梦了…", "end");
    }
  }
  experience(defeated) {
    const b = this.battle,
      spec = b.db.species[defeated.species];
    const recipients = b.party.filter(
      (m) => m.hp > 0 && this.participants.has(m.uid),
    );
    const total = b.rules.experienceAward({
      species: spec,
      level: defeated.level,
      trainer: b.trainer,
    });
    for (const mon of recipients) {
      const xp = Math.max(1, Math.floor(total / recipients.length));
      b.emit(`${b.name(mon)} 获得了 ${xp} 点经验！`, "text", {
        targetUid: mon.uid,
      });
      for (const event of b.rules.grantExperience(mon, xp, spec, b.db))
        b.emit(event.text, event.kind, { targetUid: mon.uid });
    }
  }
  replaceOpponent() {
    const b = this.battle;
    if (b.ended || b.enemy.hp > 0) return;
    const next = b.roster.bench(b.seatId(1))[0];
    if (!next) return;
    b.actions.switch(1, next.index);
    this.participants = new Set(b.player.hp > 0 ? [b.player.uid] : []);
  }
}
