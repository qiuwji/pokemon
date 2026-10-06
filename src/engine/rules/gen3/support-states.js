import { objectSchema } from "../../extensions/values.js";
const empty = objectSchema();
const seat = {
  scope: "seat",
  clearOn: ["leave", "faint", "end"],
  schema: empty,
};
const untilNextAttempt = () => ({
  phase: "action-permission",
  role: "actor",
  priority: -1000,
  apply: (c) => c.battle.states.remove(c.battleState.key, "next-action"),
});
const lethalSource = (c) => {
  const r = c.battle.actionLifecycle.damageFor(c.ownerSeat);
  return r?.lethal &&
    c.battle.roster.occupant(r.sourceSeat)?.uid === r.sourceUid &&
    c.battle.roster.isOpposing(c.ownerSeat, r.sourceSeat)
    ? r
    : null;
};
export const GEN3_SUPPORT_STATES = {
  charge: {
    ...seat,
    duration: 2,
    stack: "refresh",
    hooks: [
      {
        phase: "pre-type-damage",
        role: "actor",
        modify: (v, c) => (c.move.type === "electric" ? v * 2 : v),
      },
    ],
  },
  helping_hand: {
    ...seat,
    duration: 1,
    hooks: [
      {
        phase: "pre-type-damage",
        role: "actor",
        modify: (v) => Math.floor((v * 15) / 10),
      },
    ],
  },
  follow_me: {
    ...seat,
    duration: 1,
    hooks: [
      {
        phase: "target-selection",
        role: "all",
        priority: -1000,
        apply: (c) => {
          if (
            !(c.owner.hp > 0) ||
            !c.battle.roster.isOpposing(c.actorSeat, c.ownerSeat) ||
            !["selected", "random"].includes(c.battle.targeting.mode(c.move))
          )
            return;
          c.targetSeats = [c.ownerSeat];
          c.redirected = true;
        },
      },
    ],
  },
  rage: {
    ...seat,
    stack: "refresh",
    hooks: [
      {
        phase: "action-permission",
        role: "actor",
        apply: (c) => {
          if (c.move.effect !== "rage")
            c.battle.states.remove(c.battleState.key, "next-move");
        },
      },
      {
        phase: "after-hit",
        role: "target",
        when: (c) => c.amount > 0 && c.owner.hp > 0,
        effects: [{ op: "traitStage", changes: { atk: 1 } }],
      },
    ],
  },
  destiny_bond: {
    ...seat,
    stack: "refresh",
    hooks: [
      untilNextAttempt(),
      {
        phase: "faint",
        role: "target",
        apply: (c) => {
          const r = lethalSource(c);
          if (!r) return;
          c.battle.roster.occupant(r.sourceSeat).hp = 0;
          c.emit("同命让对手也倒下了！", "hurt", { targetSeat: r.sourceSeat });
        },
      },
    ],
  },
  grudge: {
    ...seat,
    stack: "refresh",
    hooks: [
      untilNextAttempt(),
      {
        phase: "faint",
        role: "target",
        apply: (c) => {
          const r = lethalSource(c);
          if (!r || r.moveId === "struggle") return;
          const slot = c.battle
            .movesFor(r.sourceSeat)
            .find((m) => m.id === r.moveId);
          if (slot) {
            slot.pp = 0;
            c.emit("怨念耗尽了对手招式的 PP！", "state", {
              targetSeat: r.sourceSeat,
            });
          }
        },
      },
    ],
  },
};
