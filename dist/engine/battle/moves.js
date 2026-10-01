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
    const other =
      targetSeat === actorSeat
        ? b.roster.opposing(actorSeat)[0]?.id || actorSeat
        : targetSeat;
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
    const move = selectedMove(b, action.seat, action.index),
      definition = b.moveEffects.get(move.effect);
    let targets = b.targeting.resolve(action.seat, move, action.target);
    if (!targets.length) {
      b.emit("目标已不在场上，行动无法完成。", "failed", {
        actorSeat: action.seat,
      });
      return;
    }
    const initial = this.context(action.seat, targets[0].id, move, definition);
    b.phase = "action-permission";
    if (definition.supported === false || !canAct(initial)) return;
    const slot = mon.moves[action.index];
    if (slot) slot.pp--;
    b.phase = "move-start";
    const event = initial.emit(`${b.name(mon)} 使用了 ${move.name}！`, "move", {
      targetSeats: targets.map((s) => s.id),
      move: {
        id: slot?.id || "struggle",
        type: move.type,
        power: move.power,
        effect: move.effect,
        successful: true,
      },
    });
    if (!definition.beforeDamage?.some((s) => s.op === "streakPower"))
      initial.selfState.fury = 0;
    b.phase = "before-damage";
    b.moveEffects.run("beforeDamage", initial, { scope: "action" });
    let total = 0,
      successful = false;
    for (const target of targets) {
      if (!(b.roster.occupant(target.id)?.hp > 0)) continue;
      const c = this.context(action.seat, target.id, move, definition);
      c.targetCount = targets.length;
      c.targetMode = b.targeting.mode(move);
      c.power = initial.power;
      b.phase = "hit-check";
      if (!this.hits(c)) continue;
      successful = true;
      if (definition.primary) {
        b.phase = "primary";
        b.moveEffects.run("primary", c);
        continue;
      }
      b.phase = "before-damage";
      b.moveEffects.run("beforeDamage", c, { scope: "target" });
      this.deal(c);
      total += c.dealt;
      b.phase = "after-hit";
      b.moveEffects.run("afterDamage", c, { scope: "target" });
      if (
        c.dealt &&
        c.opponent.hp > 0 &&
        definition.secondary?.length &&
        c.opponent.ability !== "shield_dust" &&
        b.rng.next() * 100 < move.chance
      ) {
        b.phase = "secondary";
        b.moveEffects.run("secondary", c);
      }
    }
    initial.dealt = total;
    b.phase = "after-action";
    b.moveEffects.run("afterDamage", initial, { scope: "action" });
    event.move.successful = successful;
  }
  hits(c) {
    if (c.definition.target === "self") return true;
    if (c.targetState.protected) {
      c.emit("对方保护了自己！");
      return false;
    }
    const b = this.battle,
      stages = (c.selfState.stages.acc || 0) - (c.targetState.stages.eva || 0);
    if (
      c.definition.alwaysHits ||
      b.rules.accuracy({ move: c.move, stages, rng: b.rng })
    )
      return true;
    c.emit("攻击没有命中！");
    return false;
  }
  deal(c) {
    const b = this.battle,
      options = c.definition.hits || [1],
      hits =
        options.length === 1 ? options[0] : options[b.rng.int(options.length)];
    for (let i = 0; i < hits && c.opponent.hp > 0; i++) {
      const critical = b.rules.critical({
        stage: (c.selfState.focus ? 2 : 0) + (c.definition.criticalStage || 0),
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
      });
      const amount = Math.min(
        Math.max(0, c.opponent.hp - (c.definition.minimumHP || 0)),
        result.amount,
      );
      c.opponent.hp -= amount;
      c.dealt += amount;
      b.phase = "damage";
      c.emit(
        `${result.critical ? "击中了要害！ " : ""}${result.type === 0 ? "没有效果。" : result.type > 1 ? "效果拔群！" : result.type < 1 ? "效果不太好…" : "攻击命中了！"}`,
        "hurt",
        { targetSeat: c.other, hit: i + 1 },
      );
    }
    if (c.targetState.bide) c.targetState.bide.damage += c.dealt;
  }
}
