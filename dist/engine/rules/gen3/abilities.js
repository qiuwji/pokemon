import { ABILITY_IDS } from "./ability-catalog.js";
import { NUMERIC_ABILITIES, isPhysical } from "./numeric.js";
import { effectiveness } from "../../model.js";
const hooks = (ids) =>
  Object.fromEntries(ids.map((id) => [id, { hooks: [], coverage: "pending" }]));
export const GEN3_ABILITIES = hooks(ABILITY_IDS);
const define = (id, list, notes = "") =>
  (GEN3_ABILITIES[id] = { hooks: list, coverage: "implemented", notes });
for (const [id, list] of Object.entries(NUMERIC_ABILITIES)) define(id, list);
const block = (phase, role, predicate) => ({
  phase,
  role,
  when: predicate,
  apply: (c) => {
    c.allowed = false;
  },
});
const weather = (kind) => [
  {
    phase: "entry",
    role: "owner",
    effects: [{ op: "setWeather", weather: kind }],
  },
];
define("drizzle", weather("rain"));
define("drought", weather("sun"));
define("sand_stream", weather("sand"));
for (const id of ["battle_armor", "shell_armor"])
  define(id, [block("critical-check", "target", () => true)]);
define("sturdy", [
  block("immunity", "target", (c) => c.move.effect === "ohko"),
], "Gen III blocks OHKO only, not full-HP survival.");
define("damp", [
  block("move-check", "all", (c) =>
    ["explosion", "self_destruct"].includes(c.move.effect),
  ),
]);
for (const [id, status] of Object.entries({
  limber: "paralysis",
  insomnia: "sleep",
  vital_spirit: "sleep",
  immunity: "poison",
  magma_armor: "freeze",
  water_veil: "burn",
}))
  define(id, [
    block("status-check", "target", (c) => c.status === status),
    {
      phase: "entry",
      role: "owner",
      when: (c) => c.owner.status === status,
      effects: [{ op: "cureStatus", status }],
    },
  ]);
define("own_tempo", [block("confusion-check", "target", () => true)]);
define("inner_focus", [block("flinch-check", "target", () => true)]);
define("oblivious", [block("attraction-check", "target", () => true)]);
for (const [id, type] of Object.entries({
  volt_absorb: "electric",
  water_absorb: "water",
}))
  define(id, [
    {
      phase: "immunity",
      role: "target",
      when: (c) => c.move.type === type && c.move.power > 0,
      apply: (c) => {
        c.allowed = false;
        c.battle.traits.effects([{ op: "traitHeal", fraction: 0.25 }], c);
        c.emit("吸收了攻击！", "trait");
      },
    },
  ]);
define("levitate", [
  block("immunity", "target", (c) => c.move.type === "ground"),
]);
define("flash_fire", [
  {
    phase: "immunity",
    role: "target",
    when: (c) => c.move.type === "fire" && c.owner.status !== "freeze",
    apply: (c) => {
      c.allowed = false;
      c.battle.conditions.get(c.ownerSeat).flashFire = true;
      c.emit("引火发动了！", "trait");
    },
  },
  {
    phase: "base-damage",
    role: "actor",
    modify: (v, c) =>
      c.move.type === "fire" && c.battle.conditions.get(c.ownerSeat).flashFire
        ? Math.floor(v * 1.5)
        : v,
  },
]);
define("wonder_guard", [
  block(
    "immunity",
    "target",
    (c) =>
      c.move.power > 0 &&
      effectiveness(
        c.move.type,
        c.battle.traits.types(c.ownerSeat),
        c.battle.db.typeChart,
      ) <= 1,
  ),
]);
define("shield_dust", [block("secondary", "target", () => true)]);
for (const id of ["clear_body", "white_smoke"])
  define(id, [
    block(
      "stage-check",
      "target",
      (c) => c.amount < 0 && c.sourceSeat !== c.targetSeat,
    ),
  ]);
define("keen_eye", [
  block(
    "stage-check",
    "target",
    (c) => c.key === "acc" && c.amount < 0 && c.sourceSeat !== c.targetSeat,
  ),
]);
define("hyper_cutter", [
  block(
    "stage-check",
    "target",
    (c) => c.key === "atk" && c.amount < 0 && c.sourceSeat !== c.targetSeat,
  ),
]);
define("intimidate", [
  {
    phase: "entry",
    role: "owner",
    apply: (c) => {
      for (const s of c.battle.roster.opposing(c.ownerSeat))
        c.battle.changeStage(s.id, "atk", -1, { sourceSeat: c.ownerSeat });
      c.emit("威吓降低了对方的攻击！", "trait");
    },
  },
]);
define("natural_cure", [
  {
    phase: "leave",
    role: "owner",
    effects: [{ op: "cureStatus", status: "any" }],
  },
]);
define("color_change", [
  {
    phase: "after-hit",
    role: "target",
    when: (c) => c.amount > 0 && c.owner.hp > 0,
    apply: (c) => {
      c.battle.conditions.get(c.ownerSeat).types = [c.move.type];
      c.emit("属性改变了！", "trait");
    },
  },
]);
const contactStatus = (status, chance = 0.3) => [
  {
    phase: "contact",
    role: "target",
    when: (c) => c.amount > 0 && c.battle.rng.next() < chance,
    effects: [{ op: "traitStatus", target: "actor", status }],
  },
];
define("static", contactStatus("paralysis"));
define("poison_point", contactStatus("poison"));
define("flame_body", contactStatus("burn"));
define("effect_spore", [
  {
    phase: "contact",
    role: "target",
    when: (c) => c.amount > 0 && c.battle.rng.next() < 0.1,
    effects: (c) => [
      {
        op: "traitStatus",
        target: "actor",
        status: ["poison", "paralysis", "sleep"][c.battle.rng.int(3)],
      },
    ],
  },
]);
define("rough_skin", [
  {
    phase: "contact",
    role: "target",
    when: (c) => c.amount > 0,
    effects: [{ op: "traitHurt", target: "actor", fraction: 1 / 16 }],
  },
]);
define("cute_charm", [
  {
    phase: "contact",
    role: "target",
    when: (c) => c.amount > 0 && c.battle.rng.next() < 0.3,
    apply: (c) => c.battle.applyAttraction(c.actorSeat, c.ownerSeat),
  },
]);
define("synchronize", [
  {
    phase: "status-applied",
    role: "target",
    when: (c) =>
      c.sourceKind !== "synchronize" &&
      ["burn", "poison", "paralysis"].includes(c.status) &&
      c.sourceSeat &&
      c.sourceSeat !== c.ownerSeat,
    apply: (c) =>
      c.battle.applyStatus(c.sourceSeat, c.status, {
        sourceSeat: c.ownerSeat,
        sourceKind: "synchronize",
      }),
  },
]);
define("speed_boost", [
  {
    phase: "round-end",
    role: "owner",
    when: (c) => c.battle.conditions.get(c.ownerSeat).entryTurn < c.battle.turn,
    effects: [{ op: "traitStage", changes: { spe: 1 } }],
  },
]);
define("rain_dish", [
  {
    phase: "round-end",
    role: "owner",
    when: (c) => c.weather === "rain",
    effects: [{ op: "traitHeal", fraction: 1 / 16 }],
  },
]);
define("shed_skin", [
  {
    phase: "round-end",
    role: "owner",
    when: (c) => c.owner.status && c.battle.rng.next() < 1 / 3,
    effects: [{ op: "cureStatus", status: "any" }],
  },
]);
define("early_bird", [
  {
    phase: "action-permission",
    role: "actor",
    when: (c) => c.owner.status === "sleep",
    apply: (c) => {
      c.owner.sleep--;
    },
  },
]);
define("truant", [
  {
    phase: "action-permission",
    role: "actor",
    apply: (c) => {
      const state = c.battle.conditions.get(c.ownerSeat);
      state.loafing = !state.loafing;
      if (!state.loafing) {
        c.allowed = false;
        c.emit("正在偷懒！", "trait");
      }
    },
  },
]);
define("run_away", [
  {
    phase: "escape-check",
    role: "actor",
    apply: (c) => {
      c.guaranteed = true;
    },
  },
]);
for (const id of ["cloud_nine", "air_lock"])
  define(id, [{ phase: "weather", role: "all", modify: () => null }]);
define("rock_head", [block("recoil-check", "actor", (c) => c.recoil === true)]);
define("liquid_ooze", [
  {
    phase: "drain-check",
    role: "target",
    when: (c) => c.drain === true,
    apply: (c) => {
      c.reverseDrain = true;
    },
  },
]);
define("soundproof", [
  block("immunity", "target", (c) => c.move.sound === true),
]);
define("suction_cups", [
  block("switch-check", "target", (c) => c.forced === true),
]);
define("sticky_hold", [block("item-transfer-check", "target", () => true)]);
const trap = (predicate) => [
  {
    phase: "switch-check",
    role: "all",
    when: (c) =>
      c.battle.roster.isOpposing(c.ownerSeat, c.actorSeat) && predicate(c),
    apply: (c) => {
      c.allowed = false;
    },
  },
  {
    phase: "escape-check",
    role: "all",
    when: (c) =>
      c.battle.roster.isOpposing(c.ownerSeat, c.actorSeat) && predicate(c),
    apply: (c) => {
      c.allowed = false;
    },
  },
];
define(
  "shadow_tag",
  trap(() => true),
);
define(
  "magnet_pull",
  trap((c) => c.battle.traits.types(c.actorSeat).includes("steel")),
);
define(
  "arena_trap",
  trap(
    (c) =>
      !c.battle.traits.types(c.actorSeat).includes("flying") &&
      c.battle.roster.occupant(c.actorSeat).ability !== "levitate",
  ),
);
define("lightning_rod", [
  {
    phase: "target-selection",
    role: "all",
    when: (c) =>
      c.move.type === "electric" &&
      c.battle.targeting.mode(c.move) === "selected" &&
      c.battle.roster.isOpposing(c.actorSeat, c.ownerSeat),
    apply: (c) => {
      if (
        c.redirected ||
        c.targetSeats.some(
          (id) => c.battle.roster.occupant(id)?.ability === "lightning_rod",
        )
      )
        return;
      const candidates = c.battle.roster
        .opposing(c.actorSeat)
        .filter(
          (s) => c.battle.roster.occupant(s.id).ability === "lightning_rod",
        );
      const ranks = c.battle.turnOrder || [];
      candidates.sort((a, b) =>
        ranks.length
          ? ranks.indexOf(a.id) - ranks.indexOf(b.id)
          : c.battle.speed(c.battle.roster.occupant(b.id), b.id) -
            c.battle.speed(c.battle.roster.occupant(a.id), a.id),
      );
      if (candidates[0]?.id !== c.ownerSeat) return;
      c.targetSeats = [c.ownerSeat];
      c.redirected = true;
    },
  },
]);
define("trace", [
  {
    phase: "entry",
    role: "owner",
    apply: (c) => {
      if (c.battle.conditions.get(c.ownerSeat).originalAbility) return;
      const targets = c.battle.roster
        .opposing(c.ownerSeat)
        .filter((s) => c.battle.roster.occupant(s.id).ability);
      if (!targets.length) return;
      const copied = c.battle.roster.occupant(
        targets[c.battle.rng.int(targets.length)].id,
      ).ability;
      c.battle.conditions.get(c.ownerSeat).originalAbility = c.owner.ability;
      c.owner.ability = copied;
      c.emit("复制了对方的特性！", "trait");
    },
  },
]);
define("forecast", [
  {
    phase: "types",
    role: "actor",
    modify: (value, c) =>
      c.owner.species === "castform"
        ? [{ rain: "water", sun: "fire", hail: "ice" }[c.weather] || "normal"]
        : value,
  },
  {
    phase: "form",
    role: "actor",
    modify: (value, c) =>
      c.owner.species === "castform"
        ? { rain: "rainy", sun: "sunny", hail: "snowy" }[c.weather] || "normal"
        : value,
  },
]);
GEN3_ABILITIES.sand_veil.hooks.push(
  block("weather-immunity", "actor", (c) => c.weather === "sand"),
);

// Emerald's lead-party rules are resolved by the same attachments in a party scope.
define("stench", [
  {
    phase: "encounter-rate",
    role: "actor",
    modify: (v, c) => v * (c.pyramid ? 0.75 : 0.5),
  },
]);
define("illuminate", [
  { phase: "encounter-rate", role: "actor", modify: (v) => v * 2 },
]);
GEN3_ABILITIES.white_smoke.hooks.push({
  phase: "encounter-rate",
  role: "actor",
  modify: (v) => v / 2,
});
GEN3_ABILITIES.arena_trap.hooks.push({
  phase: "encounter-rate",
  role: "actor",
  modify: (v) => v * 2,
});
GEN3_ABILITIES.sand_veil.hooks.push({
  phase: "encounter-rate",
  role: "actor",
  modify: (v, c) => (c.weather === "sand" ? v / 2 : v),
});
for (const id of ["hustle", "vital_spirit", "pressure"])
  GEN3_ABILITIES[id].hooks.push({
    phase: "encounter-level",
    role: "actor",
    modify: (v, c) => (c.rng.int(2) === 0 ? c.max : Math.max(c.min, v - 1)),
  });
for (const id of ["keen_eye", "intimidate"])
  GEN3_ABILITIES[id].hooks.push({
    phase: "encounter-permission",
    role: "actor",
    when: (c) =>
      c.owner.level > 5 && c.level <= c.owner.level - 5 && c.rng.int(2) === 0,
    apply: (c) => {
      c.allowed = false;
    },
  });
for (const [id, type] of [
  ["magnet_pull", "steel"],
  ["static", "electric"],
])
  GEN3_ABILITIES[id].hooks.push({
    phase: "encounter-select",
    role: "actor",
    when: (c) =>
      !c.owner.egg &&
      !(type === "steel" && c.area !== "land") &&
      c.rng.int(2) === 0,
    apply: (c) => {
      const options = c.entries.filter((e) =>
        c.db.species[e.species].types.includes(type),
      );
      if (options.length && options.length !== c.entries.length)
        c.selected = options[c.rng.int(options.length)];
    },
  });
GEN3_ABILITIES.synchronize.hooks.push({
  phase: "creation-nature",
  role: "actor",
  modify: (v, c) => (!c.owner.egg && c.rng.int(2) === 0 ? c.owner.nature : v),
});
GEN3_ABILITIES.cute_charm.hooks.push({
  phase: "creation-gender",
  role: "actor",
  when: (c) =>
    !c.owner.egg &&
    c.species.femaleRatio > 0 &&
    c.species.femaleRatio < 1 &&
    c.rng.int(3) !== 0,
  apply: (c) => {
    c.gender = c.owner.gender === "♀" ? "♂" : "♀";
  },
});
GEN3_ABILITIES.compound_eyes.hooks.push({
  phase: "wild-held-rarity",
  role: "actor",
  modify: (v, c) => (c.rarity === "rare" ? 20 : 60),
});
define("pickup", [
  {
    phase: "after-battle",
    role: "all",
    when: (c) => !c.owner.egg && !c.owner.heldItem && c.rng.int(10) === 0,
    apply: (c) => {
      const normal = [
          "potion",
          "antidote",
          "super_potion",
          "great_ball",
          "repel",
          "escape_rope",
          "x_attack",
          "full_heal",
          "ultra_ball",
          "hyper_potion",
          "rare_candy",
          "protein",
          "revive",
          "hp_up",
          "full_restore",
          "max_revive",
          "pp_up",
          "max_elixir",
        ],
        rare = [
          "hyper_potion",
          "nugget",
          "kings_rock",
          "full_restore",
          "ether",
          "white_herb",
          "tm_rest",
          "elixir",
          "tm_focus_punch",
          "leftovers",
          "tm_earthquake",
        ],
        threshold = [30, 40, 50, 60, 70, 80, 90, 94, 98],
        level = Math.min(9, Math.floor((c.owner.level - 1) / 10)),
        roll = c.rng.int(100);
      c.owner.heldItem =
        roll >= 98
          ? rare[level + 99 - roll]
          : normal[level + threshold.findIndex((p) => roll < p)];
      c.emit("伙伴捡到了一个道具！", "pickup", {
        uid: c.owner.uid,
        itemId: c.owner.heldItem,
      });
    },
  },
]);

for (const id of ["magma_armor", "flame_body"])
  GEN3_ABILITIES[id].hooks.push({
    phase: "hatch-rate",
    role: "all",
    when: (c) => !c.owner.egg,
    modify: (v) => Math.max(2, v),
  });
