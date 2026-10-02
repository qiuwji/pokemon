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
  const mon = b.monster(seat);
  return index < 0 ? STRUGGLE : b.db.moves[mon.moves[index].id];
}
/** Executes one action across live targets; PP/readiness and actor effects occur once per action. */
export class MoveExecutor {
  constructor(battle) {
    this.battle = battle;
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
    if (!(mon?.hp > 0)) return;
    const move = {
        ...selectedMove(b, action.seat, action.index),
        id: mon.moves[action.index]?.id || "struggle",
      },
      definition = b.moveEffects.get(move.effect);
    let targets = b.targeting.resolve(action.seat, move, action.target);
    if (!targets.length) {
      b.emit("目标已不在场上，行动无法完成。", "failed", {
        actorSeat: action.seat,
      });
      return;
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
    if (definition.supported === false || !canAct(initial)) return;
    const slot = mon.moves[action.index];
    let ppCost = 1;
    for (const target of targets)
      if (target.id !== action.seat)
        ppCost =
          b.traits?.calculate("pp-cost", ppCost, {
            ...initial,
            targetSeat: target.id,
          }) ?? ppCost;
    if (slot) slot.pp = Math.max(0, slot.pp - ppCost);
    b.traits?.run("move-start", initial);
    b.phase = "move-start";
    const event = initial.emit(`${b.name(mon)} 使用了 ${move.name}！`, "move", {
      targetSeats: targets.map((s) => s.id),
      move: {
        id: slot?.id || "struggle",
        type: move.type,
        power: move.power,
        effect: move.effect,
        successful: true,
        targetResults: [],
      },
    });
    const movePermission = { ...initial, allowed: true };
    b.traits?.run("move-check", movePermission);
    if (!movePermission.allowed) {
      event.move.successful = false;
      return;
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
      c.targetCount = targets.length;
      c.targetMode = b.targeting.mode(move);
      c.power = initial.power;
      b.phase = "hit-check";
      const visualResult = { seatId: target.id, successful: false };
      event.move.targetResults.push(visualResult);
      if (!this.hits(c)) continue;
      if (definition.primary) {
        b.traits?.run("primary", c);
        b.phase = "primary";
        c.successful = true;
        b.moveEffects.run("primary", c);
        visualResult.successful = !!c.successful;
        successful ||= c.successful;
        continue;
      }
      successful = true;
      b.traits?.run("before-damage", c);
      b.phase = "before-damage";
      b.moveEffects.run("beforeDamage", c, { scope: "target" });
      this.deal(c);
      visualResult.successful = c.dealt > 0;
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
  }
  hits(c) {
    if (c.definition.target === "self") return true;
    if (c.targetState.protected) {
      c.emit("对方保护了自己！");
      return false;
    }
    if (
      c.definition.requiresStatus &&
      c.opponent.status !== c.definition.requiresStatus
    ) {
      c.emit("没有效果。", "failed");
      return false;
    }
    const hitPermission = { ...c, allowed: true };
    this.battle.traits?.run("hit-check", hitPermission);
    if (!hitPermission.allowed) return false;
    const b = this.battle,
      stages = (c.selfState.stages.acc || 0) - (c.targetState.stages.eva || 0);
    if (
      c.definition.alwaysHits ||
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
        c.emit("没有效果。", "trait");
        return false;
      }
      return true;
    }
    c.emit("攻击没有命中！");
    return false;
  }
  deal(c) {
    const b = this.battle,
      options = c.definition.hits || [1],
      hits =
        options.length === 1 ? options[0] : options[b.rng.int(options.length)];
    for (let i = 0; i < hits && c.opponent.hp > 0; i++) {
      const criticalPermission = { ...c, allowed: true };
      b.traits?.run("critical-check", criticalPermission);
      const critical =
        criticalPermission.allowed &&
        b.rules.critical({
          stage:
            b.traits?.calculate(
              "critical-stage",
              (c.selfState.focus ? 2 : 0) + (c.definition.criticalStage || 0),
              c,
            ) ??
            (c.selfState.focus ? 2 : 0) + (c.definition.criticalStage || 0),
          rng: b.rng,
          chances: b.rules.criticalChances,
        });
      const power = b.rules.environmentPower({
        power: c.power,
        type: c.move.type,
        waterSport: b.waterSport,
        mudSport: b.mudSport,
      });
      const spread =
        c.targetMode === "opponents" && c.targetCount > 1 ? 0.5 : 1;
      const result = b.rules.damage(c.mon, c.opponent, c.move, b.db, b.rng, {
        aStages: c.selfState.stages,
        dStages: c.targetState.stages,
        critical,
        power,
        spread,
        modifier: (phase, value, formula) =>
          b.traits?.calculate(phase, value, { ...c, ...formula }) ?? value,
        attackerTypes: b.traits?.types(c.actorSeat),
        defenderTypes: b.traits?.types(c.targetSeat),
      });
      let amount = Math.min(
        Math.max(0, c.opponent.hp - (c.definition.minimumHP || 0)),
        result.amount,
      );
      const impact = { ...c, amount, allowed: true };
      b.traits?.run("damage", impact);
      amount = impact.amount;
      if (!Number.isInteger(amount) || amount < 0 || amount > c.opponent.hp)
        throw new Error("Invalid impact amount");
      c.opponent.hp -= amount;
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
