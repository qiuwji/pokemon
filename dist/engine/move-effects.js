import { COPY_OPERATIONS } from "./battle/copy-operations.js";
import { CONTINUOUS_OPERATIONS } from "./battle/continuous-operations.js";
import { SUPPORT_OPERATIONS } from "./battle/support-operations.js";
import { UTILITY_OPERATIONS } from "./battle/utility-operations.js";
import { RANDOM_POWER_OPERATIONS } from "./battle/random-power-operations.js";
import { REACTIVE_OPERATIONS } from "./battle/reactive-operations.js";
import { CONTROL_STATE_OPERATIONS } from "./battle/control-state-operations.js";
import { FORM_OPERATIONS } from "./battle/form-operations.js";
import { GEN3_EXTENDED_MOVE_EFFECTS } from "./rules/gen3/extended-move-effects.js";
import { DAMAGE_OPERATIONS } from "./battle/damage-operations.js";
import { CONTROL_OPERATIONS } from "./battle/control-operations.js";
import { validateActionPolicy } from "./battle/action-lifecycle.js";
import { BATTLE_STATE_OPERATIONS } from "./battle/state-operations.js";
import { TARGET_MODES } from "./battle/targeting.js";
import { EffectRegistry } from "./effects.js";
import { SPECIAL_MOVE_OPERATIONS } from "./battle/special-operations.js";
import { TRAIT_OPERATIONS } from "./battle/trait-operations.js";
const PRIMARY = (op, parameters = {}) => ({
  target: [
    "focus",
    "protect",
    "bide",
    "rest",
    "restoreHP",
    "environment",
    "escape",
  ].includes(op)
    ? "self"
    : "opponent",
  primary: [{ op, ...parameters }],
});
const SECONDARY = (op, parameters = {}) => ({
  secondary: [{ op, ...parameters }],
});
const stages = (target, changes) => ({
  ...PRIMARY("stages", { target, changes }),
  target,
});
/** One catalog; phases describe when effects run. No fallback string dispatch. */
export const MOVE_EFFECTS = {
  hit: {},
  reflect: {
    target: "self",
    primary: [{ op: "applyBattleState", id: "reflect", target: "self" }],
  },
  light_screen: {
    target: "self",
    primary: [{ op: "applyBattleState", id: "light_screen", target: "self" }],
  },
  mist: {
    target: "self",
    primary: [{ op: "applyBattleState", id: "mist", target: "self" }],
  },
  taunt: { primary: [{ op: "applyBattleState", id: "taunt" }] },
  substitute: { target: "self", primary: [{ op: "createSubstitute" }] },
  ohko: { ...PRIMARY("ohko"), alwaysHits: true },
  roar: PRIMARY("forceSwitch"),
  thief: { afterDamage: [{ op: "stealItem" }] },
  explosion: { afterDamage: [{ op: "selfFaint" }] },
  rain_dance: {
    ...PRIMARY("setWeather", { weather: "rain", turns: 5 }),
    target: "self",
  },
  sunny_day: {
    ...PRIMARY("setWeather", { weather: "sun", turns: 5 }),
    target: "self",
  },
  dream_eater: {
    requiresStatus: "sleep",
    afterDamage: [{ op: "drain", fraction: 0.5 }],
  },

  solar_beam: { action: { kind: "charge", skipWeather: "sun" } },
  semi_invulnerable: {
    action: {
      kind: "charge",
      hiddenByMove: {
        fly: "air",
        bounce: "air",
        dig: "underground",
        dive: "underwater",
      },
    },
  },
  razor_wind: { action: { kind: "charge" }, criticalStage: 1 },
  sky_attack: {
    action: { kind: "charge" },
    criticalStage: 1,
    secondary: [{ op: "flinch" }],
  },
  skull_bash: {
    action: { kind: "charge" },
    onCharge: [{ op: "stages", target: "self", changes: { def: 1 } }],
  },
  recharge: { action: { kind: "recharge" } },
  rampage: {
    action: { kind: "repeat", minTurns: 2, maxTurns: 3, confuseAfter: true },
  },
  mirror_move: { primary: [{ op: "copyLastMove" }], bypassHitChecks: true },
  future_sight: {
    primary: [{ op: "futureAttack", delay: 3 }],
    bypassHitChecks: true,
  },
  gust: { hitsHidden: ["air"], hiddenMultiplier: 2 },
  twister: {
    hitsHidden: ["air"],
    hiddenMultiplier: 2,
    secondary: [{ op: "flinch" }],
  },
  thunder: {
    hitsHidden: ["air"],
    secondary: [{ op: "status", status: "paralysis" }],
  },
  surf: { hitsHidden: ["underwater"], hiddenMultiplier: 2 },
  earthquake: { hitsHidden: ["underground"], hiddenMultiplier: 2 },
  quick_attack: {},
  pursuit: {},
  sky_uppercut: { hitsHidden: ["air"] },
  blaze_kick: {
    criticalStage: 1,
    secondary: [{ op: "status", status: "burn" }],
  },
  high_critical: { criticalStage: 1 },
  always_hit: { alwaysHits: true },
  absorb: { afterDamage: [{ op: "drain", fraction: 0.5 }] },
  recoil: { afterDamage: [{ op: "recoil", fraction: 0.25 }] },
  double_edge: { afterDamage: [{ op: "recoil", fraction: 1 / 3 }] },
  double_hit: { hits: [2] },
  multi_hit: { hits: [2, 2, 2, 3, 3, 3, 4, 5] },
  fury_cutter: { beforeDamage: [{ op: "streakPower" }] },
  false_swipe: { minimumHP: 1 },
  attack_down: stages("opponent", { atk: -1 }),
  defense_down: stages("opponent", { def: -1 }),
  defense_down_2: stages("opponent", { def: -2 }),
  speed_down: stages("opponent", { spe: -1 }),
  speed_down_2: stages("opponent", { spe: -2 }),
  accuracy_down: stages("opponent", { acc: -1 }),
  special_attack_down: stages("opponent", { spa: -1 }),
  special_defense_down: stages("opponent", { spd: -1 }),
  special_defense_down_2: stages("opponent", { spd: -2 }),
  attack_up: stages("self", { atk: 1 }),
  attack_up_2: stages("self", { atk: 2 }),
  defense_up: stages("self", { def: 1 }),
  defense_up_2: stages("self", { def: 2 }),
  speed_up_2: stages("self", { spe: 2 }),
  special_attack_up: stages("self", { spa: 1 }),
  special_defense_up: stages("self", { spd: 1 }),
  evasion_up: stages("self", { eva: 1 }),
  bulk_up: stages("self", { atk: 1, def: 1 }),
  calm_mind: stages("self", { spa: 1, spd: 1 }),
  focus_energy: PRIMARY("focus"),
  protect: PRIMARY("protect"),
  detect: PRIMARY("protect"),
  confuse: PRIMARY("confuse"),
  confuse_hit: SECONDARY("confuse"),
  sleep: PRIMARY("status", { status: "sleep" }),
  burn_hit: SECONDARY("status", { status: "burn" }),
  poison_hit: SECONDARY("status", { status: "poison" }),
  paralyze_hit: SECONDARY("status", { status: "paralysis" }),
  freeze_hit: SECONDARY("status", { status: "freeze" }),
  flinch_hit: SECONDARY("flinch"),
  accuracy_down_hit: SECONDARY("stages", {
    target: "opponent",
    changes: { acc: -1 },
  }),
  speed_down_hit: SECONDARY("stages", {
    target: "opponent",
    changes: { spe: -1 },
  }),
  special_defense_down_hit: SECONDARY("stages", {
    target: "opponent",
    changes: { spd: -1 },
  }),
  rest: PRIMARY("rest"),
  synthesis: { ...PRIMARY("weatherHeal"), target: "self" },
  morning_sun: { ...PRIMARY("weatherHeal"), target: "self" },
  moonlight: { ...PRIMARY("weatherHeal"), target: "self" },
  water_sport: PRIMARY("environment", { key: "waterSport" }),
  mud_sport: PRIMARY("environment", { key: "mudSport" }),
  foresight: PRIMARY("identify"),
  odor_sleuth: PRIMARY("identify"),
  teleport: PRIMARY("escape"),
  trap: { afterDamage: [{ op: "trap" }] },
  bide: PRIMARY("bide"),
};
Object.assign(MOVE_EFFECTS, GEN3_EXTENDED_MOVE_EFFECTS);
const MOVE_OPERATIONS = {
  stages(c, s) {
    const side = s.target === "self" ? c.side : c.other;
    let changed = false;
    for (const [key, value] of Object.entries(s.changes))
      changed =
        c.battle.changeStage(side, key, value, { sourceSeat: c.side }) ||
        changed;
    c.emit(
      changed
        ? Object.values(s.changes)[0] > 0
          ? "能力提高了！"
          : "对方的能力下降了！"
        : "能力已经无法再变化了！",
    );
  },
  focus: (c) => {
    c.selfState.focus = true;
    c.emit("正在集中精神！");
  },
  protect: (c) => {
    c.selfState.protected = true;
    c.emit("保护了自己！", "barrier", { targetSeat: c.side });
  },
  confuse: (c) => {
    c.battle.applyConfusion(c.other, c.side);
  },

  status(c, s) {
    c.battle.applyStatus(c.other, s.status, {
      sourceSeat: c.side,
      sourceKind: "move",
    });
  },
  flinch: (c) => {
    c.battle.applyFlinch(c.other, c.side);
  },

  rest: (c) => {
    const permission = {
      targetSeat: c.side,
      sourceSeat: c.side,
      status: "sleep",
      allowed: true,
    };
    c.battle.traits?.run("status-check", permission);
    if (!permission.allowed) {
      c.emit("没有效果。");
      return;
    }
    c.mon.hp = c.mon.stats.hp;
    c.mon.status = "sleep";
    c.mon.sleep = 3;
    c.emit("恢复了体力，并睡着了！", "heal", { side: c.side });
  },
  environment: (c, s) => {
    c.battle[s.key] = true;
    c.emit("对应属性招式的威力减弱了！");
  },
  identify: (c) => {
    c.targetState.stages.eva = 0;
    c.emit("看穿了对方！");
  },
  escape: (c) => {
    if (!c.battle.trainer) {
      c.battle.finish("escaped");
      c.emit("成功逃脱了！", "end");
    } else c.emit("没有效果。");
  },
  bide: (c) => {
    c.selfState.bide = { turns: 2, damage: 0 };
    c.emit("开始忍耐！");
  },
  streakPower: (c) => {
    c.power *= 2 ** Math.min(4, c.selfState.fury++);
  },
  drain: (c, s) => {
    if (!c.dealt) return;
    let restore = 0;
    for (const part of c.drains || [{ targetSeat: c.other, amount: c.dealt }]) {
      const amount = Math.max(1, Math.floor(part.amount * s.fraction)),
        feedback = {
          ...c,
          targetSeat: part.targetSeat,
          drain: true,
          reverseDrain: false,
        };
      c.battle.traits?.run("drain-check", feedback);
      restore += feedback.reverseDrain ? -amount : amount;
    }
    if (restore > 0) c.registry.run([{ op: "restoreHP", amount: restore }], c);
    if (restore < 0) {
      c.mon.hp = Math.max(0, c.mon.hp + restore);
      c.emit("污泥反噬了体力！", "hurt", { targetSeat: c.side });
    }
  },
  recoil: (c, s) => {
    if (!c.dealt) return;
    const permission = {
      ...c,
      recoil: c.move.id !== "struggle",
      allowed: true,
    };
    c.battle.traits?.run("recoil-check", permission);
    if (!permission.allowed) return;
    c.mon.hp = Math.max(
      0,
      c.mon.hp - Math.max(1, Math.floor(c.dealt * s.fraction)),
    );
    c.emit("受到了反作用力！", "hurt", { side: c.side });
  },
  trap: (c) => {
    if (c.dealt && c.opponent.hp > 0) {
      c.targetState.traps = 2 + c.battle.rng.int(4);
      c.emit("对方被困住了！");
    }
  },
};
MOVE_OPERATIONS.stages.validate = (s, p) => {
  if (
    !["self", "opponent"].includes(s.target) ||
    !s.changes ||
    !Object.keys(s.changes).length ||
    Object.entries(s.changes).some(
      ([key, value]) =>
        !["atk", "def", "spa", "spd", "spe", "acc", "eva"].includes(key) ||
        !Number.isInteger(value) ||
        !value ||
        Math.abs(value) > 6,
    )
  )
    throw new Error(`${p}: invalid stage change`);
};
MOVE_OPERATIONS.status.validate = (s, p) => {
  if (
    !["poison", "toxic", "burn", "paralysis", "sleep", "freeze"].includes(
      s.status,
    )
  )
    throw new Error(`${p}: invalid status`);
};
MOVE_OPERATIONS.environment.validate = (s, p) => {
  if (!["waterSport", "mudSport"].includes(s.key))
    throw new Error(`${p}: invalid environment`);
};
for (const key of ["drain", "recoil"])
  MOVE_OPERATIONS[key].validate = (s, p) => {
    if (!(s.fraction > 0 && s.fraction <= 1))
      throw new Error(`${p}: invalid fraction`);
  };
MOVE_OPERATIONS.streakPower.scope = "action";
MOVE_OPERATIONS.drain.scope = "action";
MOVE_OPERATIONS.recoil.scope = "action";
export class MoveEffectRegistry {
  constructor({ definitions = {}, operations = {} } = {}) {
    this.definitions = { ...MOVE_EFFECTS, ...definitions };
    this.operations = new EffectRegistry({
      ...MOVE_OPERATIONS,
      ...TRAIT_OPERATIONS,
      ...BATTLE_STATE_OPERATIONS,
      ...SPECIAL_MOVE_OPERATIONS,
      ...DAMAGE_OPERATIONS,
      ...CONTROL_OPERATIONS,
      ...CONTROL_STATE_OPERATIONS,
      ...FORM_OPERATIONS,
      ...REACTIVE_OPERATIONS,
      ...UTILITY_OPERATIONS,
      ...SUPPORT_OPERATIONS,
      ...COPY_OPERATIONS,
      ...CONTINUOUS_OPERATIONS,
      ...RANDOM_POWER_OPERATIONS,
      ...operations,
    });
    for (const [id, definition] of Object.entries(this.definitions)) {
      if (
        !definition ||
        typeof definition !== "object" ||
        Array.isArray(definition)
      )
        throw new Error(`effects.${id}: expected a definition`);
      for (const key of Object.keys(definition))
        if (
          ![
            "target",
            "primary",
            "beforeDamage",
            "afterDamage",
            "secondary",
            "supported",
            "reason",
            "hits",
            "criticalStage",
            "alwaysHits",
            "minimumHP",
            "requiresStatus",
            "action",
            "onCharge",
            "hitsHidden",
            "hiddenMultiplier",
            "bypassHitChecks",
            "noCritical",
            "retaliation",
            "preparation",
            "usableAsleep",
            "requiresUserStatus",
            "thawsUser",
            "hitPowers",
            "accuracyEachHit",
          ].includes(key)
        )
          throw new Error(`effects.${id}: unknown field ${key}`);
      if (definition.action) validateActionPolicy(definition.action);
      if (
        definition.retaliation !== undefined &&
        !["physical", "special"].includes(definition.retaliation)
      )
        throw new Error(`effects.${id}: invalid retaliation category`);
      if (
        definition.preparation !== undefined &&
        (typeof definition.preparation !== "string" ||
          !definition.preparation ||
          definition.preparation.length > 200)
      )
        throw new Error(`effects.${id}: invalid preparation message`);
      if (
        definition.hitsHidden &&
        (!Array.isArray(definition.hitsHidden) ||
          definition.hitsHidden.some(
            (v) => !["air", "underground", "underwater"].includes(v),
          ))
      )
        throw new Error(`effects.${id}: invalid concealed targets`);
      if (
        definition.hiddenMultiplier !== undefined &&
        (!Number.isFinite(definition.hiddenMultiplier) ||
          definition.hiddenMultiplier < 1 ||
          definition.hiddenMultiplier > 4)
      )
        throw new Error(`effects.${id}: invalid concealed multiplier`);
      if (
        definition.requiresStatus !== undefined &&
        !["sleep", "freeze", "poison", "toxic", "burn", "paralysis"].includes(
          definition.requiresStatus,
        )
      )
        throw new Error(`effects.${id}: invalid required status`);
      if (
        definition.requiresUserStatus !== undefined &&
        !["sleep", "freeze", "poison", "toxic", "burn", "paralysis"].includes(
          definition.requiresUserStatus,
        )
      )
        throw new Error(`effects.${id}: invalid required user status`);
      if (
        definition.hitPowers !== undefined &&
        (!Array.isArray(definition.hitPowers) ||
          !definition.hitPowers.length ||
          definition.hitPowers.length > 10 ||
          definition.hitPowers.some(
            (p) => !Number.isInteger(p) || p < 1 || p > 1000,
          ) ||
          definition.hits !== undefined)
      )
        throw new Error(`effects.${id}: invalid hit power sequence`);
      if (
        definition.primary &&
        [
          "beforeDamage",
          "afterDamage",
          "secondary",
          "hits",
          "hitPowers",
          "accuracyEachHit",
          "minimumHP",
        ].some((key) => definition[key] !== undefined)
      )
        throw new Error(`effects.${id}: primary cannot mix with damage phases`);
      if (
        definition.target !== undefined &&
        !["self", "opponent"].includes(definition.target)
      )
        throw new Error(`effects.${id}.target: invalid target`);
      for (const key of [
        "supported",
        "alwaysHits",
        "bypassHitChecks",
        "noCritical",
        "usableAsleep",
        "thawsUser",
        "accuracyEachHit",
      ])
        if (
          definition[key] !== undefined &&
          typeof definition[key] !== "boolean"
        )
          throw new Error(`effects.${id}.${key}: expected boolean`);
      if (
        definition.criticalStage !== undefined &&
        (!Number.isInteger(definition.criticalStage) ||
          definition.criticalStage < 0 ||
          definition.criticalStage > 4)
      )
        throw new Error(`effects.${id}.criticalStage: invalid stage`);
      if (definition.minimumHP !== undefined && definition.minimumHP !== 1)
        throw new Error(`effects.${id}.minimumHP: expected 1`);
      for (const phase of [
        "primary",
        "beforeDamage",
        "afterDamage",
        "secondary",
        "onCharge",
      ])
        if (definition[phase]) {
          for (const step of definition[phase])
            if (
              step.scope !== undefined &&
              !["action", "target"].includes(step.scope)
            )
              throw new Error(`effects.${id}: invalid effect scope`);
          this.operations.validate(definition[phase], `effects.${id}.${phase}`);
        }
      if (
        definition.hits &&
        (!Array.isArray(definition.hits) ||
          !definition.hits.length ||
          definition.hits.some((n) => !Number.isInteger(n) || n < 1 || n > 10))
      )
        throw new Error(`effects.${id}.hits: invalid hit counts`);
    }
  }
  get(id) {
    const definition = this.definitions[id];
    if (!Object.hasOwn(this.definitions, id))
      throw new Error(`Unknown move effect: ${id}`);
    return definition;
  }
  supports(id) {
    return this.get(id).supported !== false;
  }
  validateMoves(moves) {
    for (const [id, move] of Object.entries(moves)) {
      if (move.target !== undefined && !TARGET_MODES.has(move.target))
        throw new Error(`moves.${id}.target: unknown target mode`);
      if (move.contact !== undefined && typeof move.contact !== "boolean")
        throw new Error(`moves.${id}.contact: expected boolean`);
      try {
        this.get(move.effect);
      } catch {
        throw new Error(`moves.${id}.effect: unknown effect ${move.effect}`);
      }
    }
  }
  run(phase, context, { scope } = {}) {
    Object.assign(context, {
      target: context.mon,
      targetSide: context.side,
      registry: this.operations,
    });
    const steps = (context.definition[phase] || []).filter(
      (step) =>
        !scope ||
        (step.scope ||
          this.operations.operations[step.op].scope ||
          "target") === scope,
    );
    if (context.battle.traits) context.battle.traits.effects(steps, context);
    else this.operations.run(steps, context);
  }
}
