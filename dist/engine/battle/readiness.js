/** Conditions preventing action; separate from PP, accuracy, effects and scheduling. */
export function canAct(c) {
  const { battle: b, mon, opponent, selfState: state, side, other } = c;
  const permission = { ...c, allowed: true };
  b.traits?.run("action-permission", permission);
  if (!permission.allowed) return false;
  if (
    state.attractedTo &&
    b.roster
      .occupied()
      .some((s) => b.roster.occupant(s.id).uid === state.attractedTo) &&
    b.rng.next() < 0.5
  ) {
    c.emit("因着迷而无法行动！");
    return false;
  }
  if (state.flinched) {
    c.emit(`${b.name(mon)} 因畏缩无法行动！`);
    return false;
  }
  if (mon.status === "sleep") {
    if (--mon.sleep <= 0) {
      mon.status = null;
      c.emit(`${b.name(mon)} 醒来了！`);
    } else {
      c.emit(`${b.name(mon)} 正在熟睡。`);
      return false;
    }
  }
  if (mon.status === "freeze") {
    if (b.rng.next() < b.rules.thawChance) {
      mon.status = null;
      c.emit("冰冻解除了！");
    } else {
      c.emit(`${b.name(mon)} 被冻住了！`);
      return false;
    }
  }
  if (mon.status === "paralysis" && b.rng.next() < b.rules.paralysisChance) {
    c.emit(`${b.name(mon)} 因麻痹无法行动！`);
    return false;
  }
  if (state.confused > 0) {
    state.confused--;
    if (state.confused && b.rng.next() < b.rules.confusionChance) {
      const db = {
        ...b.db,
        typeChart: {},
        species: {
          ...b.db.species,
          [mon.species]: { ...b.db.species[mon.species], types: [] },
        },
      };
      const amount = b.rules.damage(
        mon,
        mon,
        { power: 40, type: "normal" },
        db,
        b.rng,
        { aStages: state.stages, dStages: state.stages },
      ).amount;
      mon.hp = Math.max(0, mon.hp - amount);
      c.emit(`${b.name(mon)} 在混乱中攻击了自己！`, "hurt", { side });
      return false;
    }
  }
  if (state.bide) {
    const pending = state.bide;
    if (--pending.turns > 0) {
      c.emit(`${b.name(mon)} 正在忍耐！`);
      return false;
    }
    const victim = other === side ? b.roster.opposing(side)[0]?.id : other;
    const target = victim && b.roster.occupant(victim);
    if (target) target.hp = Math.max(0, target.hp - pending.damage * 2);
    state.bide = null;
    c.emit("释放了忍耐的力量！", "hurt", { targetSeat: victim });
    return false;
  }
  return true;
}
