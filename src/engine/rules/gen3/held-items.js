import { matchesStatus } from "../../creatures/status.js";
import { ITEM_METADATA } from "../../../../generated/engine/rules/gen3/item-metadata.js";
import { HELD_ITEM_METADATA } from "../../../../generated/engine/rules/gen3/held-catalog.js";
import { natureMultiplier } from "../../model.js";
/** Hold effects are declarative phase attachments, not a second battle dispatcher. */
export const HOLD_EFFECTS = {};
const define = (effect, hooks) =>
  (HOLD_EFFECTS[effect] = { hooks, coverage: "implemented" });
const berryPhases = [
  "entry",
  "after-hit",
  "after-action",
  "status-applied",
  "stage-applied",
  "confusion-applied",
  "attraction-applied",
  "round-end",
];
const berry = (when, effects) =>
  berryPhases.map((phase) => ({
    phase,
    role: [
      "after-hit",
      "status-applied",
      "stage-applied",
      "confusion-applied",
      "attraction-applied",
    ].includes(phase)
      ? "target"
      : phase === "after-action"
        ? "actor"
        : "owner",
    when: (c) => c.owner.hp > 0 && when(c),
    effects: (c) => [
      { op: "consume" },
      ...(typeof effects === "function" ? effects(c) : effects),
    ],
  }));
const param = (c) => c.attachment.parameter;
const state = (c) => c.battle.conditions.get(c.ownerSeat);
define(
  "restore_hp",
  berry(
    (c) => c.owner.hp <= Math.floor(c.owner.stats.hp / 2),
    (c) => [{ op: "traitHeal", amount: param(c) }],
  ),
);
for (const [effect, status] of Object.entries({
  cure_par: "paralysis",
  cure_slp: "sleep",
  cure_psn: "poison",
  cure_brn: "burn",
  cure_frz: "freeze",
}))
  define(
    effect,
    berry(
      (c) =>
        c.owner.status &&
        (status === "any" || matchesStatus(c.owner.status, status)),
      [{ op: "cureStatus", status }],
    ),
  );
define(
  "cure_status",
  berry(
    (c) => Boolean(c.owner.status || state(c).confused),
    (c) => {
      state(c).confused = 0;
      return [{ op: "cureStatus", status: "any" }];
    },
  ),
);
define(
  "restore_pp",
  berry(
    (c) => c.owner.moves.some((m) => m.pp === 0),
    (c) => {
      const slot = c.owner.moves.find((m) => m.pp === 0);
      slot.pp = Math.min(c.battle.db.moves[slot.id].pp, param(c));
      c.emit("招式 PP 恢复了！", "item");
      return [];
    },
  ),
);
define(
  "cure_confusion",
  berry(
    (c) => state(c).confused > 0,
    (c) => {
      state(c).confused = 0;
      c.emit("混乱解除了！", "item");
      return [];
    },
  ),
);
for (const [effect, flavorStat] of Object.entries({
  confuse_spicy: "atk",
  confuse_dry: "spa",
  confuse_sweet: "spe",
  confuse_bitter: "spd",
  confuse_sour: "def",
}))
  define(
    effect,
    berry(
      (c) => c.owner.hp <= Math.floor(c.owner.stats.hp / 2),
      (c) => {
        if (natureMultiplier(c.owner.nature, flavorStat) < 1) {
          const permission = { targetSeat: c.ownerSeat, allowed: true };
          c.battle.traits.run("confusion-check", permission);
          if (permission.allowed) state(c).confused = 2 + c.battle.rng.int(4);
        }
        return [{ op: "traitHeal", fraction: 1 / param(c) }];
      },
    ),
  );
for (const [effect, key] of Object.entries({
  attack_up: "atk",
  defense_up: "def",
  speed_up: "spe",
  sp_attack_up: "spa",
  sp_defense_up: "spd",
}))
  define(
    effect,
    berry(
      (c) =>
        c.owner.hp <= Math.floor(c.owner.stats.hp / param(c)) &&
        (state(c).stages[key] || 0) < 6,
      [{ op: "traitStage", changes: { [key]: 1 } }],
    ),
  );
define(
  "critical_up",
  berry(
    (c) =>
      c.owner.hp <= Math.floor(c.owner.stats.hp / param(c)) && !state(c).focus,
    (c) => {
      state(c).focus = true;
      return [];
    },
  ),
);
define(
  "random_stat_up",
  berry(
    (c) =>
      c.owner.hp <= Math.floor(c.owner.stats.hp / param(c)) &&
      ["atk", "def", "spa", "spd", "spe"].some(
        (k) => (state(c).stages[k] || 0) < 6,
      ),
    (c) => {
      const keys = ["atk", "def", "spa", "spd", "spe"].filter(
        (k) => (state(c).stages[k] || 0) < 6,
      );
      return [
        {
          op: "traitStage",
          changes: { [keys[c.battle.rng.int(keys.length)]]: 2 },
        },
      ];
    },
  ),
);
define(
  "restore_stats",
  berry(
    (c) => Object.values(state(c).stages).some((v) => v < 0),
    (c) => {
      for (const key of Object.keys(state(c).stages))
        if (state(c).stages[key] < 0) state(c).stages[key] = 0;
      c.emit("降低的能力恢复了！", "item");
      return [];
    },
  ),
);
define(
  "cure_attract",
  berry(
    (c) => Boolean(state(c).attractedTo),
    (c) => {
      state(c).attractedTo = null;
      return [];
    },
  ),
);
define("leftovers", [
  {
    phase: "round-end",
    role: "owner",
    when: (c) => c.owner.hp > 0 && c.owner.hp < c.owner.stats.hp,
    effects: [{ op: "traitHeal", fraction: 1 / 16 }],
  },
]);
define("shell_bell", [
  {
    phase: "after-action",
    role: "actor",
    when: (c) => c.dealt > 0 && c.owner.hp > 0 && c.completed === true,
    effects: (c) => [
      { op: "traitHeal", amount: Math.max(1, Math.floor(c.dealt / param(c))) },
    ],
  },
]);
define("evasion_up", [
  {
    phase: "accuracy",
    priority: 40,
    role: "target",
    modify: (v, c) => Math.floor((v * (100 - param(c))) / 100),
  },
]);
define("macho_brace", [
  { phase: "speed", role: "actor", modify: (v) => Math.floor(v / 2) },
  { phase: "ev-modifier", role: "actor", modify: (v) => v * 2 },
]);
define("quick_claw", [
  {
    phase: "action-order",
    role: "actor",
    modify: (v, c) => (c.orderRoll < param(c) ? v + 1 : v),
  },
]);
define("choice_band", [
  {
    phase: "move-availability",
    role: "actor",
    modify: (value, c) =>
      state(c).choiceMove && state(c).choiceMove !== c.move.id ? 0 : value,
  },
  {
    phase: "attack",
    priority: 30,
    role: "actor",
    modify: (v, c) => (c.stat === "atk" ? Math.floor(v * 1.5) : v),
  },
  {
    phase: "move-start",
    role: "actor",
    apply: (c) => {
      state(c).choiceMove = c.move.id || c.slotId;
    },
  },
]);
define("focus_band", [
  {
    phase: "damage-preview",
    role: "target",
    modify: (v, c) =>
      !c.substitute &&
      v >= c.owner.hp &&
      c.owner.hp > 0 &&
      c.battle.rng.next() * 100 < param(c)
        ? c.owner.hp - 1
        : v,
  },
  {
    phase: "damage",
    role: "target",
    when: (c) =>
      c.amount >= c.owner.hp &&
      c.owner.hp > 0 &&
      c.battle.rng.next() * 100 < param(c),
    apply: (c) => {
      c.amount = c.owner.hp - 1;
      c.emit("坚持住了！", "item");
    },
  },
]);
define("scope_lens", [
  { phase: "critical-stage", role: "actor", modify: (v) => v + 1 },
]);
for (const [effect, species, boost] of [
  ["lucky_punch", ["chansey"], 2],
  ["stick", ["farfetchd"], 2],
])
  define(effect, [
    {
      phase: "critical-stage",
      role: "actor",
      modify: (v, c) => (species.includes(c.owner.species) ? v + boost : v),
    },
  ]);
define("flinch", [
  {
    phase: "after-hit",
    role: "actor",
    when: (c) =>
      c.amount > 0 &&
      c.opponent.hp > 0 &&
      c.move.flags?.includes("FLAG_KINGS_ROCK_AFFECTED") &&
      c.battle.rng.next() * 100 < param(c),
    apply: (c) => {
      c.battle.applyFlinch(c.targetSeat, c.actorSeat);
    },
  },
]);
for (const type of [
  "bug",
  "steel",
  "ground",
  "rock",
  "grass",
  "dark",
  "fighting",
  "electric",
  "water",
  "flying",
  "poison",
  "ice",
  "ghost",
  "psychic",
  "fire",
  "dragon",
  "normal",
])
  define(`${type}_power`, [
    {
      phase: "attack",
      priority: 20,
      role: "actor",
      modify: (v, c) =>
        c.move.type === type ? Math.floor((v * (100 + param(c))) / 100) : v,
    },
  ]);
for (const [effect, phase, stat, species, multiplier] of [
  ["deep_sea_tooth", "attack", "spa", ["clamperl"], 2],
  ["deep_sea_scale", "defense", "spd", ["clamperl"], 2],
  ["light_ball", "attack", "spa", ["pikachu"], 2],
  ["metal_powder", "defense", "def", ["ditto"], 2],
  ["thick_club", "attack", "atk", ["cubone", "marowak"], 2],
])
  define(effect, [
    {
      phase,
      priority: 30,
      role: phase === "attack" ? "actor" : "target",
      modify: (v, c) =>
        c.stat === stat && species.includes(c.owner.species)
          ? v * multiplier
          : v,
    },
  ]);
define(
  "soul_dew",
  ["attack", "defense"].map((phase) => ({
    phase,
    priority: 30,
    role: phase === "attack" ? "actor" : "target",
    modify: (v, c) =>
      !c.battle.rules.frontier &&
      ["latias", "latios"].includes(c.owner.species) &&
      c.stat === (phase === "attack" ? "spa" : "spd")
        ? Math.floor(v * 1.5)
        : v,
  })),
);
define("can_always_run", [
  {
    phase: "escape-check",
    role: "actor",
    apply: (c) => {
      c.guaranteed = true;
    },
  },
]);
define("lucky_egg", [
  {
    phase: "experience-modifier",
    role: "actor",
    modify: (v) => Math.floor(v * 1.5),
  },
]);
define("double_prize", [
  {
    phase: "entry",
    role: "owner",
    apply: (c) => {
      if (c.battle.roster.alliance(c.ownerSeat) === c.battle.homeAlliance)
        c.battle.prizeMultiplier = 2;
    },
  },
]);
define("friendship_up", [
  {
    phase: "friendship-modifier",
    role: "actor",
    modify: (v) => (v > 0 ? Math.floor(v * 1.5) : v),
  },
]);
define("prevent_evolve", [
  {
    phase: "evolution-check",
    role: "actor",
    apply: (c) => {
      c.allowed = false;
    },
  },
]);
for (const effect of ["dragon_scale", "up_grade"])
  HOLD_EFFECTS[effect] = {
    hooks: [],
    coverage: "implemented",
    notes:
      "EvolutionService validates held-item conditions and consumes the item on a trade commit.",
  };
HOLD_EFFECTS.exp_share = {
  hooks: [],
  coverage: "implemented",
  notes:
    "experienceDistribution divides shared experience before personal modifiers.",
};
HOLD_EFFECTS.repel = {
  hooks: [
    { phase: "encounter-rate", role: "actor", modify: (v) => (v * 2) / 3 },
  ],
  coverage: "implemented",
};
export const GEN3_HELD_ITEMS = Object.fromEntries(
  Object.entries(HELD_ITEM_METADATA).map(([id, metadata]) => {
    const effect = HOLD_EFFECTS[metadata.holdEffect];
    if (!effect)
      throw new Error(`Unknown canonical hold effect ${metadata.holdEffect}`);
    return [id, { ...metadata, ...effect }];
  }),
);

for (const [id, item] of Object.entries(ITEM_METADATA))
  if (item.holdable && !GEN3_HELD_ITEMS[id])
    GEN3_HELD_ITEMS[id] = { ...item, hooks: [], coverage: "implemented" };
