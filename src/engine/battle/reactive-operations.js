const fail = (c) => {
  c.skipDamage = true;
  c.successful = false;
  c.emit("没有效果。", "failed");
};
/** Preparation based on factual HP impacts; it never reruns damage or consumes observation RNG. */
export const REACTIVE_OPERATIONS = {
  retaliate(c) {
    const r = c.battle.actionLifecycle.retaliation(
      c.actorSeat,
      c.definition.retaliation,
    );
    if (!r) fail(c);
    else c.fixedDamage = r.amount * 2;
  },
  revengePower(c) {
    const r = c.battle.actionLifecycle.damageFor(c.actorSeat);
    if (r?.sourceUid === c.opponent.uid) c.power *= 2;
  },
  focusedAttack(c) {
    if (c.battle.actionLifecycle.damageFor(c.actorSeat)) fail(c);
  },
  protect(c, s) {
    const b = c.battle,
      last = b.actionLifecycle.lastMove(c.actorSeat, { successful: false }),
      previous = last && b.db.moves[last]?.effect,
      record = b.states.lookup("guard_chain", c.actorSeat),
      uses = ["protect", "detect", "endure"].includes(previous)
        ? record?.data.uses || 0
        : 0;
    const rates = b.rules.protectSuccessRates;
    const lastAction =
      b.turnOrder?.length > 1 && b.turnOrder.at(-1) === c.actorSeat;
    const allowed =
      b.rng.int(65536) <= rates[Math.min(rates.length - 1, uses)] &&
      !lastAction;
    b.states.attach("guard_chain", c.actorSeat, {
      data: { uses: allowed ? Math.min(3, uses + 1) : 0 },
    });
    if (!allowed) {
      fail(c);
      return;
    }
    if (s.endure) b.states.attach("endure", c.actorSeat, { duration: 1 });
    else c.selfState.protected = true;
    c.emit(s.endure ? "准备承受攻击！" : "保护了自己！", "barrier", {
      targetSeat: c.actorSeat,
    });
  },
};
REACTIVE_OPERATIONS.protect.validate = (s) => {
  if (s.endure !== undefined && typeof s.endure !== "boolean")
    throw new Error("Invalid guard operation");
};
