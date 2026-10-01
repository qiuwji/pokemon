import { TARGET_MODES } from "./battle/targeting.js";
import { EffectRegistry } from "./effects.js";
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
  earthquake: {},
  quick_attack: {},
  pursuit: {},
  sky_uppercut: {},
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
  synthesis: PRIMARY("restoreHP", { fraction: 0.5 }),
  morning_sun: PRIMARY("restoreHP", { fraction: 0.5 }),
  moonlight: PRIMARY("restoreHP", { fraction: 0.5 }),
  water_sport: PRIMARY("environment", { key: "waterSport" }),
  mud_sport: PRIMARY("environment", { key: "mudSport" }),
  foresight: PRIMARY("identify"),
  odor_sleuth: PRIMARY("identify"),
  teleport: PRIMARY("escape"),
  trap: { afterDamage: [{ op: "trap" }] },
  bide: PRIMARY("bide"),
};
// Content retains learnsets for expansion. Unimplemented mechanics are explicit capability data.
for (const id of [
  "mirror_move",
  "endeavor",
  "roar",
  "swagger",
  "taunt",
  "thief",
  "flail",
  "belly_drum",
  "mist",
  "stockpile",
  "swallow",
  "spit_up",
  "flinch_minimize_hit",
  "nature_power",
  "rain_dance",
  "sunny_day",
  "explosion",
  "imprison",
  "future_sight",
  "dream_eater",
])
  MOVE_EFFECTS[id] = { supported: false, reason: "该招式的特殊机制尚未实现。" };
const MOVE_OPERATIONS = {
  stages(c, s) {
    const side = s.target === "self" ? c.side : c.other;
    let changed = false;
    for (const [key, value] of Object.entries(s.changes))
      changed = c.battle.changeStage(side, key, value) || changed;
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
    c.emit("保护了自己！");
  },
  confuse: (c) => {
    if (!c.targetState.confused) {
      c.targetState.confused = 2 + c.battle.rng.int(4);
      c.emit("对方陷入了混乱！");
    }
  },
  status(c, s) {
    const types = c.battle.db.species[c.opponent.species].types;
    if (
      !c.battle.rules.statusAllowed({
        status: s.status,
        target: c.opponent,
        types,
      })
    ) {
      c.emit("没有效果。");
      return;
    }
    c.opponent.status = s.status;
    if (s.status === "sleep") c.opponent.sleep = 2 + c.battle.rng.int(4);
    c.emit("对方陷入了异常状态！");
  },
  flinch: (c) => {
    c.targetState.flinched = true;
  },
  rest: (c) => {
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
      c.battle.ended = true;
      c.battle.result = "escaped";
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
    c.registry.run(
      [
        {
          op: "restoreHP",
          amount: Math.max(1, Math.floor(c.dealt * s.fraction)),
        },
      ],
      c,
    );
  },
  recoil: (c, s) => {
    if (!c.dealt) return;
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
  if (!["poison", "burn", "paralysis", "sleep", "freeze"].includes(s.status))
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
    this.operations = new EffectRegistry({ ...MOVE_OPERATIONS, ...operations });
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
          ].includes(key)
        )
          throw new Error(`effects.${id}: unknown field ${key}`);
      if (
        definition.primary &&
        ["beforeDamage", "afterDamage", "secondary", "hits", "minimumHP"].some(
          (key) => definition[key] !== undefined,
        )
      )
        throw new Error(`effects.${id}: primary cannot mix with damage phases`);
      if (
        definition.target !== undefined &&
        !["self", "opponent"].includes(definition.target)
      )
        throw new Error(`effects.${id}.target: invalid target`);
      for (const key of ["supported", "alwaysHits"])
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
      ])
        if (definition[phase])
          this.operations.validate(definition[phase], `effects.${id}.${phase}`);
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
        (this.operations.operations[step.op].scope || "target") === scope,
    );
    this.operations.run(steps, context);
  }
}
