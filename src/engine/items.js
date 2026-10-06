import { validStatusValues } from "./creature-contract.js";
import {
  applyNutrition,
  validateFood,
  NUTRITION_FIELDS,
} from "./growth/nutrition.js";
import { EffectRegistry } from "./effects.js";

/** Item effects run on a draft: invalid use never consumes an item or alters a target. */
export class ItemService {
  /** @param {Record<string, import("./contracts.js").ItemDefinition>} definitions */
  constructor(
    definitions,
    registry = new EffectRegistry(ITEM_OPERATIONS),
    inventory = null,
  ) {
    this.definitions = definitions;
    this.registry = registry;
    this.inventory = inventory;
    this.plans = new WeakMap();
    for (const [id, item] of Object.entries(definitions)) {
      if (
        !item.name ||
        ["holdable", "shopStock", "registerable"].some(
          (key) => item[key] !== undefined && typeof item[key] !== "boolean",
        ) ||
        (item.pocket !== undefined &&
          (typeof item.pocket !== "string" ||
            !item.pocket ||
            item.pocket.length > 128)) ||
        !Number.isInteger(item.price) ||
        item.price < 0 ||
        !Array.isArray(item.contexts) ||
        (!item.contexts.length && item.effects?.length !== 0) ||
        item.contexts.some((v) => !["field", "battle"].includes(v)) ||
        !["party", "enemy", "field"].includes(item.target) ||
        (item.requiresAlive !== undefined &&
          typeof item.requiresAlive !== "boolean")
      )
        throw new Error(`items.${id}: invalid definition`);
      if (
        item.learningMethod !== undefined &&
        (typeof item.learningMethod !== "string" ||
          !item.learningMethod ||
          item.contexts.length !== 1 ||
          item.contexts[0] !== "field" ||
          item.target !== "party" ||
          item.effects.length)
      )
        throw new Error(
          `items.${id}: learning must use a field party method without item effects`,
        );
      if (
        item.target === "party" &&
        item.effects.some((s) => s.op === "capture")
      )
        throw new Error(`items.${id}: capture requires an enemy target`);
      if (
        item.target === "field" &&
        (item.contexts.length !== 1 ||
          item.contexts[0] !== "field" ||
          item.effects.length ||
          !Array.isArray(item.actions) ||
          !item.actions.length ||
          item.learningMethod)
      )
        throw new Error(
          `items.${id}: field targets require action bindings without consumable effects`,
        );
      if (item.actions !== undefined && item.target !== "field")
        throw new Error(`items.${id}: action bindings require a field target`);
      if (item.registerable === true && item.target !== "field")
        throw new Error(
          `items.${id}: shortcut registration requires a field action item`,
        );
      registry.validate(item.effects, `items.${id}.effects`);
      if (
        item.target === "enemy" &&
        (item.effects.length !== 1 || item.effects[0].op !== "capture")
      )
        throw new Error(`items.${id}: capture must be the sole enemy effect`);
    }
  }
  prepare({ id, bag, party, index, context, enemy, canCapture = true, slot }) {
    const item = Object.hasOwn(this.definitions, id)
      ? this.definitions[id]
      : null;
    if (
      !item ||
      !item.contexts.includes(context) ||
      !(this.inventory.quantity(bag, id) > 0)
    )
      return { ok: false, reason: "现在无法使用这个道具。" };
    if (item.target === "field")
      return { ok: false, reason: "请选择道具的野外行动。" };
    const cost = this.inventory.prepare(bag, [
      { kind: "remove", item: id, count: 1, ...(slot ? { slot } : {}) },
    ]);
    if (!cost.ok) return cost;
    if (item.target === "enemy") {
      if (!enemy || enemy.hp <= 0 || !canCapture)
        return { ok: false, reason: "现在不能捕捉对方的宝可梦！" };
      const plan = { ok: true, item, captureBonus: item.effects[0].bonus };
      this.plans.set(plan, { bag, id, party, target: null, cost });
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
    for (const key of new Set([
      ...Object.keys(target),
      ...Object.keys(draft),
    ])) {
      if (
        !fields.includes(key) &&
        (Object.hasOwn(target, key) !== Object.hasOwn(draft, key) ||
          JSON.stringify(target[key]) !== JSON.stringify(draft[key]))
      )
        throw new Error(`Item effect cannot change protected field ${key}`);
    }
    if (
      !validStatusValues(draft) ||
      !Number.isInteger(draft.hp) ||
      draft.hp < 0 ||
      draft.hp > draft.stats.hp ||
      ["friendship", ...NUTRITION_FIELDS].some(
        (key) =>
          (target[key] !== undefined && draft[key] === undefined) ||
          (draft[key] !== undefined &&
            (!Number.isInteger(draft[key]) ||
              draft[key] < 0 ||
              draft[key] > 255)),
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
      cost,
    });
    return plan;
  }
  commit(plan, bag, id) {
    const saved = this.plans.get(plan);
    if (
      !saved ||
      saved.bag !== bag ||
      saved.id !== id ||
      !this.inventory.check(saved.cost, bag) ||
      (saved.target &&
        (!saved.party.includes(saved.target) ||
          saved.fingerprint !== JSON.stringify(saved.target)))
    )
      return false;
    if (!this.inventory.commit(saved.cost, bag)) return false;
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
        else delete saved.target[field];
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
// Operations are reusable domain effects; all item content is supplied by a pack.
const capture = () => true;
capture.validate = (s, p) => {
  if (!Number.isFinite(s.bonus) || s.bonus <= 0)
    throw new Error(`${p}.bonus: must be positive`);
};
const feed = (c, s) => applyNutrition(c.target, s);
feed.validate = validateFood;
export const ITEM_OPERATIONS = { capture, feed };
export const createItemService = (definitions, inventory = null) =>
  new ItemService(definitions, new EffectRegistry(ITEM_OPERATIONS), inventory);
