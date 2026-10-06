import { inventoryCounts } from "../inventory.js";
import { callSync, readOnly, validateSchema, validateValue } from "../extensions/values.js";
import { TARGET_MODES } from "./targeting.js";
const exact = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));
const positive = (value) => Number.isSafeInteger(value) && value > 0;
export const ATTACHMENT_COMMIT_POINTS = Object.freeze([
  "beforeOrder",
  "beforeAction",
  "moveStart",
]);
const policies = ["failAction", "continueBase"];
const scopes = ["battle", "alliance", "controller", "creature"];
/** Numeric/transform phases an action-scoped attachment modifier may bind to. */
const MODIFIER_PHASES = new Set([
  "attack",
  "defense",
  "power",
  "base-damage",
  "damage-modifier",
  "damage-preview",
  "pre-type-damage",
  "screen",
  "burn-modifier",
  "speed-base",
  "speed",
  "accuracy",
  "critical-stage",
  "critical-check",
  "secondary-chance",
  "pp-cost",
  "action-order",
  "type",
  "form",
]);

/** B1: a prepared action may carry one registered attachment (form change, future derived move/effect). */
export class BattleAttachmentRegistry {
  constructor(definitions, db, forms) {
    this.definitions = new Map();
    const sharedLimits = new Map();
    for (const [id, d] of Object.entries(definitions || {})) {
      if (
        !exact(d, [
          "name",
          "commitPoint",
          "requires",
          "parameters",
          "limit",
          "transition",
          "deriveMove",
          "modifiers",
          "pp",
          "unavailablePolicy",
        ]) ||
        typeof d.name !== "string" ||
        !d.name ||
        !ATTACHMENT_COMMIT_POINTS.includes(d.commitPoint) ||
        (d.requires !== undefined && typeof d.requires !== "function") ||
        (d.deriveMove !== undefined && typeof d.deriveMove !== "function") ||
        (d.pp !== undefined && d.pp !== "clear") ||
        (d.modifiers !== undefined &&
          (!Array.isArray(d.modifiers) ||
            !d.modifiers.length ||
            d.modifiers.length > 8 ||
            d.modifiers.some(
              (mod) =>
                !exact(mod, ["phase", "priority", "modify"]) ||
                !MODIFIER_PHASES.has(mod.phase) ||
                typeof mod.modify !== "function" ||
                (mod.priority !== undefined && !Number.isFinite(mod.priority)),
            ))) ||
        (d.transition !== undefined &&
          (!exact(d.transition, ["form"]) || typeof d.transition.form !== "string")) ||
        (d.unavailablePolicy !== undefined && !policies.includes(d.unavailablePolicy))
      )
        throw new Error(`Invalid battle attachment ${id}`);
      if (d.transition && !forms.definitions[d.transition.form])
        throw new Error(`Battle attachment ${id}: unknown form`);
      if (
        d.limit !== undefined &&
        (!exact(d.limit, ["scope", "key", "max"]) ||
          !scopes.includes(d.limit.scope) ||
          !positive(d.limit.max) ||
          (d.limit.key !== undefined &&
            (typeof d.limit.key !== "string" || !d.limit.key)))
      )
        throw new Error(`Invalid battle attachment limit ${id}`);
      if (d.limit) {
        const key = JSON.stringify([d.limit.scope, d.limit.key || id]);
        if (sharedLimits.has(key) && sharedLimits.get(key) !== d.limit.max)
          throw new Error("Conflicting shared battle attachment limit");
        sharedLimits.set(key, d.limit.max);
      }
      this.definitions.set(
        id,
        Object.freeze({
          ...d,
          parameters: validateSchema(d.parameters || { type: "object", properties: {}, required: [], additionalProperties: false }),
          limit: d.limit ? readOnly(d.limit) : null,
          transition: d.transition ? readOnly(d.transition) : null,
          modifiers: d.modifiers
            ? Object.freeze(d.modifiers.map((mod) => Object.freeze({ ...mod })))
            : null,
          pp: d.pp || null,
          unavailablePolicy: d.unavailablePolicy || "continueBase",
        }),
      );
    }
  }
  get(id) {
    const definition = this.definitions.get(id);
    if (!definition) throw new Error(`Unknown battle attachment ${id}`);
    return definition;
  }
}

/** Ephemeral battle-owned usage ledger. Selection never mutates state; commit happens at the point. */
export class BattleAttachments {
  constructor(battle, registry) {
    this.battle = battle;
    this.registry = registry;
  }
  /** Shared with augments so an explicit limit key spends one cross-mechanism pool. */
  get used() {
    return this.battle.quotas.used;
  }
  entries(action) {
    return action.attachments || [];
  }
  limit(action, entry, d) {
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
      key: d.limit.key || entry.id,
      max: d.limit.max,
    };
  }
  key(limit) {
    return JSON.stringify([limit.scope, limit.subject, limit.key]);
  }
  context(action, parameters = {}) {
    const b = this.battle,
      mon = b.roster.occupant(action.seat),
      owner = b.roster.owner(action.seat),
      slot = b.movesFor(action.seat)[action.index];
    return readOnly({
      actor: {
        ...mon,
        types: [
          ...(b.forms.effective(mon).types ||
            b.db.species[b.forms.effective(mon).species].types),
        ],
      },
      sourceMove: slot ? { ...b.db.moves[slot.id], id: slot.id } : null,
      seat: action.seat,
      controller: {
        id: owner.id,
        alliance: b.roster.alliance(action.seat),
        bag: inventoryCounts(owner.bag),
      },
      parameters,
      turn: b.turn,
      weather: b.weather?.kind || null,
    });
  }
  inspect(action, entry, { reserve = true, validateParameters = true } = {}) {
    const b = this.battle,
      d = this.registry.get(entry.id),
      mon = b.roster.occupant(action.seat),
      owner = b.roster.owner(action.seat),
      slot = b.movesFor(action.seat)[action.index];
    if (!(mon?.hp > 0) || !slot || !b.moveAvailable(action.seat, action.index))
      return { ok: false, reason: "附加项的原招式当前不可用。" };
    if (validateParameters) validateValue(d.parameters, entry.parameters || {});
    if (d.transition && !b.forms.canActivate(mon, d.transition.form, owner.id))
      return { ok: false, reason: "现在无法进行该形态变化。" };
    const limit = this.limit(action, entry, d);
    const reserved = limit && reserve ? b.reservedQuota(this.key(limit)) : 0;
    const used = limit ? this.used.get(this.key(limit))?.count || 0 : 0;
    if (limit && used + reserved >= limit.max)
      return { ok: false, reason: "这项附加效果的使用次数已用完或被预留。" };
    if (d.requires) {
      const allowed = callSync(d.requires, [
        this.context(action, entry.parameters),
      ]);
      if (typeof allowed !== "boolean")
        throw new Error("Battle attachment eligibility must return a boolean");
      if (!allowed) return { ok: false, reason: "当前不满足附加项的条件。" };
    }
    return {
      ok: true,
      definition: d,
      limit,
      remaining: limit ? limit.max - used - reserved : null,
    };
  }
  derive(action, entry, d) {
    const value = callSync(d.deriveMove, [
      this.context(action, entry.parameters),
    ]);
    if (
      !value ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.keys(value).some(
        (key) =>
          !["power", "type", "category", "target", "priority", "effect"].includes(
            key,
          ),
      )
    )
      throw new Error("Invalid derived move plan");
    if (
      value.power !== undefined &&
      (!Number.isInteger(value.power) || value.power < 0 || value.power > 250)
    )
      throw new Error("Invalid derived move power");
    if (value.type !== undefined && !this.battle.db.typeChart[value.type])
      throw new Error("Invalid derived move type");
    if (
      value.category !== undefined &&
      !["physical", "special"].includes(value.category)
    )
      throw new Error("Invalid derived move category");
    if (value.target !== undefined && !TARGET_MODES.has(value.target))
      throw new Error("Invalid derived move target");
    if (
      value.priority !== undefined &&
      (!Number.isInteger(value.priority) || Math.abs(value.priority) > 7)
    )
      throw new Error("Invalid derived move priority");
    if (value.effect !== undefined) {
      if (
        !this.battle.moveEffects.supports(value.effect) ||
        this.battle.moveEffects.get(value.effect).action
      )
        throw new Error("Invalid derived move effect");
    }
    return readOnly(value);
  }
  prepare(action) {
    const requested = this.entries(action);
    if (!requested.length) return { ...action };
    const normalized = [];
    let derivedMove = null,
      transitions = 0,
      derivations = 0;
    for (const entry of requested) {
      const d = this.registry.get(entry.id);
      const result = this.inspect(action, entry);
      if (!result.ok) return { error: result.reason };
      if (d.transition && ++transitions > 1)
        return { error: "每个行动最多一个形态附加项。" };
      if (d.deriveMove && ++derivations > 1)
        return { error: "每个行动最多一个派生附加项。" };
      normalized.push({
        id: entry.id,
        parameters: entry.parameters || {},
        committed: false,
        applied: false,
      });
      if (d.deriveMove) derivedMove = this.derive(action, entry, d);
    }
    return { ...action, attachments: normalized, derivedMove };
  }
  options(seat, index) {
    if (!seat || !(this.battle.roster.occupant(seat)?.hp > 0)) return [];
    return [...this.registry.definitions].flatMap(([id, d]) => {
      const result = this.inspect({ seat, index }, { id, parameters: {} }, {
        validateParameters: false,
      });
      return result.ok
        ? [
            {
              id,
              name: d.name,
              commitPoint: d.commitPoint,
              transition: d.transition?.form || null,
              derives: !!d.deriveMove,
              parameters: d.parameters,
              remaining: result.remaining,
            },
          ]
        : [];
    });
  }
  check(action) {
    for (const entry of this.entries(action)) {
      const result = this.inspect(action, entry, { reserve: false });
      if (!result.ok) return result;
      if (result.definition.deriveMove) {
        const derived = this.derive(action, entry, result.definition);
        if (JSON.stringify(derived) !== JSON.stringify(action.derivedMove))
          return { ok: false, reason: "附加项的派生招式条件已改变。" };
      }
    }
    return { ok: true };
  }
  commit(action, entry, d) {
    const b = this.battle;
    if (d.limit) {
      const limit = this.limit(action, entry, d),
        key = this.key(limit);
      this.used.set(key, {
        ...limit,
        count: (this.used.get(key)?.count || 0) + 1,
      });
    }
    if (d.pp === "clear") action.ppClear = true;
    if (d.transition) {
      const mon = b.roster.occupant(action.seat);
      if (!b.forms.activate(mon, d.transition.form, b.roster.owner(action.seat).id))
        throw new Error("Battle attachment form activation failed");
      b.emit("形态发生了变化！", "form", {
        targetSeat: action.seat,
        actorSeat: action.seat,
        formId: d.transition.form,
        message: { id: "form-changed", params: {} },
      });
    }
    b.emit(`${b.name(b.roster.occupant(action.seat))} 发动了 ${d.name}！`, "attachment", {
      actorSeat: action.seat,
      attachmentId: entry.id,
      commitPoint: d.commitPoint,
    });
  }
  /** Apply every due attachment when its commit point is reached. Returns null when none is due. */
  applyPoint(action, point) {
    const due = this.entries(action).filter(
      (entry) => !entry.applied && this.registry.get(entry.id).commitPoint === point,
    );
    if (!due.length) return null;
    let failed = null,
      skipped = null;
    for (const entry of due) {
      entry.applied = true;
      const d = this.registry.get(entry.id);
      const checked = this.inspect(action, entry, { reserve: false });
      if (!checked.ok) {
        // Drop any prepared derivation so a skipped attachment cannot still apply it for free.
        if (d.deriveMove) action.derivedMove = null;
        if (d.unavailablePolicy === "failAction") failed = checked.reason;
        else skipped = checked.reason;
        continue;
      }
      this.commit(action, entry, d);
      entry.committed = true;
    }
    if (failed) return { failed: true, reason: failed };
    if (skipped) return { skipped: true, reason: skipped };
    return { applied: true };
  }
  view() {
    return readOnly([...this.used.values()]);
  }
}
