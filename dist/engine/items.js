import { EffectRegistry } from "./effects.js";

/** Item effects run on a draft: invalid use never consumes an item or alters a target. */
export class ItemService {
  /** @param {Record<string, import("./contracts.js").ItemDefinition>} definitions */
  constructor(definitions, registry = new EffectRegistry()) {
    this.definitions = definitions;
    this.registry = registry;
    for (const [id, item] of Object.entries(definitions)) {
      if (
        !item.name ||
        !Number.isInteger(item.price) ||
        item.price < 0 ||
        !Array.isArray(item.contexts) ||
        !item.contexts.length ||
        item.contexts.some((v) => !["field", "battle"].includes(v)) ||
        !["party", "enemy"].includes(item.target)
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
      return { ok: true, item, captureBonus: item.effects[0].bonus };
    }
    const target = Number.isInteger(index) ? party[index] : null;
    if (!target || target.hp <= 0)
      return { ok: false, reason: "请选择还能战斗的伙伴。" };
    const draft = { ...target, stats: { ...target.stats } };
    const changed = this.registry
      .run(item.effects, { target: draft })
      .some(Boolean);
    return changed
      ? {
          ok: true,
          item,
          target,
          draft,
          before: { hp: target.hp, status: target.status, sleep: target.sleep },
        }
      : { ok: false, reason: "使用后不会产生效果。" };
  }
  commit(plan, bag, id) {
    if (!plan.ok || plan.committed || !(bag[id] > 0)) return false;
    if (
      plan.target &&
      Object.entries(plan.before).some(
        ([key, value]) => plan.target[key] !== value,
      )
    )
      return false;
    if (plan.target)
      Object.assign(plan.target, {
        hp: plan.draft.hp,
        status: plan.draft.status,
        sleep: plan.draft.sleep,
      });
    bag[id]--;
    plan.committed = true;
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
export const ITEM_OPERATIONS = { capture };
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
