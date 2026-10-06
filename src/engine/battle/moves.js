import { BattleDamageCalculation } from "./damage-calculation.js";
import { BattleMoveInterception } from "./interception.js";
import { canAct } from "./readiness.js";
export const STRUGGLE = Object.freeze({
  name: "挣扎",
  power: 50,
  accuracy: 0,
  pp: 1,
  priority: 0,
  type: "normal",
  effect: "recoil",
  chance: 0,
  target: "selected",
  contact: true,
});
export function selectedMove(b, seat, index) {
  return index < 0 ? STRUGGLE : b.db.moves[b.movesFor(seat)[index].id];
}
/** Already prepared augmentation keeps source PP while ordering/targets use the replacement. */
export function actionMove(b, action) {
  const id = action.overrideMove || action.augmentedMove;
  return {
    ...(id ? b.db.moves[id] : selectedMove(b, action.seat, action.index)),
    ...(action.derivedMove || {}),
    id: id || b.movesFor(action.seat)[action.index]?.id || "struggle",
  };
}
/** Executes one action across live targets; PP/readiness and actor effects occur once per action. */
export class MoveExecutor {
  constructor(battle) {
    this.battle = battle;
    this.damage = new BattleDamageCalculation(battle);
    this.interception = new BattleMoveInterception(battle);
  }
  context(actorSeat, targetSeat, move, definition) {
    const b = this.battle,
      mon = b.roster.occupant(actorSeat);
    const other = targetSeat;
    const c = {
      battle: b,
      side: actorSeat,
      other,
      actorSeat,
      targetSeat,
      mon,
      opponent: b.roster.occupant(other),
      move,
      definition,
      power: move.power,
      dealt: 0,
      selfState: b.conditions.get(actorSeat),
      targetState: b.conditions.get(other),
    };
    c.emit = (text, kind, extra) =>
      b.emit(text, kind, {
        actorSeat: c.actorSeat,
        targetSeat: c.targetSeat,
        ...extra,
      });
    return c;
  }
  execute(action) {
    const b = this.battle,
      mon = b.roster.occupant(action.seat);
    if (!(mon?.hp > 0)) return false;
    action = { ...action, actor: mon.uid };
    if (!action.overrideMove && action.index >= 0) {
      const index = b.traits.calculate("selected-move", action.index, {
        actorSeat: action.seat,
        action,
      });
      if (
        !Number.isInteger(index) ||
        index < 0 ||
        !b.movesFor(action.seat)[index]
      )
        throw new Error("Invalid selected move index");
      action = { ...action, index };
    }
    const augmentation =
      action.augment && !action.replacement && !action.continuation
        ? b.augments.check(action)
        : null;
    if (augmentation && !augmentation.ok) {
      b.emit(augmentation.reason, "failed", { actorSeat: action.seat });
      b.actionLifecycle.clear(action.seat);
      return false;
    }
    const move = actionMove(b, action),
      definition = b.moveEffects.get(move.effect);
    const retaliation =
      definition.retaliation &&
      b.actionLifecycle.retaliation(action.seat, definition.retaliation);
    let targets = b.targeting.resolve(
      action.seat,
      move,
      retaliation
        ? { kind: "seat", id: retaliation.sourceSeat }
        : action.target,
    );
    if (!targets.length) {
      b.emit("目标已不在场上，行动无法完成。", "failed", {
        actorSeat: action.seat,
      });
      b.actionLifecycle.clear(action.seat);
      b.actionLifecycle.record(action, move.id, false);
      return false;
    }
    const selection = {
      actorSeat: action.seat,
      move,
      targetSeats: targets.map((s) => s.id),
    };
    b.traits?.run("target-selection", selection);
    targets = selection.targetSeats.map((id) => b.roster.seat(id));
    const initial = this.context(action.seat, targets[0].id, move, definition);
    b.phase = "action-permission";
    if (
      definition.supported === false ||
      (!action.skipReadiness && !canAct(initial))
    ) {
      b.actionLifecycle.clear(action.seat);
      b.actionLifecycle.record(action, move.id, false);
      return false;
    }
    initial.action = action;
    if (augmentation) b.augments.commit(action, augmentation);
    const attachment = b.attachments.applyPoint(action, "moveStart");
    if (attachment?.failed) {
      b.emit(attachment.reason, "failed", { actorSeat: action.seat });
      b.actionLifecycle.clear(action.seat);
      b.actionLifecycle.record(action, move.id, false);
      return false;
    }
    if (attachment?.skipped)
      b.emit(attachment.reason, "failed", { actorSeat: action.seat });
    initial.activeAttachments = (action.attachments || [])
      .filter((entry) => entry.committed)
      .map((entry) => entry.id);
    const lifecycle = b.actionLifecycle.begin(action, initial);
    const slot = b.movesFor(action.seat)[action.index];
    let ppCost = augmentation?.cost.pp || 1;
    for (const target of targets)
      if (target.id !== action.seat)
        ppCost =
          b.traits?.calculate("pp-cost", ppCost, {
            ...initial,
            targetSeat: target.id,
          }) ?? ppCost;
    if (slot && !lifecycle.skipPP && !action.skipPP)
      slot.pp = Math.max(0, slot.pp - ppCost);
    if (slot && action.ppClear) slot.pp = 0;
    b.traits?.run("move-start", initial);
    b.phase = "move-start";
    const event = initial.emit(`${b.name(mon)} 使用了 ${move.name}！`, "move", {
      targetSeats: targets.map((s) => s.id),
      move: {
        id: move.id,
        type: move.type,
        power: move.power,
        effect: move.effect,
        successful: true,
        targetResults: [],
      },
    });
    const movePermission = { ...initial, allowed: true };
    b.traits?.run("move-check", movePermission);
    if (
      !movePermission.allowed ||
      (definition.requiresUserStatus &&
        mon.status !== definition.requiresUserStatus)
    ) {
      if (
        definition.requiresUserStatus &&
        mon.status !== definition.requiresUserStatus
      )
        initial.emit("没有效果。", "failed");
      event.move.successful = false;
      b.actionLifecycle.clear(action.seat);
      b.actionLifecycle.record(action, move.id, false);
      return false;
    }
    const interception = this.interception.execute(initial, targets);
    if (interception !== null) {
      event.move.successful = interception;
      b.actionLifecycle.record(action, move.id, interception);
      return interception;
    }
    if (lifecycle.charging) {
      b.moveEffects.run("onCharge", initial);
      initial.emit("正在蓄力！", "charge", {
        actorSeat: action.seat,
        moveId: move.id,
        hidden: b.actionLifecycle.hidden(action.seat),
      });
      b.actionLifecycle.record(action, move.id, true);
      return true;
    }
    if (!definition.beforeDamage?.some((s) => s.op === "streakPower"))
      initial.selfState.fury = 0;
    b.phase = "before-damage";
    b.moveEffects.run("beforeDamage", initial, { scope: "action" });
    initial.drains = [];
    let total = 0,
      successful = false;
    for (const target of targets) {
      if (!(b.roster.occupant(target.id)?.hp > 0)) continue;
      const c = this.context(action.seat, target.id, move, definition);
      c.activeAttachments = initial.activeAttachments;
      c.action = action;
      c.targetCount = targets.length;
      c.targetMode = b.targeting.mode(move);
      c.power = initial.power;
      c.baseMultiplier = initial.baseMultiplier || 1;
      b.phase = "hit-check";
      const visualResult = { seatId: target.id, successful: false };
      event.move.targetResults.push(visualResult);
      if (!this.hits(c)) {
        b.moveEffects.run("onMiss", c);
        continue;
      }
      if (definition.primary) {
        b.traits?.run("primary", c);
        b.phase = "primary";
        c.successful = true;
        b.moveEffects.run("primary", c);
        visualResult.successful = !!c.successful;
        successful ||= c.successful;
        if (c.successful) b.actionLifecycle.recordLand(c);
        continue;
      }
      b.traits?.run("before-damage", c);
      b.phase = "before-damage";
      b.moveEffects.run("beforeDamage", c, { scope: "target" });
      if (!c.skipDamage) this.deal(c);
      successful ||= !!c.successful || c.dealt > 0;
      visualResult.successful = !!c.successful || c.dealt > 0;
      if (visualResult.successful) b.actionLifecycle.recordLand(c);
      total += c.dealt;
      if (c.dealt)
        initial.drains.push({ targetSeat: c.targetSeat, amount: c.dealt });
      b.phase = "after-hit";
      b.moveEffects.run("afterDamage", c, { scope: "target" });
      if (
        c.dealt &&
        !c.substituteHit &&
        c.opponent.hp > 0 &&
        definition.secondary?.length &&
        b.rng.next() * 100 <
          (b.traits?.calculate("secondary-chance", move.chance, c) ??
            move.chance)
      ) {
        const secondary = { ...c, allowed: true };
        b.traits?.run("secondary", secondary);
        if (secondary.allowed) b.moveEffects.run("secondary", c);
      }
      if (mon.hp <= 0) break;
    }
    initial.dealt = total;
    b.phase = "after-action";
    b.moveEffects.run("afterDamage", initial, { scope: "action" });
    b.traits?.run("after-action", { ...initial, completed: true });
    event.move.successful = successful;
    event.move.type = move.type;
    event.move.power = initial.power;
    b.actionLifecycle.after(action, initial, successful);
    return successful;
  }
  hits(c) {
    if (c.definition.target === "self" || c.definition.bypassHitChecks)
      return true;
    const defense = {
      ...c,
      allowed: true,
      outcome: c.targetState.protected ? "protected" : null,
    };
    this.battle.traits?.run("defense-interaction", defense);
    if (defense.outcome === "block" || defense.outcome === "protected") {
      c.missReason = defense.outcome;
      c.emit(
        defense.outcome === "protected" ? "对方保护了自己！" : "被防御住了！",
      );
      return false;
    }
    if (defense.outcome?.kind === "scaledDamage") c.damageScale = defense.outcome;
    const hitPermission = { ...c, allowed: true, guaranteed: false };
    this.battle.traits?.run("hit-check", hitPermission);
    if (!hitPermission.allowed) {
      c.missReason = "hook";
      return false;
    }
    const hidden = this.battle.actionLifecycle.hidden(c.targetSeat);
    if (
      hidden &&
      !hitPermission.guaranteed &&
      !c.definition.hitsHidden?.includes(hidden)
    ) {
      c.missReason = "hidden";
      c.emit("目标暂时无法被攻击！", "failed");
      return false;
    }
    if (hidden) c.power *= c.definition.hiddenMultiplier || 1;
    if (
      c.definition.requiresStatus &&
      c.opponent.status !== c.definition.requiresStatus
    ) {
      c.emit("没有效果。", "failed");
      return false;
    }
    const b = this.battle,
      stages = (c.selfState.stages.acc || 0) - (c.targetState.stages.eva || 0);
    if (
      c.definition.alwaysHits ||
      hitPermission.guaranteed ||
      b.rules.accuracy({
        move: c.move,
        modifier: (accuracy) =>
          b.traits?.calculate("accuracy", accuracy, c) ?? accuracy,
        stages,
        rng: b.rng,
      })
    ) {
      const permission = { ...c, allowed: true };
      this.battle.traits?.run("immunity", permission);
      if (!permission.allowed) {
        c.missReason = "immunity";
        c.emit("没有效果。", "trait");
        return false;
      }
      return true;
    }
    c.missReason = "accuracy";
    c.emit("攻击没有命中！");
    return false;
  }
  deal(c) {
    const b = this.battle,
      options = c.definition.hits || [1],
      hits =
        c.hitPlans?.length ||
        c.definition.hitPowers?.length ||
        (options.length === 1
          ? options[0]
          : options[b.rng.int(options.length)]);
    for (let i = 0; i < hits && c.opponent.hp > 0; i++) {
      if (c.definition.hitPowers) c.power = c.definition.hitPowers[i];
      if (i > 0 && c.definition.accuracyEachHit && !this.hits(c)) break;
      const result = this.damage.roll(c, c.hitPlans?.[i] || null);
      let amount = Math.min(
        Math.max(0, c.opponent.hp - (c.definition.minimumHP || 0)),
        result.type === 0 ? 0 : result.amount,
      );
      const impact = { ...c, amount, allowed: true };
      b.traits?.run("damage", impact);
      amount = impact.amount;
      if (!Number.isInteger(amount) || amount < 0 || amount > c.opponent.hp)
        throw new Error("Invalid impact amount");
      c.opponent.hp -= amount;
      b.actionLifecycle.recordDamage(c, amount);
      c.dealt += amount + (impact.substituteDamage || 0);
      c.realDealt = (c.realDealt || 0) + amount;
      c.substituteHit ||= !!impact.substituteHit;
      b.phase = "damage";
      c.emit(
        `${result.critical ? "击中了要害！ " : ""}${result.type === 0 ? "没有效果。" : result.type > 1 ? "效果拔群！" : result.type < 1 ? "效果不太好…" : "攻击命中了！"}`,
        "hurt",
        {
          targetSeat: c.other,
          hit: i + 1,
          moveId: c.move.id,
          moveType: c.move.type,
          ...(c.hitPlans?.[i] ? { memberUid: c.hitPlans[i].memberUid } : {}),
        },
      );
      b.traits?.run("after-hit", { ...c, amount, hit: i + 1 });
      if (c.move.contact && !impact.substituteHit)
        b.traits?.run("contact", { ...c, amount, hit: i + 1 });
      if (c.mon.hp <= 0) break;
    }
    if (c.targetState.bide) c.targetState.bide.damage += c.realDealt || 0;
  }
}
