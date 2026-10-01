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
});
export function selectedMove(b, side, index) {
  const mon = b.monster(side);
  return index < 0 ? STRUGGLE : b.db.moves[mon.moves[index].id];
}
/** Executes one prepared move. Round order, replacements and experience are elsewhere. */
export class MoveExecutor {
  constructor(battle) {
    this.battle = battle;
  }
  execute(side, index) {
    const b = this.battle,
      mon = b.monster(side),
      opponent = b.monster(1 - side);
    if (!mon || !opponent || mon.hp <= 0 || opponent.hp <= 0) return;
    const slot = mon.moves[index],
      move = selectedMove(b, side, index),
      definition = b.moveEffects.get(move.effect);
    const c = {
      battle: b,
      side,
      other: 1 - side,
      actorSeat: b.seatId(side),
      targetSeat: b.seatId(1 - side),
      mon,
      opponent,
      move,
      definition,
      power: move.power,
      dealt: 0,
      selfState: b.conditions.get(b.seatId(side)),
      targetState: b.conditions.get(b.seatId(1 - side)),
    };
    c.emit = (text, kind, extra) =>
      b.emit(text, kind, {
        actorSeat: c.actorSeat,
        targetSeat: definition.target === "self" ? c.actorSeat : c.targetSeat,
        ...extra,
      });
    if (definition.supported === false || !canAct(c)) return;
    if (slot) slot.pp--;
    const event = c.emit(`${b.name(mon)} 使用了 ${move.name}！`, "move", {
      side,
      move: {
        id: slot?.id || "struggle",
        type: move.type,
        power: move.power,
        effect: move.effect,
      },
    });
    if (!this.hits(c)) {
      event.move.successful = false;
      return;
    }
    if (!definition.beforeDamage?.some((s) => s.op === "streakPower"))
      c.selfState.fury = 0;
    if (definition.primary) {
      b.moveEffects.run("primary", c);
      return;
    }
    b.moveEffects.run("beforeDamage", c);
    this.deal(c);
    b.moveEffects.run("afterDamage", c);
    if (
      c.dealt &&
      opponent.hp > 0 &&
      definition.secondary?.length &&
      opponent.ability !== "shield_dust" &&
      b.rng.next() * 100 < move.chance
    )
      b.moveEffects.run("secondary", c);
  }
  hits(c) {
    if (c.definition.target === "self") return true;
    if (c.targetState.protected) {
      c.emit("对方保护了自己！");
      return false;
    }
    const stages =
        (c.selfState.stages.acc || 0) - (c.targetState.stages.eva || 0),
      b = this.battle;
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
      options = c.definition.hits || [1];
    const hits =
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
      const result = b.rules.damage(c.mon, c.opponent, c.move, b.db, b.rng, {
        aStages: c.selfState.stages,
        dStages: c.targetState.stages,
        critical,
        power,
      });
      const amount = Math.min(
        Math.max(0, c.opponent.hp - (c.definition.minimumHP || 0)),
        result.amount,
      );
      c.opponent.hp -= amount;
      c.dealt += amount;
      c.emit(
        `${result.critical ? "击中了要害！ " : ""}${result.type === 0 ? "没有效果。" : result.type > 1 ? "效果拔群！" : result.type < 1 ? "效果不太好…" : "攻击命中了！"}`,
        "hurt",
        { side: c.other },
      );
    }
    if (c.targetState.bide) c.targetState.bide.damage += c.dealt;
  }
}
