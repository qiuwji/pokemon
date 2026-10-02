import {
  applyNutrition,
  validateFood,
  NUTRITION_FIELDS,
} from "./growth/nutrition.js";
import { EffectRegistry } from "./effects.js";

/** Item effects run on a draft: invalid use never consumes an item or alters a target. */
export class ItemService {
  /** @param {Record<string, import("./contracts.js").ItemDefinition>} definitions */
  constructor(definitions, registry = new EffectRegistry(ITEM_OPERATIONS)) {
    this.definitions = definitions;
    this.registry = registry;
    this.plans = new WeakMap();
    for (const [id, item] of Object.entries(definitions)) {
      if (
        !item.name ||
        !Number.isInteger(item.price) ||
        item.price < 0 ||
        !Array.isArray(item.contexts) ||
        (!item.contexts.length && !item.holdable) ||
        item.contexts.some((v) => !["field", "battle"].includes(v)) ||
        !["party", "enemy"].includes(item.target) ||
        (item.requiresAlive !== undefined &&
          typeof item.requiresAlive !== "boolean")
      )
        throw new Error(`items.${id}: invalid definition`);
      if (
        item.target === "party" &&
        item.effects.some((s) => s.op === "capture")
      )
        throw new Error(`items.${id}: capture requires an enemy target`);
      registry.validate(item.effects, `items.${id}.effects`);
      if (
        item.target === "enemy" &&
        (item.effects.length !== 1 || item.effects[0].op !== "capture")
      )
        throw new Error(`items.${id}: capture must be the sole enemy effect`);
    }
  }
  prepare({ id, bag, party, index, context, enemy, canCapture = true }) {
    const item = Object.hasOwn(this.definitions, id)
      ? this.definitions[id]
      : null;
    if (!item || !item.contexts.includes(context) || !(bag[id] > 0))
      return { ok: false, reason: "现在无法使用这个道具。" };
    if (item.target === "enemy") {
      if (!enemy || enemy.hp <= 0 || !canCapture)
        return { ok: false, reason: "现在不能捕捉对方的宝可梦！" };
      const plan = { ok: true, item, captureBonus: item.effects[0].bonus };
      this.plans.set(plan, { bag, id, party, target: null });
      return plan;
    }
    const target = Number.isInteger(index) ? party[index] : null;
    if (
      !target ||
      target.egg ||
      (item.requiresAlive !== false && target.hp <= 0)
    )
      return { ok: false, reason: "请选择还能战斗的伙伴。" };
    const draft = structuredClone(target);
    const changed = this.registry
      .run(item.effects, { target: draft })
      .some(Boolean);
    if (!changed) return { ok: false, reason: "使用后不会产生效果。" };
    const fields = ["hp", "status", "sleep", "friendship", ...NUTRITION_FIELDS];
    for (const key of Object.keys(target)) {
      if (
        !fields.includes(key) &&
        JSON.stringify(target[key]) !== JSON.stringify(draft[key])
      )
        throw new Error(`Item effect cannot change protected field ${key}`);
    }
    if (
      !Number.isInteger(draft.hp) ||
      draft.hp < 0 ||
      draft.hp > draft.stats.hp ||
      ["friendship", ...NUTRITION_FIELDS].some(
        (key) =>
          draft[key] !== undefined &&
          (!Number.isInteger(draft[key]) || draft[key] < 0 || draft[key] > 255),
      )
    )
      throw new Error("Item effect produced invalid target values");
    const plan = {
      ok: true,
      item,
      target,
      draft,
      before: { hp: target.hp, status: target.status, sleep: target.sleep },
    };
    this.plans.set(plan, {
      bag,
      id,
      party,
      target,
      fingerprint: JSON.stringify(target),
      draft: structuredClone(draft),
    });
    return plan;
  }
  commit(plan, bag, id) {
    const saved = this.plans.get(plan);
    if (
      !saved ||
      saved.bag !== bag ||
      saved.id !== id ||
      !(bag[id] > 0) ||
      (saved.target &&
        (!saved.party.includes(saved.target) ||
          saved.fingerprint !== JSON.stringify(saved.target)))
    )
      return false;
    if (saved.target)
      for (const field of [
        "hp",
        "status",
        "sleep",
        "friendship",
        ...NUTRITION_FIELDS,
      ])
        if (Object.hasOwn(saved.draft, field))
          saved.target[field] = saved.draft[field];
    bag[id]--;
    plan.committed = true;
    this.plans.delete(plan);
    return true;
  }
  use(options) {
    const plan = this.prepare(options);
    if (plan.ok) plan.ok = this.commit(plan, options.bag, options.id);
    return plan;
  }
}
// These are engine compatibility defaults; packs can supply their own definitions.
const capture = () => true;
capture.validate = (s, p) => {
  if (!Number.isFinite(s.bonus) || s.bonus <= 0)
    throw new Error(`${p}.bonus: must be positive`);
};
const feed = (c, s) => applyNutrition(c.target, s);
feed.validate = validateFood;
export const ITEM_OPERATIONS = { capture, feed };
export const DEFAULT_ITEMS = {
  potion: {
    name: "伤药",
    price: 300,
    contexts: ["field", "battle"],
    target: "party",
    effects: [{ op: "restoreHP", amount: 20 }],
  },
  pokeball: {
    name: "精灵球",
    price: 200,
    contexts: ["battle"],
    target: "enemy",
    effects: [{ op: "capture", bonus: 1 }],
  },
};
export const createItemService = (definitions = DEFAULT_ITEMS) =>
  new ItemService(definitions, new EffectRegistry(ITEM_OPERATIONS));
