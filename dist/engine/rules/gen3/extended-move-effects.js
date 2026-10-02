const primary = (op, parameters = {}, self = false) => ({
  ...(self ? { target: "self" } : {}),
  primary: [{ op, ...parameters }],
});
const stage = (target, changes) => ({
  target,
  primary: [{ op: "stages", target, changes }],
});
const secondary = (op, p = {}) => ({ secondary: [{ op, ...p }] });
/** Semantic families share operations; no move ID dispatch in the executor. */
export const GEN3_EXTENDED_MOVE_EFFECTS = {
  endeavor: { beforeDamage: [{ op: "fixedDamage", mode: "endeavor" }] },
  swagger: primary("boostAndConfuse", { key: "atk" }),
  flatter: primary("boostAndConfuse", { key: "spa" }),
  flail: { beforeDamage: [{ op: "variablePower", mode: "flail" }] },
  belly_drum: primary("bellyDrum", {}, true),
  stockpile: primary("stockpile", {}, true),
  swallow: primary("swallow", {}, true),
  spit_up: {
    beforeDamage: [{ op: "stockpileDamage" }],
    afterDamage: [{ op: "clearStockpile" }],
    noCritical: true,
  },
  flinch_minimize_hit: {
    beforeDamage: [{ op: "minimizePower" }],
    secondary: [{ op: "flinch" }],
  },
  nature_power: primary("environmentMove"),
  imprison: primary("imprison", {}, true),
  haze: primary("clearStages", {}, true),
  restore_hp: primary("restoreHP", { fraction: 0.5 }, true),
  softboiled: primary("restoreHP", { fraction: 0.5 }, true),
  poison: primary("status", { status: "poison" }),
  paralyze: primary("status", { status: "paralysis" }),
  will_o_wisp: primary("status", { status: "burn" }),
  super_fang: { beforeDamage: [{ op: "fixedDamage", mode: "half" }] },
  dragon_rage: {
    beforeDamage: [{ op: "fixedDamage", mode: "constant", amount: 40 }],
  },
  sonicboom: {
    beforeDamage: [{ op: "fixedDamage", mode: "constant", amount: 20 }],
  },
  level_damage: { beforeDamage: [{ op: "fixedDamage", mode: "level" }] },
  psywave: { beforeDamage: [{ op: "fixedDamage", mode: "psywave" }] },
  return: { beforeDamage: [{ op: "variablePower", mode: "return" }] },
  frustration: { beforeDamage: [{ op: "variablePower", mode: "frustration" }] },
  eruption: { beforeDamage: [{ op: "variablePower", mode: "eruption" }] },
  low_kick: { beforeDamage: [{ op: "variablePower", mode: "weight" }] },
  hidden_power: { beforeDamage: [{ op: "hiddenPower" }] },
  splash: primary("failMove", {}, true),
  psych_up: primary("copyStages"),
  minimize: { ...stage("self", { eva: 1 }), afterDamage: undefined },
  refresh: primary("refresh", {}, true),
  heal_bell: primary("partyCure", {}, true),
  defense_curl: primary("defenseCurl", {}, true),
  pain_split: primary("painSplit"),
  attract: primary("attract"),
  sandstorm: primary("setWeather", { weather: "sand", turns: 5 }, true),
  hail: primary("setWeather", { weather: "hail", turns: 5 }, true),
  facade: { beforeDamage: [{ op: "variablePower", mode: "facade" }] },
  brick_break: { beforeDamage: [{ op: "breakScreens" }] },
  overheat: {
    afterDamage: [
      { op: "stages", target: "self", scope: "action", changes: { spa: -2 } },
    ],
  },
  superpower: {
    afterDamage: [
      {
        op: "stages",
        target: "self",
        scope: "action",
        changes: { atk: -1, def: -1 },
      },
    ],
  },
  tickle: stage("opponent", { atk: -1, def: -1 }),
  cosmic_power: stage("self", { def: 1, spd: 1 }),
  dragon_dance: stage("self", { atk: 1, spe: 1 }),
  twineedle: { hits: [2], secondary: [{ op: "status", status: "poison" }] },
  vital_throw: { alwaysHits: true },
  poison_tail: {
    criticalStage: 1,
    secondary: [{ op: "status", status: "poison" }],
  },
};
for (const [key, stat] of Object.entries({
  attack: "atk",
  defense: "def",
  special_attack: "spa",
  special_defense: "spd",
  speed: "spe",
  accuracy: "acc",
  evasion: "eva",
})) {
  for (const [label, amount] of [
    ["up", 1],
    ["up_2", 2],
    ["down", -1],
    ["down_2", -2],
  ])
    GEN3_EXTENDED_MOVE_EFFECTS[`${key}_${label}`] = stage(
      amount > 0 ? "self" : "opponent",
      { [stat]: amount },
    );
  GEN3_EXTENDED_MOVE_EFFECTS[`${key}_down_hit`] = secondary("stages", {
    target: "opponent",
    changes: { [stat]: -1 },
  });
  GEN3_EXTENDED_MOVE_EFFECTS[`${key}_up_hit`] = secondary("stages", {
    target: "self",
    changes: { [stat]: 1 },
  });
}
GEN3_EXTENDED_MOVE_EFFECTS.all_stats_up_hit = secondary("stages", {
  target: "self",
  changes: { atk: 1, def: 1, spa: 1, spd: 1, spe: 1 },
});
// Minimize is a custom primary because its persistent hit interaction is separate from evasion stage.
GEN3_EXTENDED_MOVE_EFFECTS.minimize = primary("minimize", {}, true);
