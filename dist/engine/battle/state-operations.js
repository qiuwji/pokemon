export const BATTLE_STATE_OPERATIONS = {
  applyBattleState(c, s) {
    const seat = s.target === "self" ? c.actorSeat : c.targetSeat;
    const applied = c.battle.states.attach(s.id, seat, {
      sourceSeat: c.actorSeat,
      moveId: c.move?.id || null,
      data: s.data || {},
      duration: s.duration,
    });
    if (!applied) {
      c.successful = false;
      c.emit("状态已经存在。", "failed");
    }
    return applied;
  },
  removeBattleState(c, s) {
    const seat = s.target === "self" ? c.actorSeat : c.targetSeat,
      record = c.battle.states.lookup(s.id, seat);
    return record && c.battle.states.remove(record.key);
  },
  updateBattleState(c, s) {
    if (!c.battleState) throw new Error("State update requires a state hook");
    return c.battle.states.update(c.battleState.key, s.data);
  },
};
for (const op of ["applyBattleState", "removeBattleState"])
  BATTLE_STATE_OPERATIONS[op].validate = (s) => {
    if (
      typeof s.id !== "string" ||
      !s.id ||
      !["self", "opponent"].includes(s.target || "opponent")
    )
      throw new Error("Invalid battle state operation");
  };
