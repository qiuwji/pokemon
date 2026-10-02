/** Domain operations shared by moves, held items, abilities and extension rules. */
export const TRAIT_OPERATIONS = {
  consume(c) {
    return c.consume?.();
  },
  setWeather(c, s) {
    c.battle.weather = { kind: s.weather, turns: s.turns ?? null };
    c.emit("天气发生变化！", "weather", { weather: s.weather });
  },
  traitHeal(c, s) {
    const m = c.owner;
    if (m.hp <= 0 || m.hp === m.stats.hp) return false;
    m.hp = Math.min(
      m.stats.hp,
      m.hp + Math.max(1, Math.floor(s.amount ?? m.stats.hp * s.fraction)),
    );
    c.emit("恢复了体力！", "heal", { targetSeat: c.ownerSeat });
    return true;
  },
  traitHurt(c, s) {
    const m =
      s.target === "actor" ? c.battle.roster.occupant(c.actorSeat) : c.owner;
    if (!(m?.hp > 0)) return false;
    m.hp = Math.max(
      0,
      m.hp - Math.max(1, Math.floor(s.amount ?? m.stats.hp * s.fraction)),
    );
    c.emit("受到了伤害！", "hurt", {
      targetSeat: s.target === "actor" ? c.actorSeat : c.ownerSeat,
    });
    return true;
  },
  traitStage(c, s) {
    let changed = false;
    for (const [key, value] of Object.entries(s.changes))
      changed =
        c.battle.changeStage(c.ownerSeat, key, value, {
          sourceSeat: c.ownerSeat,
        }) || changed;
    if (changed)
      c.emit("能力发生了变化！", "trait", { targetSeat: c.ownerSeat });
    return changed;
  },
  traitStatus(c, s) {
    return c.battle.applyStatus(
      s.target === "actor" ? c.actorSeat : c.ownerSeat,
      s.status,
      { sourceSeat: c.ownerSeat, sourceKind: c.attachmentKind },
    );
  },
};
TRAIT_OPERATIONS.setWeather.validate = (s) => {
  if (
    !["rain", "sun", "sand", "hail"].includes(s.weather) ||
    (s.turns !== undefined && (!Number.isInteger(s.turns) || s.turns < 1))
  )
    throw new Error("Invalid weather");
};
TRAIT_OPERATIONS.traitStage.validate = (s) => {
  if (
    !s.changes ||
    Object.entries(s.changes).some(
      ([k, v]) =>
        !["atk", "def", "spa", "spd", "spe", "acc", "eva"].includes(k) ||
        !Number.isInteger(v) ||
        Math.abs(v) > 6,
    )
  )
    throw new Error("Invalid trait stage");
};
for (const op of ["traitHeal", "traitHurt"])
  TRAIT_OPERATIONS[op].validate = (s) => {
    if (
      !Number.isFinite(s.amount ?? s.fraction) ||
      !((s.amount ?? s.fraction) > 0)
    )
      throw new Error("Invalid trait health amount");
  };
TRAIT_OPERATIONS.traitStatus.validate = (s) => {
  if (!["poison", "toxic", "burn", "paralysis", "sleep", "freeze"].includes(s.status))
    throw new Error("Invalid trait status");
};
