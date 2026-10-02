const fail = (c) => {
  c.successful = false;
  c.emit("没有效果。", "failed");
};
const environmentMoves = {
  grass: "stun_spore",
  long_grass: "razor_leaf",
  sand: "earthquake",
  underwater: "hydro_pump",
  water: "surf",
  pond: "bubble_beam",
  mountain: "rock_slide",
  cave: "shadow_ball",
  building: "swift",
  plain: "swift",
};
export const CONTROL_OPERATIONS = {
  boostAndConfuse(c, s) {
    c.battle.changeStage(c.targetSeat, s.key, s.key === "atk" ? 2 : 1, {
      sourceSeat: c.actorSeat,
    });
    c.battle.applyConfusion(c.targetSeat, c.actorSeat);
  },
  bellyDrum(c) {
    const cost = Math.max(1, Math.floor(c.mon.stats.hp / 2));
    if (c.mon.hp <= cost || (c.selfState.stages.atk || 0) >= 6) {
      fail(c);
      return;
    }
    c.mon.hp -= cost;
    c.battle.changeStage(c.actorSeat, "atk", 6 - (c.selfState.stages.atk || 0));
    c.emit("以体力换取了最高攻击！", "hurt", { targetSeat: c.actorSeat });
  },
  stockpile(c) {
    const b = c.battle,
      r = b.states.lookup("stockpile", c.actorSeat);
    if (r) {
      if (r.data.count === 3) {
        fail(c);
        return;
      }
      b.states.update(r.key, { count: r.data.count + 1 });
    } else
      b.states.attach("stockpile", c.actorSeat, {
        data: { count: 1 },
        moveId: c.move.id,
      });
    c.emit("积蓄了力量！", "state", { targetSeat: c.actorSeat });
  },
  swallow(c) {
    const b = c.battle,
      r = b.states.lookup("stockpile", c.actorSeat);
    if (!r) {
      fail(c);
      return;
    }
    const fraction = 1 / (1 << (3 - r.data.count));
    b.states.remove(r.key, "consumed");
    if (c.mon.hp === c.mon.stats.hp) {
      fail(c);
      return;
    }
    c.registry.run([{ op: "restoreHP", fraction }], c);
  },
  imprison(c) {
    const b = c.battle;
    if (
      !b.roster
        .opposing(c.actorSeat)
        .some((s) =>
          b.roster
            .occupant(s.id)
            .moves.some((m) => c.mon.moves.some((slot) => slot.id === m.id)),
        )
    ) {
      fail(c);
      return;
    }
    if (!b.states.attach("imprison", c.actorSeat, { moveId: c.move.id }))
      fail(c);
  },
  environmentMove(c) {
    const b = c.battle,
      id = environmentMoves[b.environment.terrain];
    if (!id || !b.db.moves[id])
      throw new Error("Nature Power move catalog dependency missing");
    const action = b.actionLifecycle.replace(c.action, id);
    b.moves.execute({
      ...action,
      replacement: true,
      skipPP: true,
      skipReadiness: true,
      target: { kind: "seat", id: c.targetSeat },
    });
  },
  clearStages(c) {
    for (const s of c.battle.roster.occupied())
      c.battle.conditions.get(s.id).stages = {};
    c.emit("所有能力变化消失了。");
  },
  copyStages(c) {
    c.selfState.stages = { ...c.targetState.stages };
    c.emit("复制了对方的能力变化！");
  },
  minimize(c) {
    c.battle.changeStage(c.actorSeat, "eva", 1);
    c.battle.states.attach("minimize", c.actorSeat, { moveId: c.move.id });
  },
  defenseCurl(c) {
    c.battle.changeStage(c.actorSeat, "def", 1);
    c.battle.states.attach("defense_curl", c.actorSeat, { moveId: c.move.id });
  },
  failMove: fail,
  refresh(c) {
    if (!["poison", "burn", "paralysis"].includes(c.mon.status)) {
      fail(c);
      return;
    }
    c.mon.status = null;
    c.emit("恢复了异常状态！", "heal", { targetSeat: c.actorSeat });
  },
  partyCure(c) {
    const b = c.battle;
    for (const mon of b.roster.owner(c.actorSeat).party) {
      if (c.move.id === "heal_bell" && mon.ability === "soundproof") continue;
      mon.status = null;
      mon.sleep = 0;
    }
    c.emit("队伍的异常状态恢复了！", "heal", { targetSeat: c.actorSeat });
  },
  painSplit(c) {
    if (c.battle.states.lookup("substitute", c.targetSeat)) {
      fail(c);
      return;
    }
    const hp = Math.floor((c.mon.hp + c.opponent.hp) / 2);
    c.mon.hp = Math.min(c.mon.stats.hp, hp);
    c.opponent.hp = Math.min(c.opponent.stats.hp, hp);
    c.emit("双方平分了剩余体力！", "heal", { targetSeat: c.targetSeat });
  },
  attract(c) {
    if (!c.battle.applyAttraction(c.targetSeat, c.actorSeat)) fail(c);
  },
};
CONTROL_OPERATIONS.boostAndConfuse.validate = (s) => {
  if (!["atk", "spa"].includes(s.key))
    throw new Error("Invalid confusion boost");
};
