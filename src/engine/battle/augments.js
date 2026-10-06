import { inventoryCounts, inventoryQuantity } from "../inventory.js";
import { callSync, readOnly } from "../extensions/values.js";
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));
const positive = (value) => Number.isSafeInteger(value) && value > 0;
const scopes = ["battle", "alliance", "controller", "creature"];

/** Content describes eligibility and a bounded move replacement, never an imperative battle callback. */
export class BattleAugmentRegistry {
  constructor(definitions, db, effects) {
    this.definitions = new Map();
    const sharedLimits = new Map();
    for (const [id, d] of Object.entries(definitions || {})) {
      if (
        !exact(d, ["name", "moves", "select", "requires", "limit", "cost"]) ||
        !d.name ||
        typeof d.name !== "string" ||
        typeof d.select !== "function" ||
        (d.requires !== undefined && typeof d.requires !== "function") ||
        !Array.isArray(d.moves) ||
        !d.moves.length ||
        new Set(d.moves).size !== d.moves.length
      )
        throw new Error(`Invalid battle augment ${id}`);
      for (const move of d.moves) {
        if (
          !db.moves[move] ||
          !effects.supports(db.moves[move].effect) ||
          effects.get(db.moves[move].effect).action
        )
          throw new Error(
            `Battle augment ${id}: replacement must reference a supported immediate move`,
          );
      }
      if (
        d.limit !== undefined &&
        (!exact(d.limit, ["scope", "key", "max"]) ||
          !scopes.includes(d.limit.scope) ||
          !positive(d.limit.max) ||
          (d.limit.key !== undefined &&
            (typeof d.limit.key !== "string" || !d.limit.key)))
      )
        throw new Error(`Invalid battle augment limit ${id}`);
      if (
        d.cost !== undefined &&
        (!exact(d.cost, ["pp", "item", "count"]) ||
          (d.cost.pp !== undefined && !positive(d.cost.pp)) ||
          (d.cost.item !== undefined && !db.items[d.cost.item]) ||
          (d.cost.count !== undefined &&
            (!d.cost.item || !positive(d.cost.count))))
      )
        throw new Error(`Invalid battle augment cost ${id}`);
      if (d.limit) {
        const key = JSON.stringify([d.limit.scope, d.limit.key || id]);
        if (sharedLimits.has(key) && sharedLimits.get(key) !== d.limit.max)
          throw new Error("Conflicting shared battle augment limit");
        sharedLimits.set(key, d.limit.max);
      }
      this.definitions.set(
        id,
        Object.freeze({
          ...d,
          moves: Object.freeze([...d.moves]),
          cost: readOnly(d.cost || {}),
          limit: d.limit ? readOnly(d.limit) : null,
        }),
      );
    }
  }
  get(id) {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown battle augment ${id}`);
    return definition;
  }
}

/** Ephemeral battle-owned usage ledger and payment policy. Choice/cancel do not consume resources. */
export class BattleAugments {
  constructor(battle, registry) {
    this.battle = battle;
    this.registry = registry;
  }
  /** Shared with attachments so an explicit limit key spends one cross-mechanism pool. */
  get used() {
    return this.battle.quotas.used;
  }
  limit(action, d) {
    if (!d.limit) return null;
    const b = this.battle,
      owner = b.roster.owner(action.seat);
    const subject = {
      battle: "battle",
      alliance: b.roster.alliance(action.seat),
      controller: owner.id,
      creature: b.roster.occupant(action.seat).uid,
    }[d.limit.scope];
    return {
      scope: d.limit.scope,
      subject,
      key: d.limit.key || action.augment,
      max: d.limit.max,
    };
  }
  key(limit) {
    return JSON.stringify([limit.scope, limit.subject, limit.key]);
  }
  inspect(action, { reserve = true } = {}) {
    const b = this.battle,
      d = this.registry.get(action.augment),
      mon = b.roster.occupant(action.seat),
      owner = b.roster.owner(action.seat),
      slot = b.movesFor(action.seat)[action.index];
    if (
      !(mon?.hp > 0) ||
      !slot ||
      !b.moveAvailable(action.seat, action.index) ||
      slot.pp < (d.cost.pp || 1)
    )
      return { ok: false, reason: "增强行动的原招式当前不可用。" };
    const limit = this.limit(action, d),
      pending = reserve ? [...(b.decisions?.pending.values() || [])] : [];
    const reserved =
      limit && reserve ? b.reservedQuota(this.key(limit)) : 0;
    const used = limit ? this.used.get(this.key(limit))?.count || 0 : 0;
    if (limit && used + reserved >= limit.max)
      return { ok: false, reason: "这项增强的使用次数已用完或被预留。" };
    if (d.cost.item) {
      const held = pending
        .filter((a) => b.roster.owner(a.seat).id === owner.id)
        .reduce((sum, a) => {
          const cost = a.augment ? this.registry.get(a.augment).cost : null;
          return (
            sum +
            (a.kind === "item" && a.item === d.cost.item
              ? 1
              : cost?.item === d.cost.item
                ? cost.count || 1
                : 0)
          );
        }, 0);
      if (
        inventoryQuantity(owner.bag, d.cost.item) <
        (d.cost.count || 1) + held
      )
        return { ok: false, reason: "增强行动所需的道具不足或已被预留。" };
    }
    const context = readOnly({
      actor: {
        ...mon,
        types: [
          ...(b.forms.effective(mon).types ||
            b.db.species[b.forms.effective(mon).species].types),
        ],
      },
      sourceMove: { ...b.db.moves[slot.id], id: slot.id },
      seat: action.seat,
      controller: {
        id: owner.id,
        alliance: b.roster.alliance(action.seat),
        bag: inventoryCounts(owner.bag),
      },
      turn: b.turn,
      weather: b.weather?.kind || null,
    });
    if (d.requires) {
      const allowed = callSync(d.requires, [context]);
      if (typeof allowed !== "boolean")
        throw new Error("Battle augment eligibility must return a boolean");
      if (!allowed) return { ok: false, reason: "当前不满足增强行动的条件。" };
    }
    const moveId = callSync(d.select, [context]);
    if (!d.moves.includes(moveId))
      throw new Error("Battle augment selected an undeclared replacement move");
    return {
      ok: true,
      moveId,
      sourceMoveId: slot.id,
      limit,
      remaining: limit ? limit.max - used - reserved : null,
      cost: d.cost,
    };
  }
  prepare(action) {
    const result = this.inspect(action);
    return result.ok
      ? {
          ...action,
          augmentedMove: result.moveId,
          sourceMoveId: result.sourceMoveId,
        }
      : { error: result.reason };
  }
  options(seat, index) {
    if (!seat || !(this.battle.roster.occupant(seat)?.hp > 0)) return [];
    return [...this.registry.definitions].flatMap(([id, d]) => {
      const result = this.inspect({ seat, index, augment: id });
      return result.ok
        ? [
            {
              id,
              name: d.name,
              index,
              moveId: result.moveId,
              cost: result.cost,
              remaining: result.remaining,
            },
          ]
        : [];
    });
  }
  check(action) {
    const result = this.inspect(action, { reserve: false });
    return result.ok &&
      result.moveId === action.augmentedMove &&
      result.sourceMoveId === action.sourceMoveId
      ? result
      : { ok: false, reason: result.reason || "增强行动的条件已经改变。" };
  }
  commit(action, checked) {
    const b = this.battle,
      owner = b.roster.owner(action.seat);
    if (checked.cost.item) {
      const result = b.items.inventory.apply(owner.bag, [
        {
          kind: "remove",
          item: checked.cost.item,
          count: checked.cost.count || 1,
        },
      ]);
      if (!result.ok) throw new Error(result.reason);
    }
    if (checked.limit) {
      const key = this.key(checked.limit);
      this.used.set(key, {
        ...checked.limit,
        count: (this.used.get(key)?.count || 0) + 1,
      });
    }
    b.emit(
      `${b.name(b.roster.occupant(action.seat))} 发动了 ${this.registry.get(action.augment).name}！`,
      "augment",
      {
        actorSeat: action.seat,
        augmentId: action.augment,
        sourceMoveId: checked.sourceMoveId,
        moveId: checked.moveId,
      },
    );
  }
  view() {
    return readOnly([...this.used.values()]);
  }
}
