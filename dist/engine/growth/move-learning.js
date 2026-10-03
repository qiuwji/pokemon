import { callSync, readOnly, freeze } from "../extensions/values.js";
const failure = (reason) => ({ ok: false, reason });
/** Registered learning methods are policy data; the service owns custody, slots and atomic costs. */
export class MoveLearningService {
  constructor({
    db,
    methods = {},
    items = {},
    friendship = (context) => context.mon.friendship ?? 70,
  }) {
    this.db = db;
    this.methods = freeze(
      Object.fromEntries(
        Object.entries(methods).map(([id, value]) => [
          id,
          {
            ...value,
            ...(value?.species ? { species: [...value.species] } : {}),
          },
        ]),
      ),
    );
    this.friendship = friendship;
    this.plans = new WeakMap();
    this.protectedMoves = new Set();
    for (const [id, method] of Object.entries(this.methods)) {
      if (
        !method ||
        Object.keys(method).some(
          (key) =>
            ![
              "move",
              "item",
              "consume",
              "species",
              "eligible",
              "protectMove",
              "friendship",
            ].includes(key),
        ) ||
        !db.moves[method.move] ||
        !Number.isSafeInteger(method.consume) ||
        method.consume < 0 ||
        (method.item !== undefined &&
          (!items[method.item] || typeof method.item !== "string")) ||
        (!method.item && method.consume !== 0) ||
        (method.eligible !== undefined &&
          typeof method.eligible !== "function") ||
        ["protectMove", "friendship"].some(
          (key) =>
            method[key] !== undefined && typeof method[key] !== "boolean",
        ) ||
        (method.species !== undefined &&
          (!Array.isArray(method.species) ||
            new Set(method.species).size !== method.species.length ||
            method.species.some((species) => !db.species[species])))
      )
        throw new Error(`learningMethods.${id}: invalid definition`);
      if (method.protectMove) this.protectedMoves.add(method.move);
    }
    for (const [id, item] of Object.entries(items)) {
      if (
        item.learningMethod !== undefined &&
        (!this.methods[item.learningMethod] ||
          this.methods[item.learningMethod].item !== id)
      )
        throw new Error(`items.${id}: unknown or mismatched learning method`);
    }
  }
  canForget(move) {
    return !this.protectedMoves.has(move);
  }
  prepare(state, methodId, uid) {
    const method = Object.hasOwn(this.methods, methodId)
      ? this.methods[methodId]
      : null;
    const mon = state.party.find((mon) => mon.uid === uid);
    if (
      !method ||
      !mon ||
      mon.egg ||
      !Array.isArray(mon.moves) ||
      mon.moves.length < 1 ||
      mon.moves.length > 4
    )
      return failure("这位伙伴不能学习这个招式。");
    if (method.item && !(state.bag[method.item] >= Math.max(1, method.consume)))
      return failure("背包里没有所需道具。");
    if (mon.moves.some((slot) => slot.id === method.move))
      return failure("伙伴已经掌握了这个招式。");
    if (method.species && !method.species.includes(mon.species))
      return failure("这位伙伴不能学习这个招式。");
    const context = readOnly({
      mon,
      party: state.party,
      position: state.position ?? null,
      flags: state.flags ?? {},
      species: this.db.species[mon.species],
    });
    if (method.eligible) {
      const eligible = callSync(method.eligible, [context]);
      if (typeof eligible !== "boolean")
        throw new Error("Learning eligibility must return a boolean");
      if (!eligible) return failure("目前不符合学习条件。");
    }
    const friendship = method.friendship
      ? callSync(this.friendship, [context])
      : undefined;
    if (
      friendship !== undefined &&
      (!Number.isInteger(friendship) || friendship < 0 || friendship > 255)
    )
      throw new Error("Invalid learned friendship");
    const plan = readOnly({
      ok: true,
      uid,
      method: methodId,
      move: method.move,
      requiresReplacement: mon.moves.length >= 4,
      replaceable: mon.moves.flatMap((slot, index) =>
        this.canForget(slot.id) ? [index] : [],
      ),
      cost: { item: method.item ?? null, count: method.consume },
    });
    this.plans.set(plan, {
      state,
      mon,
      method,
      fingerprint: JSON.stringify(state.party),
      bag: state.bag,
      count: method.item ? state.bag[method.item] : null,
      environment: JSON.stringify([state.position, state.flags]),
      friendship,
    });
    return plan;
  }
  commit(plan, { state, index, cancel = false } = {}) {
    const saved = this.plans.get(plan);
    if (
      !saved ||
      state !== saved.state ||
      state.bag !== saved.bag ||
      JSON.stringify(state.party) !== saved.fingerprint ||
      JSON.stringify([state.position, state.flags]) !== saved.environment ||
      (saved.method.item && state.bag[saved.method.item] !== saved.count)
    ) {
      this.plans.delete(plan);
      return failure("学习计划已失效，请重新选择。");
    }
    if (cancel) {
      this.plans.delete(plan);
      return { ok: true, cancelled: true };
    }
    if (
      plan.requiresReplacement
        ? !Number.isInteger(index) || !plan.replaceable.includes(index)
        : index !== undefined
    )
      return failure("请选择可忘记的招式；秘传招式不能在这里遗忘。");
    const moves = structuredClone(saved.mon.moves);
    const slot = {
      id: saved.method.move,
      pp: this.db.moves[saved.method.move].pp,
    };
    if (plan.requiresReplacement) moves[index] = slot;
    else moves.push(slot);
    saved.mon.moves = moves;
    if (saved.friendship !== undefined) saved.mon.friendship = saved.friendship;
    if (saved.method.item && saved.method.consume)
      state.bag[saved.method.item] -= saved.method.consume;
    this.plans.delete(plan);
    return {
      ok: true,
      uid: saved.mon.uid,
      move: saved.method.move,
      replaced: plan.requiresReplacement ? index : null,
    };
  }
  use(state, method, uid, index) {
    const plan = this.prepare(state, method, uid);
    return plan.ok ? this.commit(plan, { state, index }) : plan;
  }
}
