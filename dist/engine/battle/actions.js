/** Validates player requests and applies non-move operations. Scheduling and outcome settlement are elsewhere. */
export class BattleActions {
  constructor(battle) {
    this.battle = battle;
  }
  prepare(action, automaticSeat = null) {
    const b = this.battle;
    if (!action || typeof action !== "object")
      return { error: "无效的战斗指令。" };
    if (action.kind === "cancel" && !automaticSeat)
      return b.decisions.pending.size
        ? { kind: "cancel", seat: b.commandSeat }
        : { error: "没有等待中的行动。" };
    const seat = automaticSeat || action.seat || b.commandSeat;
    if (
      automaticSeat
        ? action.seat !== automaticSeat || b.roster.owner(seat).kind !== "ai"
        : !b.decisions.required().some((s) => s.id === seat)
    )
      return { error: "该席位现在不能选择行动。" };
    const mon = b.roster.occupant(seat),
      owner = b.roster.owner(seat);
    if (action.actor !== undefined && action.actor !== mon?.uid)
      return { error: "这位伙伴不能执行该行动。" };
    if (!(mon?.hp > 0) && action.kind !== "switch")
      return { error: "请选择一只还能战斗的宝可梦。" };
    const base = { ...action, seat, actor: mon?.uid ?? null };
    let prepared;
    switch (action.kind) {
      case "move": {
        const available = mon.moves.some((m) => m.pp > 0),
          slot = Number.isInteger(action.index) && mon.moves[action.index];
        if (available && (!slot || slot.pp <= 0))
          return { error: "这个招式没有剩余 PP。" };
        const index = available ? action.index : -1,
          move =
            index < 0
              ? { effect: "recoil", target: "selected" }
              : b.db.moves[slot.id];
        const definition = b.moveEffects.get(move.effect);
        if (definition.supported === false) return { error: definition.reason };
        if (!b.targeting.validate(seat, move, action.target))
          return { error: "当前行动的目标无效。" };
        prepared = { ...base, index };
        break;
      }
      case "switch":
        if (!b.roster.canReplace(seat, action.index))
          return { error: "这只宝可梦无法替换上场。" };
        prepared = { ...base, forced: !(mon?.hp > 0) };
        break;
      case "potion":
      case "ball":
      case "item": {
        if (action.kind === "item" && !action.item)
          return { error: "请选择要使用的道具。" };
        const item =
          action.item || (action.kind === "ball" ? "pokeball" : "potion");
        const index = action.index ?? b.roster.seat(seat).index;
        const targetSeat = b.roster.opposing(seat)[0]?.id;
        const plan = b.items.prepare({
          id: item,
          bag: owner.bag,
          party: owner.party,
          index,
          context: "battle",
          enemy: targetSeat ? b.roster.occupant(targetSeat) : null,
          canCapture: b.rules.canCapture(b),
        });
        if (!plan.ok) return { error: plan.reason };
        prepared = { ...base, kind: "item", item, index, targetSeat };
        break;
      }
      case "run":
        if (!b.rules.canEscape(b)) return { error: "这场战斗无法逃跑。" };
        prepared = base;
        break;
      default:
        return { error: "无效的战斗指令。" };
    }
    const reservation = b.decisions.reservation(prepared);
    return reservation ? { error: reservation } : prepared;
  }
  switch(reference, index) {
    const b = this.battle,
      seat = b.seatId(reference),
      old = b.roster.occupant(seat),
      mon = b.roster.replace(seat, index);
    b.conditions.reset(seat);
    b.outcomes.enter(seat);
    b.emit(
      `${b.roster.alliance(seat) === b.homeAlliance ? "去吧，" : "对方派出了 "}${b.name(mon)}！`,
      "switch",
      { actorSeat: seat, targetSeat: seat, previousUid: old?.uid || null },
    );
  }
  item(action) {
    const b = this.battle,
      owner = b.roster.owner(action.seat),
      enemy = action.targetSeat ? b.roster.occupant(action.targetSeat) : null;
    const plan = b.items.prepare({
      id: action.item,
      bag: owner.bag,
      party: owner.party,
      index: action.index,
      context: "battle",
      enemy,
      canCapture: b.rules.canCapture(b),
    });
    if (!plan.ok || !b.items.commit(plan, owner.bag, action.item)) {
      b.emit(plan.reason || "道具条件已改变，行动取消。", "failed", {
        actorSeat: action.seat,
      });
      return;
    }
    if (plan.target) {
      const target = [...b.roster.seats.keys()].find(
        (id) => b.roster.occupant(id)?.uid === plan.target.uid,
      );
      b.emit(`${b.name(plan.target)} 使用了${plan.item.name}。`, "heal", {
        actorSeat: action.seat,
        ...(target
          ? { targetSeat: target }
          : { offscreen: true, targetUid: plan.target.uid }),
        targetIndex: action.index,
      });
      return;
    }
    b.emit(`投出了${plan.item.name}！`, "ball", {
      actorSeat: action.seat,
      targetSeat: action.targetSeat,
    });
    const result = b.rules.captureCheck(
      enemy,
      b.db.species[enemy.species],
      b.rng,
      plan.captureBonus,
    );
    b.emit(
      result.caught
        ? `太好了！捉到了 ${b.name(enemy)}！`
        : `${"晃动…".repeat(result.shakes)}宝可梦挣脱了！`,
      "capture",
      { ...result, actorSeat: action.seat, targetSeat: action.targetSeat },
    );
    if (result.caught) b.finish("caught");
  }
  run(action) {
    const b = this.battle,
      mon = b.roster.occupant(action.seat),
      target = b.roster.opposing(action.seat)[0],
      enemy = target && b.roster.occupant(target.id);
    b.fleeAttempts++;
    const speed = b.speed(mon, action.seat),
      awaySpeed = enemy ? b.speed(enemy, target.id) : 0;
    const odds =
      Math.floor((speed * 128) / Math.max(1, awaySpeed)) + 30 * b.fleeAttempts;
    if (
      mon.ability === "run_away" ||
      speed >= awaySpeed ||
      b.rng.int(256) < odds
    ) {
      b.finish("escaped");
      b.emit("成功逃脱了！", "end", { actorSeat: action.seat });
    } else b.emit("没能逃脱！");
  }
}
