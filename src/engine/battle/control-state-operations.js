const fail = (c) => {
  c.successful = false;
  c.emit("没有效果。", "failed");
};
const attach = (c, id, seat = c.targetSeat, options = {}) => {
  if (
    !c.battle.states.attach(id, seat, {
      sourceSeat: c.actorSeat,
      moveId: c.move.id,
      ...options,
    })
  )
    fail(c);
};
export const CONTROL_STATE_OPERATIONS = {
  restrictMove(c, s) {
    const b = c.battle,
      id = b.actionLifecycle.lastMove(c.targetSeat, { successful: false }),
      slot = b.movesFor(c.targetSeat).find((m) => m.id === id);
    if (
      !id ||
      !slot?.pp ||
      (s.state === "encore" &&
        ["struggle", "encore", "mirror_move"].includes(b.db.moves[id]?.effect))
    ) {
      fail(c);
      return;
    }
    attach(c, s.state, c.targetSeat, {
      data: { moveId: id },
      duration: (s.state === "disable" ? 2 : 3) + b.rng.int(4),
    });
  },
  seed(c) {
    if (
      c.battle.traits.types(c.targetSeat).includes("grass") ||
      c.battle.states.lookup("substitute", c.targetSeat)
    )
      fail(c);
    else attach(c, "leech_seed");
  },
  nightmare(c) {
    if (
      c.opponent.status !== "sleep" ||
      c.battle.states.lookup("substitute", c.targetSeat)
    )
      fail(c);
    else attach(c, "nightmare");
  },
  yawn(c) {
    const permission = {
      targetSeat: c.targetSeat,
      sourceSeat: c.actorSeat,
      sourceKind: "move",
      status: "sleep",
      allowed: !c.opponent.status,
    };
    c.battle.traits.run("status-check", permission);
    if (!permission.allowed) fail(c);
    else attach(c, "yawn");
  },
  perishSong(c) {
    let applied = false;
    for (const s of c.battle.roster.occupied()) {
      if (c.battle.traits.ability(s.id) === "soundproof") continue;
      applied =
        c.battle.states.attach("perish_song", s.id, {
          sourceSeat: c.actorSeat,
          moveId: c.move.id,
        }) || applied;
    }
    if (!applied) fail(c);
  },
  spikes(c) {
    if (c.battle.states.lookup("spikes", c.targetSeat)?.stacks === 3) fail(c);
    else attach(c, "spikes");
  },
  rapidSpin(c) {
    if (!c.realDealt) return;
    const b = c.battle;
    for (const id of ["leech_seed", "spikes"]) {
      const r = b.states.lookup(id, c.actorSeat);
      if (r) b.states.remove(r.key, "cleared");
    }
    c.selfState.traps = 0;
  },
};
CONTROL_STATE_OPERATIONS.restrictMove.validate = (s) => {
  if (!["disable", "encore"].includes(s.state))
    throw new Error("Invalid move restriction");
};
