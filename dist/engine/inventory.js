import { jsonValue, readOnly } from "./extensions/values.js";

const failure = (code, reason) => ({ ok: false, code, reason });
const object = (value) =>
  value && typeof value === "object" && !Array.isArray(value);
const fingerprint = (state) =>
  JSON.stringify(
    Object.keys(state.pockets)
      .sort()
      .map((id) => [id, state.pockets[id]]),
  );
export const emptyInventory = () => ({ pockets: {} });

/** One slot truth. Plans contain detached changes; their draft, custody and commit identity remain private. */
export class InventoryService {
  constructor(registry) {
    this.registry = registry;
    this.plans = new WeakMap();
  }
  validate(state) {
    jsonValue(state);
    if (
      !object(state) ||
      Object.keys(state).length !== 1 ||
      !Object.hasOwn(state, "pockets") ||
      !object(state.pockets)
    )
      throw new Error("Invalid inventory state");
    for (const [id, slots] of Object.entries(state.pockets)) {
      const policy = this.registry.get(id),
        seen = new Set();
      if (!Array.isArray(slots) || slots.length !== policy.capacity)
        throw new Error(`Invalid inventory slots ${id}`);
      for (const slot of slots) {
        if (slot === null) continue;
        if (
          !object(slot) ||
          Object.keys(slot).length !== 2 ||
          !Object.hasOwn(slot, "item") ||
          !Object.hasOwn(slot, "count") ||
          this.registry.pocketOf(slot.item) !== id ||
          !Number.isSafeInteger(slot.count) ||
          slot.count < 1 ||
          slot.count > policy.stackLimit ||
          (!policy.allowDuplicates && seen.has(slot.item))
        )
          throw new Error(`Invalid inventory slot ${id}`);
        seen.add(slot.item);
      }
    }
    return true;
  }
  quantity(state, item) {
    const pocket = this.registry.pocketOf(item);
    return (state.pockets[pocket] || []).reduce(
      (count, slot) => count + (slot?.item === item ? slot.count : 0),
      0,
    );
  }
  counts(state) {
    const counts = {};
    for (const slots of Object.values(state.pockets))
      for (const slot of slots)
        if (slot) counts[slot.item] = (counts[slot.item] || 0) + slot.count;
    return readOnly(counts);
  }
  view(state) {
    this.validate(state);
    return readOnly({
      counts: this.counts(state),
      pockets: Object.fromEntries(
        Object.entries(this.registry.definitions).map(([id, policy]) => {
          const slots = state.pockets[id] || Array(policy.capacity).fill(null);
          return [id, { ...policy, used: slots.filter(Boolean).length, slots }];
        }),
      ),
    });
  }
  validateOperation(op) {
    if (
      !object(op) ||
      !["add", "remove"].includes(op.kind) ||
      Object.keys(op).some(
        (key) => !["kind", "item", "count", "slot"].includes(key),
      ) ||
      !Number.isSafeInteger(op.count) ||
      op.count < 1
    )
      throw new Error("Invalid inventory operation");
    const pocket = this.registry.pocketOf(op.item);
    if (
      op.slot !== undefined &&
      (op.kind !== "remove" ||
        !object(op.slot) ||
        Object.keys(op.slot).length !== 3 ||
        op.slot.pocket !== pocket ||
        op.slot.item !== op.item ||
        !Number.isSafeInteger(op.slot.index) ||
        op.slot.index < 0 ||
        op.slot.index >= this.registry.get(pocket).capacity)
    )
      throw new Error("Invalid inventory slot reference");
  }
  prepare(state, operations) {
    this.validate(state);
    if (!Array.isArray(operations))
      throw new Error("Expected inventory operations");
    const commands = jsonValue(operations);
    commands.forEach((op) => this.validateOperation(op));
    const draft = jsonValue(state);
    for (const op of commands) {
      const id = this.registry.pocketOf(op.item),
        policy = this.registry.get(id);
      const slots = (draft.pockets[id] ||= Array(policy.capacity).fill(null));
      if (op.slot && slots[op.slot.index]?.item !== op.item)
        return failure("stale-slot", "选择的道具位置已改变，请重新选择。");
      let remaining = op.count;
      if (op.kind === "add") {
        for (const slot of slots)
          if (slot?.item === op.item) {
            const count = Math.min(remaining, policy.stackLimit - slot.count);
            slot.count += count;
            remaining -= count;
          }
        const hasItem = slots.some((slot) => slot?.item === op.item);
        if (
          !policy.allowDuplicates &&
          (remaining > policy.stackLimit || (remaining && hasItem))
        )
          return failure("full", "这个口袋无法装下全部道具。");
        for (let index = 0; remaining && index < slots.length; index++)
          if (!slots[index]) {
            const count = Math.min(remaining, policy.stackLimit);
            slots[index] = { item: op.item, count };
            remaining -= count;
          }
        if (remaining) return failure("full", "这个口袋无法装下全部道具。");
      } else {
        const order = [...slots.keys()];
        if (op.slot) order.unshift(...order.splice(op.slot.index, 1));
        for (const index of order)
          if (slots[index]?.item === op.item) {
            const count = Math.min(remaining, slots[index].count);
            slots[index].count -= count;
            remaining -= count;
            if (!slots[index].count) slots[index] = null;
            if (!remaining) break;
          }
        if (remaining) return failure("insufficient", "背包里没有足够的道具。");
      }
    }
    const changes = [];
    for (const [pocket, slots] of Object.entries(draft.pockets)) {
      slots.forEach((after, index) => {
        const before = state.pockets[pocket]?.[index] ?? null;
        if (before?.item !== after?.item || before?.count !== after?.count)
          changes.push({ pocket, index, before, after });
      });
      if (slots.every((slot) => slot === null)) delete draft.pockets[pocket];
    }
    const plan = readOnly({ ok: true, changes });
    this.plans.set(plan, { state, before: fingerprint(state), draft });
    return plan;
  }
  check(plan, state) {
    const saved = this.plans.get(plan);
    if (!saved || saved.state !== state) return false;
    try {
      this.validate(state);
    } catch {
      return false;
    }
    return saved.before === fingerprint(state);
  }
  commit(plan, state) {
    const saved = this.plans.get(plan),
      valid = this.check(plan, state);
    this.plans.delete(plan);
    if (!valid) return false;
    state.pockets = saved.draft.pockets;
    return true;
  }
  apply(state, operations) {
    const plan = this.prepare(state, operations);
    return !plan.ok || this.commit(plan, state)
      ? plan
      : failure("stale-plan", "库存计划已失效，请重新操作。");
  }
}
