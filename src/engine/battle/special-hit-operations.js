const fail = (c) => {
  c.skipDamage = true;
  c.successful = false;
  c.emit("没有效果。", "failed");
};
export const SPECIAL_HIT_OPERATIONS = {
  beatUp(c) {
    const b = c.battle;
    const defense = b.forms.baseStats(c.opponent).def;
    c.hitPlans = b.roster
      .owner(c.actorSeat)
      .party.filter((mon) => mon.hp > 0 && !mon.egg && !mon.status)
      .map((mon) => {
        let baseDamage = Math.floor(
          (b.db.species[mon.species].stats.atk *
            c.power *
            (Math.floor((mon.level * 2) / 5) + 2)) /
            defense,
        );
        baseDamage = Math.floor(baseDamage / 50) + 2;
        if (b.states.lookup("helping_hand", c.actorSeat))
          baseDamage = Math.floor((baseDamage * 15) / 10);
        return { baseDamage, memberUid: mon.uid };
      });
    if (!c.hitPlans.length) fail(c);
  },
  crash(c) {
    if (c.missReason === "immunity") return;
    const result = c.battle.moves.damage.preview(c);
    if (result.type === 0) return;
    const amount = Math.min(
      c.mon.hp,
      Math.floor(c.opponent.stats.hp / 2),
      Math.max(1, Math.floor(result.amount / 2)),
    );
    c.mon.hp -= amount;
    c.emit("飞踢失败，撞伤了自己！", "hurt", {
      targetSeat: c.actorSeat,
      amount,
      recoil: "miss",
    });
  },
  scatterCoins(c) {
    if (c.dealt) c.battle.spoils.scatter(c.actorSeat);
  },
  interceptionGuard(c, s) {
    const b = c.battle;
    if (b.turnOrder.length && b.turnOrder.at(-1) === c.actorSeat) {
      c.successful = false;
      c.emit("已经没有可等待的行动。", "failed");
      return;
    }
    if (!b.states.attach(s.id, c.actorSeat, { moveId: c.move.id })) {
      c.successful = false;
      c.emit("已经处于等待状态。", "failed");
    }
  },
};
SPECIAL_HIT_OPERATIONS.scatterCoins.scope = "action";
SPECIAL_HIT_OPERATIONS.interceptionGuard.validate = (s) => {
  if (!["magic_coat", "snatch"].includes(s.id))
    throw new Error("Invalid interception state");
};
