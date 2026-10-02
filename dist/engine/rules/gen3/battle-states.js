import { PHYSICAL_TYPES } from "../../model.js";
import { objectSchema } from "../../extensions/values.js";
const empty = objectSchema();
const screen = (physical) => ({
  scope: "side",
  duration: 5,
  schema: empty,
  hooks: [
    {
      phase: "base-damage",
      role: "target",
      priority: -20,
      modify: (value, c) => {
        if (c.critical || PHYSICAL_TYPES.has(c.move.type) !== physical)
          return value;
        const count = c.battle.roster
          .occupied()
          .filter(
            (s) => s.sideId === c.battle.roster.seat(c.targetSeat).sideId,
          ).length;
        return Math.floor(value * (count > 1 ? 2 / 3 : 1 / 2));
      },
    },
  ],
});
/** Third-generation policies; timers and HP costs verified in battle_script_commands.c / battle_util.c. */
export const GEN3_BATTLE_STATES = {
  reflect: screen(true),
  light_screen: screen(false),
  mist: {
    scope: "side",
    duration: 5,
    schema: empty,
    hooks: [
      {
        phase: "stage-check",
        role: "target",
        apply: (c) => {
          if (
            c.amount < 0 &&
            c.sourceSeat &&
            c.battle.roster.isOpposing(c.sourceSeat, c.targetSeat)
          )
            c.allowed = false;
        },
      },
    ],
  },
  taunt: {
    scope: "seat",
    duration: 2,
    clearOn: ["leave", "faint", "end"],
    schema: empty,
    hooks: [
      {
        phase: "move-availability",
        role: "actor",
        modify: (v, c) => (c.move.power === 0 ? 0 : v),
      },
      {
        phase: "move-check",
        role: "actor",
        apply: (c) => {
          if (c.move.power === 0) c.allowed = false;
        },
      },
    ],
  },
  substitute: {
    scope: "seat",
    clearOn: ["leave", "faint", "end"],
    schema: objectSchema(
      { hp: { type: "integer", minimum: 1, maximum: 10000 } },
      ["hp"],
    ),
    hooks: [
      {
        phase: "damage",
        role: "target",
        priority: 10000,
        apply: (c) => {
          if (c.actorSeat === c.targetSeat || !c.amount) return;
          const absorbed = Math.min(c.battleState.data.hp, c.amount),
            remaining = c.battleState.data.hp - absorbed;
          c.substituteDamage = absorbed;
          c.amount = 0;
          c.substituteHit = true;
          c.battle.emit("替身承受了攻击！", "barrier", {
            targetSeat: c.targetSeat,
            amount: absorbed,
          });
          if (remaining)
            c.battle.states.update(c.battleState.key, { hp: remaining });
          else c.battle.states.remove(c.battleState.key, "broken");
        },
      },
      {
        phase: "status-check",
        role: "target",
        apply: (c) => {
          if (c.sourceSeat !== c.targetSeat && c.sourceKind === "move")
            c.allowed = false;
        },
      },
      {
        phase: "confusion-check",
        role: "target",
        apply: (c) => {
          if (c.sourceSeat !== c.targetSeat) c.allowed = false;
        },
      },
      {
        phase: "stage-check",
        role: "target",
        apply: (c) => {
          if (c.amount < 0 && c.sourceSeat !== c.targetSeat) c.allowed = false;
        },
      },
    ],
  },
};
