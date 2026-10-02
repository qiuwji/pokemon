import { effectiveness } from "../model.js";
const fail = (c) => {
  c.skipDamage = true;
  c.successful = false;
  c.emit("没有效果。", "failed");
};
const environmentTypes = {
  grass: "grass",
  long_grass: "grass",
  sand: "ground",
  underwater: "water",
  water: "water",
  pond: "water",
  mountain: "rock",
  cave: "rock",
  building: "normal",
  plain: "normal",
};
const changeTypes = (c, type) => {
  if (!type || c.battle.traits.types(c.actorSeat).includes(type)) {
    fail(c);
    return;
  }
  c.selfState.types = [type];
  c.emit("自身的属性改变了！", "form", { targetSeat: c.actorSeat });
};
export const UTILITY_OPERATIONS = {
  conversion(c) {
    const b = c.battle,
      types = b.traits.types(c.actorSeat),
      choices = b
        .movesFor(c.actorSeat)
        .map((m) =>
          m.id === "curse"
            ? types.includes("ghost")
              ? "ghost"
              : "normal"
            : b.db.moves[m.id].type,
        )
        .filter((type) => !types.includes(type));
    if (!choices.length) fail(c);
    else changeTypes(c, choices[b.rng.int(choices.length)]);
  },
  conversionResistance(c) {
    const b = c.battle,
      hit = b.actionLifecycle.landed.get(c.mon.uid),
      current = b.traits.types(c.actorSeat);
    if (!hit || b.actionLifecycle.hidden(hit.sourceSeat)) {
      fail(c);
      return;
    }
    const choices = Object.keys(b.db.typeChart).filter(
      (type) =>
        !current.includes(type) &&
        effectiveness(hit.type, [type], b.db.typeChart) < 1,
    );
    if (!choices.length) fail(c);
    else changeTypes(c, choices[b.rng.int(choices.length)]);
  },
  camouflage(c) {
    changeTypes(c, environmentTypes[c.battle.environment.terrain]);
  },
  copyAbility(c) {
    const b = c.battle,
      ability = b.traits.ability(c.targetSeat);
    if (!ability || ability === "wonder_guard") {
      fail(c);
      return;
    }
    b.traits.setAbility(c.actorSeat, ability);
    c.emit("复制了对方的特性！", "trait");
  },
  swapAbilities(c) {
    const b = c.battle,
      a = b.traits.ability(c.actorSeat),
      t = b.traits.ability(c.targetSeat);
    if (!a || !t || [a, t].includes("wonder_guard")) {
      fail(c);
      return;
    }
    b.traits.setAbility(c.actorSeat, t);
    b.traits.setAbility(c.targetSeat, a);
    c.emit("双方交换了特性！", "trait");
  },
  recycle(c) {
    if (!c.battle.equipment.recycle(c.mon)) fail(c);
    else c.emit("回收了使用过的道具！", "item");
  },
  swapItems(c) {
    const b = c.battle,
      policy = b.rules.canSteal({
        battle: b,
        actorSeat: c.actorSeat,
        item: c.opponent.heldItem || c.mon.heldItem || "",
      }),
      permission = { ...c, item: c.opponent.heldItem, allowed: true };
    b.traits.run("item-transfer-check", permission);
    if (
      !policy ||
      !permission.allowed ||
      !b.equipment.transferable(c.mon) ||
      !b.equipment.transferable(c.opponent) ||
      (!c.mon.heldItem && !c.opponent.heldItem)
    ) {
      fail(c);
      return;
    }
    [c.mon.heldItem, c.opponent.heldItem] = [
      c.opponent.heldItem,
      c.mon.heldItem,
    ];
    c.selfState.choiceMove = null;
    c.targetState.choiceMove = null;
    c.emit("交换了持有道具！", "item");
  },
  knockOff(c) {
    if (!c.realDealt || !c.opponent.heldItem) return;
    const permission = { ...c, item: c.opponent.heldItem, allowed: true };
    c.battle.traits.run("item-transfer-check", permission);
    if (permission.allowed && c.battle.equipment.knockOff(c.opponent)) {
      c.targetState.choiceMove = null;
      c.emit("打落了持有道具！", "item");
    }
  },
  spite(c) {
    const b = c.battle,
      id = b.actionLifecycle.lastMove(c.targetSeat, { successful: false }),
      slot = b.movesFor(c.targetSeat).find((m) => m.id === id);
    if (!slot || slot.pp <= 1) {
      fail(c);
      return;
    }
    const amount = Math.min(slot.pp, 2 + b.rng.int(4));
    slot.pp -= amount;
    c.emit(`招式 PP 减少了 ${amount}！`, "state");
  },
  firstTurnOnly(c) {
    if (c.battle.turn > c.selfState.entryTurn + 1) fail(c);
  },
  thawTarget(c) {
    if (c.realDealt && c.opponent.status === "freeze")
      c.battle.statuses.clear(c.opponent);
  },
  wakeTarget(c) {
    if (c.realDealt && c.opponent.status === "paralysis")
      c.battle.statuses.clear(c.opponent);
  },
  paralysisPower(c) {
    if (
      c.opponent.status === "paralysis" &&
      !c.battle.states.lookup("substitute", c.targetSeat)
    )
      c.power *= 2;
  },
  triStatus(c) {
    c.battle.applyStatus(
      c.targetSeat,
      ["burn", "freeze", "paralysis"][c.battle.rng.int(3)],
      { sourceSeat: c.actorSeat },
    );
  },
  danceConfusion(c) {
    for (const s of c.battle.roster.occupied())
      if (s.id !== c.actorSeat) c.battle.applyConfusion(s.id, c.actorSeat);
  },
  curse(c) {
    const b = c.battle;
    if (!b.traits.types(c.actorSeat).includes("ghost")) {
      b.changeStage(c.actorSeat, "spe", -1);
      b.changeStage(c.actorSeat, "atk", 1);
      b.changeStage(c.actorSeat, "def", 1);
      return;
    }
    if (
      !b.states.attach("curse", c.targetSeat, {
        sourceSeat: c.actorSeat,
        moveId: c.move.id,
      })
    ) {
      fail(c);
      return;
    }
    c.mon.hp = Math.max(
      0,
      c.mon.hp - Math.max(1, Math.floor(c.mon.stats.hp / 2)),
    );
    c.emit("牺牲体力施下诅咒！", "hurt", { targetSeat: c.actorSeat });
  },
};
