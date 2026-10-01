/** Player command validation and non-move effects. No scheduling or faint/XP decisions. */
export class BattleActions {
  constructor(battle) {
    this.battle = battle;
  }
  prepare(action) {
    const b = this.battle;
    if (!action || typeof action !== "object")
      return { error: "无效的战斗指令。" };
    if (action.actor !== undefined && action.actor !== b.player.uid)
      return { error: "这位伙伴不能执行该行动。" };
    if (b.player.hp <= 0 && action.kind !== "switch")
      return { error: "请选择一只还能战斗的宝可梦。" };
    switch (action.kind) {
      case "move": {
        if (
          action.target &&
          (action.target.kind !== "seat" || action.target.id !== b.seatId(1))
        )
          return { error: "当前单打的目标无效。" };
        const available = b.player.moves.some((m) => m.pp > 0);
        const slot =
          Number.isInteger(action.index) && b.player.moves[action.index];
        if (available && (!slot || slot.pp <= 0))
          return { error: "这个招式没有剩余 PP。" };
        const index = available ? action.index : -1;
        const definition =
          index < 0 ? {} : b.moveEffects.get(b.db.moves[slot.id].effect);
        return definition.supported === false
          ? { error: definition.reason }
          : { ...action, index };
      }
      case "switch":
        return b.roster.canReplace(b.seatId(0), action.index)
          ? { ...action, forced: b.player.hp <= 0 }
          : { error: "这只宝可梦无法替换上场。" };
      case "potion":
      case "ball":
      case "item": {
        if (action.kind === "item" && !action.item)
          return { error: "请选择要使用的道具。" };
        const id =
          action.item || (action.kind === "ball" ? "pokeball" : "potion");
        const plan = b.items.prepare({
          id,
          bag: b.bag,
          party: b.party,
          index: action.index ?? b.active,
          context: "battle",
          enemy: b.enemy,
          canCapture: b.rules.canCapture(b),
        });
        return plan.ok
          ? { ...action, kind: "item", item: id, plan }
          : { error: plan.reason };
      }
      case "run":
        return b.rules.canEscape(b) ? action : { error: "这场战斗无法逃跑。" };
      default:
        return { error: "无效的战斗指令。" };
    }
  }
  switch(side, index) {
    const b = this.battle,
      seat = b.seatId(side),
      mon = b.roster.replace(seat, index);
    b.conditions.reset(seat);
    if (side === 0) b.outcomes.participants.add(mon.uid);
    b.emit(
      `${side === 0 ? "去吧，" : "对方派出了 "}${b.name(mon)}！`,
      "switch",
      { side, actorSeat: seat, targetSeat: seat },
    );
  }
  item(action) {
    const b = this.battle,
      { plan, item } = action;
    if (!b.items.commit(plan, b.bag, item))
      throw new Error("Item plan changed during synchronous execution");
    if (plan.target) {
      b.emit(`${b.name(plan.target)} 使用了${plan.item.name}。`, "heal", {
        ...(plan.target === b.player ? { side: 0 } : { offscreen: true }),
        targetUid: plan.target.uid,
        targetIndex: action.index ?? b.active,
      });
      return;
    }
    b.emit(`投出了${plan.item.name}！`, "ball", {
      actorSeat: b.seatId(0),
      targetSeat: b.seatId(1),
    });
    const result = b.rules.captureCheck(
      b.enemy,
      b.db.species[b.enemy.species],
      b.rng,
      plan.captureBonus,
    );
    b.emit(
      result.caught
        ? `太好了！捉到了 ${b.name(b.enemy)}！`
        : `${"晃动…".repeat(result.shakes)}宝可梦挣脱了！`,
      "capture",
      { ...result, targetSeat: b.seatId(1) },
    );
    if (result.caught) b.finish("caught");
  }
  run() {
    const b = this.battle;
    b.fleeAttempts++;
    const odds =
      Math.floor(
        (b.speed(b.player, 0) * 128) / Math.max(1, b.speed(b.enemy, 1)),
      ) +
      30 * b.fleeAttempts;
    if (
      b.player.ability === "run_away" ||
      b.speed(b.player, 0) >= b.speed(b.enemy, 1) ||
      b.rng.int(256) < odds
    ) {
      b.finish("escaped");
      b.emit("成功逃脱了！", "end");
    } else b.emit("没能逃脱！");
  }
}
