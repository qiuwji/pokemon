import { objectSchema } from "../../extensions/values.js";
export const GEN3_CONTINUOUS_STATES = {
  uproar: {
    scope: "seat",
    clearOn: ["leave", "faint", "end"],
    schema: objectSchema(),
    hooks: [
      {
        phase: "status-check",
        role: "all",
        apply(c) {
          if (
            c.status === "sleep" &&
            c.battle.traits.ability(c.targetSeat) !== "soundproof"
          )
            c.allowed = false;
        },
      },
      {
        phase: "state-tick",
        role: "owner",
        apply(c) {
          const b = c.battle;
          for (const seat of b.roster.occupied()) {
            const mon = b.roster.occupant(seat.id);
            if (
              mon.hp > 0 &&
              mon.status === "sleep" &&
              b.traits.ability(seat.id) !== "soundproof"
            ) {
              b.statuses.clear(mon);
              const nightmare = b.states.lookup("nightmare", seat.id);
              if (nightmare) b.states.remove(nightmare.key, "awakened");
              c.emit("因吵闹而醒来了！", "heal", { targetSeat: seat.id });
            }
          }
          if (!b.actionLifecycle.locked(c.ownerSeat))
            b.states.remove(c.battleState.key, "finished");
        },
      },
    ],
  },
};
