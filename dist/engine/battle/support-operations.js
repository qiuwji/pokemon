const fail = (c) => {
  c.successful = false;
  c.emit("没有效果。", "failed");
};
export const SUPPORT_OPERATIONS = {
  helpingHand(c) {
    const b = c.battle,
      ally = b.roster
        .occupied()
        .find(
          (s) =>
            s.id !== c.actorSeat &&
            !b.roster.isOpposing(s.id, c.actorSeat) &&
            b.roster.occupant(s.id).hp > 0,
        );
    if (
      !ally ||
      b.states.lookup("helping_hand", c.actorSeat) ||
      !b.states.attach("helping_hand", ally.id, {
        sourceSeat: c.actorSeat,
        moveId: c.move.id,
      })
    )
      fail(c);
  },
  memento(c) {
    if (
      !c.targetState.protected &&
      c.targetState.stages.atk === -6 &&
      c.targetState.stages.spa === -6
    ) {
      fail(c);
      return;
    }
    c.mon.hp = 0;
    if (
      !c.targetState.protected &&
      !c.battle.states.lookup("substitute", c.targetSeat)
    )
      for (const key of ["atk", "spa"])
        c.battle.changeStage(c.targetSeat, key, -2, {
          sourceSeat: c.actorSeat,
        });
    c.emit("耗尽体力留下了临别礼物！", "hurt", { targetSeat: c.actorSeat });
  },
  secretPower(c) {
    const steps = {
      grass: { op: "status", status: "poison" },
      long_grass: { op: "status", status: "sleep" },
      sand: { op: "stages", target: "opponent", changes: { acc: -1 } },
      underwater: { op: "stages", target: "opponent", changes: { def: -1 } },
      water: { op: "stages", target: "opponent", changes: { atk: -1 } },
      pond: { op: "stages", target: "opponent", changes: { spe: -1 } },
      mountain: { op: "confuse" },
      cave: { op: "flinch" },
    };
    c.registry.run(
      [
        steps[c.battle.environment.terrain] || {
          op: "status",
          status: "paralysis",
        },
      ],
      c,
    );
  },
};
