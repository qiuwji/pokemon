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
  charge: primary("applyBattleState", { id: "charge", target: "self" }, true),
  helping_hand: primary("helpingHand", {}, true),
  follow_me: primary(
    "applyBattleState",
    { id: "follow_me", target: "self" },
    true,
  ),
  destiny_bond: primary(
    "applyBattleState",
    { id: "destiny_bond", target: "self" },
    true,
  ),
  grudge: primary("applyBattleState", { id: "grudge", target: "self" }, true),
  rage: {
    beforeDamage: [
      { op: "applyBattleState", id: "rage", target: "self", scope: "action" },
    ],
  },
  memento: { primary: [{ op: "memento" }], bypassHitChecks: true },
  secret_power: { secondary: [{ op: "secretPower" }] },
  conversion: primary("conversion", {}, true),
  conversion_2: primary("conversionResistance", {}, true),
  camouflage: primary("camouflage", {}, true),
  role_play: primary("copyAbility"),
  skill_swap: primary("swapAbilities"),
  trick: primary("swapItems"),
  recycle: primary("recycle", {}, true),
  knock_off: { afterDamage: [{ op: "knockOff" }] },
  spite: primary("spite"),
  fake_out: {
    beforeDamage: [{ op: "firstTurnOnly" }],
    secondary: [{ op: "flinch" }],
  },
  thaw_hit: { afterDamage: [{ op: "thawTarget" }] },
  smellingsalt: {
    beforeDamage: [{ op: "paralysisPower" }],
    afterDamage: [{ op: "wakeTarget" }],
  },
  tri_attack: { secondary: [{ op: "triStatus" }] },
  teeter_dance: primary("danceConfusion", {}, true),
  curse: { primary: [{ op: "curse" }], bypassHitChecks: true },
  magnitude: {
    beforeDamage: [{ op: "magnitude" }],
    hitsHidden: ["underground"],
    hiddenMultiplier: 2,
  },
  weather_ball: { beforeDamage: [{ op: "weatherBall" }] },
  present: { beforeDamage: [{ op: "present" }, { op: "presentHeal" }] },
  counter: { retaliation: "physical", beforeDamage: [{ op: "retaliate" }] },
  mirror_coat: { retaliation: "special", beforeDamage: [{ op: "retaliate" }] },
  revenge: { beforeDamage: [{ op: "revengePower" }] },
  focus_punch: {
    preparation: "正在集中精神！",
    beforeDamage: [{ op: "focusedAttack" }],
  },
  endure: primary("protect", { endure: true }, true),
  disable: primary("restrictMove", { state: "disable" }),
  encore: primary("restrictMove", { state: "encore" }),
  torment: primary("applyBattleState", { id: "torment" }),
  mean_look: primary("applyBattleState", { id: "mean_look" }),
  lock_on: primary("applyBattleState", { id: "lock_on" }),
  safeguard: primary(
    "applyBattleState",
    { id: "safeguard", target: "self" },
    true,
  ),
  wish: primary("applyBattleState", { id: "wish", target: "self" }, true),
  ingrain: primary("applyBattleState", { id: "ingrain", target: "self" }, true),
  yawn: primary("yawn"),
  leech_seed: primary("seed"),
  nightmare: primary("nightmare"),
  perish_song: primary("perishSong", {}, true),
  spikes: primary("spikes"),
  rapid_spin: { afterDamage: [{ op: "rapidSpin" }] },
  transform: primary("transform"),
  mimic: primary("mimic"),
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
  toxic: primary("status", { status: "toxic" }),
  poison_fang: { secondary: [{ op: "status", status: "toxic" }] },
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
