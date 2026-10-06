import { objectSchema } from "../../extensions/values.js";
const empty = objectSchema();
const seat = {
  scope: "seat",
  clearOn: ["leave", "faint", "end"],
  schema: empty,
};
const moveData = objectSchema({ moveId: { type: "string", minLength: 1 } }, [
  "moveId",
]);
const blocked = (when) => [
  {
    phase: "move-availability",
    role: "actor",
    modify: (v, c) => (when(c) ? 0 : v),
  },
  {
    phase: "move-check",
    role: "actor",
    apply: (c) => {
      if (when(c)) c.allowed = false;
    },
  },
];
const periodic = (op, fraction, when = () => true) => ({
  phase: "state-tick",
  role: "owner",
  when,
  effects: [{ op, fraction }],
});
const preventLeaving = (c) => {
  c.allowed = false;
};
const expired = (c) => c.reason === "expired";
const hostile = (c) => c.sourceSeat && c.sourceSeat !== c.targetSeat;
const viableEncore = (c) =>
  c.battle
    .movesFor(c.ownerSeat)
    .findIndex((m) => m.id === c.battleState.data.moveId && m.pp > 0);
/** Policies verified against the fixed reference's script commands and end-turn counters. */
export const GEN3_CONTROL_STATES = {
  disable: {
    ...seat,
    schema: moveData,
    hooks: blocked((c) => c.move.id === c.battleState.data.moveId),
  },
  encore: {
    ...seat,
    schema: moveData,
    hooks: [
      ...blocked(
        (c) => viableEncore(c) >= 0 && c.move.id !== c.battleState.data.moveId,
      ),
      {
        phase: "selected-move",
        role: "actor",
        modify: (v, c) => (viableEncore(c) < 0 ? v : viableEncore(c)),
      },
      {
        phase: "state-tick",
        role: "owner",
        apply: (c) => {
          if (viableEncore(c) < 0)
            c.battle.states.remove(c.battleState.key, "depleted");
        },
      },
    ],
  },
  torment: {
    ...seat,
    hooks: blocked(
      (c) =>
        c.move.id !== "struggle" &&
        c.move.id ===
          c.battle.actionLifecycle.lastMove(c.actorSeat, { successful: false }),
    ),
  },
  mean_look: {
    ...seat,
    clearWithSource: true,
    transferOn: ["baton_pass"],
    sourceTransferOn: ["baton_pass"],
    hooks: [
      {
        phase: "switch-check",
        role: "actor",
        apply: (c) => {
          if (!c.forced) preventLeaving(c);
        },
      },
      { phase: "escape-check", role: "actor", apply: preventLeaving },
    ],
  },
  lock_on: {
    ...seat,
    duration: 2,
    clearWithSource: true,
    transferOn: ["baton_pass"],
    sourceTransferOn: ["baton_pass"],
    sourceTransferDuration: 2,
    hooks: [
      {
        phase: "hit-check",
        role: "target",
        apply: (c) => {
          if (
            c.battle.roster.occupant(c.actorSeat)?.uid ===
            c.battleState.source.uid
          )
            c.guaranteed = true;
        },
      },
    ],
  },
  safeguard: {
    scope: "side",
    duration: 5,
    schema: empty,
    hooks: [
      {
        phase: "status-check",
        role: "target",
        apply: (c) => {
          if (hostile(c) && c.sourceKind === "move") c.allowed = false;
        },
      },
      {
        phase: "confusion-check",
        role: "target",
        apply: (c) => {
          if (hostile(c)) c.allowed = false;
        },
      },
    ],
  },
  yawn: {
    ...seat,
    duration: 2,
    hooks: [
      {
        phase: "state-removed",
        role: "owner",
        when: expired,
        apply: (c) => {
          c.battle.applyStatus(c.ownerSeat, "sleep", {
            sourceSeat: c.battleState.source.seat,
            sourceKind: "move",
          });
        },
      },
    ],
  },
  wish: {
    scope: "seat",
    duration: 2,
    schema: empty,
    hooks: [
      {
        phase: "state-removed",
        role: "owner",
        when: expired,
        effects: [{ op: "traitHeal", fraction: 0.5 }],
      },
    ],
  },
  ingrain: {
    transferOn: ["baton_pass"],
    ...seat,
    hooks: [
      periodic("traitHeal", 1 / 16),
      { phase: "switch-check", role: "actor", apply: preventLeaving },
      {
        phase: "switch-check",
        role: "target",
        apply: (c) => {
          if (c.forced) preventLeaving(c);
        },
      },
      { phase: "escape-check", role: "actor", apply: preventLeaving },
    ],
  },
  nightmare: {
    ...seat,
    hooks: [
      periodic("traitHurt", 1 / 4, (c) => c.owner.status === "sleep"),
      {
        phase: "state-tick",
        role: "owner",
        apply: (c) => {
          if (c.owner.status !== "sleep")
            c.battle.states.remove(c.battleState.key, "awakened");
        },
      },
    ],
  },
  leech_seed: {
    transferOn: ["baton_pass"],
    ...seat,
    hooks: [
      {
        phase: "state-tick",
        role: "owner",
        apply: (c) => {
          const b = c.battle,
            source = c.battleState.source.seat,
            receiver = b.roster.occupant(source);
          if (!(receiver?.hp > 0) || !(c.owner.hp > 0)) return;
          const amount = Math.min(
            c.owner.hp,
            Math.max(1, Math.floor(c.owner.stats.hp / 8)),
          );
          b.moveEffects.operations.run([{ op: "traitHurt", amount }], c);
          const permission = {
            actorSeat: source,
            targetSeat: c.ownerSeat,
            reverseDrain: false,
          };
          b.traits.run("drain-check", permission);
          b.moveEffects.operations.run(
            [
              {
                op: permission.reverseDrain ? "traitHurt" : "traitHeal",
                amount,
              },
            ],
            { ...c, owner: receiver, ownerSeat: source },
          );
        },
      },
    ],
  },
  perish_song: {
    transferOn: ["baton_pass"],
    ...seat,
    duration: 4,
    hooks: [
      {
        phase: "state-tick",
        role: "owner",
        apply: (c) =>
          c.emit(`灭亡计数：${c.battleState.remaining - 1}`, "state", {
            targetSeat: c.ownerSeat,
          }),
      },
      {
        phase: "state-removed",
        role: "owner",
        when: expired,
        apply: (c) => {
          c.owner.hp = 0;
          c.emit("灭亡之歌的效果结束了！", "hurt", { targetSeat: c.ownerSeat });
        },
      },
    ],
  },
  spikes: {
    scope: "side",
    stack: "add",
    maxStacks: 3,
    schema: empty,
    hooks: [
      {
        phase: "switch-in",
        role: "target",
        priority: -1000,
        when: (c) =>
          !c.battle.traits.types(c.ownerSeat).includes("flying") &&
          c.battle.traits.ability(c.ownerSeat) !== "levitate",
        effects: (c) => [
          { op: "traitHurt", fraction: 1 / ((5 - c.battleState.stacks) * 2) },
        ],
      },
    ],
  },
};
