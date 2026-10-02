import { effectiveness } from "../model.js";
import { executeCalledMove } from "./called-moves.js";
/** Special move operations use the same validated effect registry as ordinary attacks. */
export const SPECIAL_MOVE_OPERATIONS = {
  copyLastMove(c) {
    const b = c.battle,
      id = b.actionLifecycle.lastMove(c.targetSeat);
    if (
      !id ||
      b.db.moves[id].effect === "mirror_move"
    ) {
      c.successful = false;
      c.emit("没有可模仿的招式！", "failed");
      return;
    }
    c.successful = executeCalledMove(c, id, {
      target: { kind: "seat", id: c.targetSeat },
    });
  },
  futureAttack(c, s) {
    const b = c.battle;
    // Gen III snapshots base damage at cast time; STAB/type/random/critical are absent here.
    const amount = b.rules.damage(
      b.forms.effective(c.mon),
      b.forms.effective(c.opponent),
      c.move,
      b.db,
      { int: () => 15 },
      {
        aStages: c.selfState.stages,
        dStages: c.targetState.stages,
        critical: false,
        attackerTypes: [],
        defenderTypes: [],
        modifier: (phase, v, formula) =>
          b.traits.calculate(phase, v, { ...c, ...formula }),
      },
    ).amount;
    if (
      !b.actionLifecycle.schedule({
        targetSeat: c.targetSeat,
        sourceSeat: c.actorSeat,
        move: c.move,
        amount,
        delay: s.delay,
      })
    ) {
      c.successful = false;
      c.emit("该目标已有预知攻击！", "failed");
    }
  },
  createSubstitute(c) {
    const cost = Math.max(1, Math.floor(c.mon.stats.hp / 4));
    if (c.mon.hp <= cost || c.battle.states.lookup("substitute", c.actorSeat)) {
      c.successful = false;
      c.emit("无法制造替身。", "failed");
      return;
    }
    c.battle.states.attach("substitute", c.actorSeat, {
      data: { hp: cost },
      sourceSeat: c.actorSeat,
      moveId: c.move.id,
    });
    c.mon.hp -= cost;
    c.selfState.traps = 0;
    c.emit("制造了替身！", "barrier", { targetSeat: c.actorSeat });
  },
  forceSwitch(c) {
    const b = c.battle;
    const permission = { ...c, forced: true, allowed: true };
    b.traits.run("switch-check", permission);
    if (!permission.allowed) {
      c.emit("对方留在了原地。", "failed");
      return;
    }
    const options = b.roster.bench(c.targetSeat);
    if (b.trainer && !options.length) {
      c.emit("没有可以替换的伙伴。", "failed");
      return;
    }
    if (
      c.mon.level < c.opponent.level &&
      Math.floor((b.rng.int(256) * (c.mon.level + c.opponent.level)) / 256) +
        1 <=
        Math.floor(c.opponent.level / 4)
    ) {
      c.emit("没有效果。", "failed");
      return;
    }
    if (!b.trainer) {
      b.finish("escaped");
      c.emit("对方离开了战斗。", "end");
    } else
      b.actions.switch(c.targetSeat, options[b.rng.int(options.length)].index);
  },
  stealItem(c) {
    const b = c.battle,
      item = c.opponent.heldItem;
    if (
      !c.dealt ||
      c.mon.heldItem ||
      !item ||
      !b.equipment.transferable(c.mon) ||
      !b.equipment.transferable(c.opponent) ||
      !b.rules.canSteal({ battle: b, actorSeat: c.actorSeat, item })
    )
      return;
    const permission = { ...c, item, allowed: true };
    b.traits.run("item-transfer-check", permission);
    if (!permission.allowed) {
      c.emit("道具没有被夺走。", "trait");
      return;
    }
    c.mon.heldItem = item;
    c.opponent.heldItem = null;
    c.targetState.choiceMove = null;
    c.emit("夺取了对方的道具！", "item", { itemId: item });
  },
  selfFaint(c) {
    c.mon.hp = 0;
    c.emit("耗尽了体力。", "hurt", { targetSeat: c.actorSeat });
  },
  ohko(c) {
    if (
      effectiveness(
        c.move.type,
        c.battle.traits.types(c.targetSeat),
        c.battle.db.typeChart,
      ) === 0 ||
      c.mon.level < c.opponent.level ||
      c.battle.rng.int(100) + 1 >=
        c.move.accuracy + c.mon.level - c.opponent.level
    ) {
      c.successful = false;
      c.emit("攻击没有命中！", "failed");
      return;
    }
    const impact = { ...c, amount: c.opponent.hp, allowed: true };
    c.battle.traits.run("damage", impact);
    c.opponent.hp -= impact.amount;
    c.dealt = impact.amount;
    c.emit("一击击倒！", "hurt", { targetSeat: c.targetSeat });
    c.battle.traits.run("after-hit", { ...c, amount: impact.amount, hit: 1 });
  },
  weatherHeal(c) {
    const weather = c.battle.traits.weather();
    c.registry.run(
      [
        {
          op: "restoreHP",
          fraction: weather === "sun" ? 2 / 3 : weather ? 1 / 4 : 1 / 2,
        },
      ],
      c,
    );
  },
};
SPECIAL_MOVE_OPERATIONS.selfFaint.scope = "action";

SPECIAL_MOVE_OPERATIONS.futureAttack.validate = (s) => {
  if (!Number.isInteger(s.delay) || s.delay < 1 || s.delay > 10000)
    throw new Error("Invalid delayed move turns");
};
