import {
  readOnly,
  jsonValue,
  validateSchema,
  validateValue,
  callSync,
} from "./extensions/values.js";
import { validateCondition, matchesCondition } from "./conditions.js";
import { validateReward } from "./story.js";
const record = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => keys.includes(k));
const integer = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
const outcomes = ["win", "loss", "quit"];
export const emptyFacilities = () => ({ nextId: 1, results: [] });

/** Shared lifecycle; activity rules are registered independently of battle/contest/game-room UI. */
export class FacilityRegistry {
  constructor({
    definitions = {},
    activities = {},
    references = {},
    queries,
  } = {}) {
    this.queries = queries;
    this.references = references;
    this.activities = new Map();
    this.definitions = new Map();
    for (const [id, a] of Object.entries(activities)) {
      if (
        !record(a, [
          "parameters",
          "state",
          "initial",
          "actions",
          "onBattle",
          "validate",
        ]) ||
        !record(a.actions, Object.keys(a.actions || {})) ||
        !Object.keys(a.actions).length ||
        (a.onBattle !== undefined && typeof a.onBattle !== "function") ||
        (a.validate !== undefined && typeof a.validate !== "function")
      )
        throw new Error(`Invalid facility activity ${id}`);
      const parameters = validateSchema(a.parameters),
        state = validateSchema(a.state);
      validateValue(state, a.initial);
      const actions = {};
      for (const [key, action] of Object.entries(a.actions)) {
        if (
          !/^[a-z][a-z0-9_.-]{0,63}$/.test(key) ||
          !record(action, ["label", "schema", "draws", "decide"]) ||
          typeof action.label !== "string" ||
          !action.label ||
          typeof action.decide !== "function" ||
          (action.draws !== undefined &&
            (!Array.isArray(action.draws) ||
              action.draws.length > 32 ||
              action.draws.some((n) => !integer(n, 1, 0x100000000))))
        )
          throw new Error(`Invalid facility action ${id}:${key}`);
        actions[key] = {
          ...action,
          schema: validateSchema(action.schema),
          draws: [...(action.draws || [])],
        };
      }
      this.activities.set(id, {
        ...a,
        parameters,
        state,
        actions,
        initial: readOnly(a.initial),
      });
    }
    for (const [id, d] of Object.entries(definitions)) {
      if (
        !/^[a-zA-Z0-9_.:-]+$/.test(id) ||
        !record(d, ["name", "activity", "parameters", "requires", "team"]) ||
        typeof d.name !== "string" ||
        !d.name ||
        !this.activities.has(d.activity)
      )
        throw new Error(`Invalid facility ${id}`);
      validateCondition(d.requires, new Set(), "facility.requires", queries);
      const team = d.team;
      if (
        team !== undefined &&
        (!record(team, [
          "min",
          "max",
          "levelCap",
          "uniqueSpecies",
          "uniqueHeldItems",
          "bannedSpecies",
          "heldItems",
          "items",
          "healBetween",
        ]) ||
          !integer(team.min, 1, 6) ||
          !integer(team.max, team.min, 6) ||
          (team.levelCap !== undefined && !integer(team.levelCap, 1, 100)) ||
          [
            "uniqueSpecies",
            "uniqueHeldItems",
            "heldItems",
            "items",
            "healBetween",
          ].some(
            (k) => team[k] !== undefined && typeof team[k] !== "boolean",
          ) ||
          (team.bannedSpecies !== undefined &&
            (!Array.isArray(team.bannedSpecies) ||
              team.bannedSpecies.some(
                (s) => !Object.hasOwn(references.species || {}, s),
              ))))
      )
        throw new Error(`Invalid facility team ${id}`);
      const a = this.activities.get(d.activity);
      validateValue(a.parameters, d.parameters);
      if (a.validate) callSync(a.validate, [readOnly(d), readOnly(references)]);
      this.definitions.set(id, readOnly(d));
    }
  }
  get(id) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown facility ${id}`);
    return d;
  }
  activity(id) {
    return this.activities.get(this.get(id).activity);
  }
  valueTransfer(value) {
    if (!record(value, ["money", "items"]))
      throw new Error("Invalid facility transfer");
    validateReward(
      { id: "facility.transfer", ...value },
      this.references.items,
    );
  }
}

/** Session is transient; only completed results are saved. Prepared transitions cannot be reused. */
export class FacilitySession {
  #active = null;
  #ticket = null;
  #plans = new WeakMap();
  #revision = 0;
  constructor({ registry, state }) {
    this.registry = registry;
    this.state = state;
    if (
      !record(state, ["nextId", "results"]) ||
      !integer(state.nextId, 1, Number.MAX_SAFE_INTEGER) ||
      !Array.isArray(state.results)
    )
      throw new Error("Invalid facility state");
    const ids = new Set();
    for (const r of state.results) {
      if (
        !record(r, ["id", "facility", "outcome", "data"]) ||
        !/^facility\.[1-9]\d*$/.test(r.id) ||
        !integer(Number(r.id.slice(9)), 1, state.nextId - 1) ||
        ids.has(r.id) ||
        !outcomes.includes(r.outcome)
      )
        throw new Error("Invalid facility result");
      validateValue(registry.activity(r.facility).state, r.data);
      ids.add(r.id);
    }
  }
  get active() {
    return this.#active !== null;
  }
  view() {
    const actions =
      this.#active?.phase === "ready"
        ? Object.entries(
            this.registry.activity(this.#active.facility).actions,
          ).map(([id, a]) => ({ id, label: a.label, schema: a.schema }))
        : [];
    return readOnly({
      active: this.#active,
      actions,
      results: this.state.results,
    });
  }
  inspect(id, uids, party, world) {
    const d = this.registry.get(id),
      fail = (reason) => ({ ok: false, reason });
    if (this.active) return fail("请先完成或退出当前设施。");
    if (!matchesCondition(d.requires, world, this.registry.queries))
      return fail("还没有满足进入条件。");
    const min = d.team?.min || 0,
      max = d.team?.max || 0;
    if (
      !Array.isArray(uids) ||
      uids.length < min ||
      uids.length > max ||
      new Set(uids).size !== uids.length
    )
      return fail(`请选择 ${min}～${max} 位不同的伙伴。`);
    const members = uids.map((uid) => party.find((m) => m.uid === uid));
    if (
      members.some(
        (m) =>
          !m ||
          m.egg ||
          m.hp <= 0 ||
          d.team?.bannedSpecies?.includes(m.species),
      )
    )
      return fail("队伍中有无法参加的伙伴。");
    if (
      d.team?.uniqueSpecies &&
      new Set(members.map((m) => m.species)).size !== members.length
    )
      return fail("不允许重复物种。");
    const held = members.map((m) => m.heldItem).filter(Boolean);
    if (d.team?.uniqueHeldItems && new Set(held).size !== held.length)
      return fail("不允许重复持有道具。");
    return { ok: true };
  }
  enter(id, uids, party, world) {
    const check = this.inspect(id, uids, party, world);
    if (!check.ok) return check;
    if (this.state.nextId === Number.MAX_SAFE_INTEGER)
      throw new Error("Facility identity exhausted");
    this.#active = {
      id: `facility.${this.state.nextId++}`,
      facility: id,
      team: [...uids],
      phase: "ready",
      step: 0,
      data: structuredClone(this.registry.activity(id).initial),
    };
    this.#revision++;
    return { ok: true, event: this.event("entered") };
  }
  action(id) {
    if (this.#active?.phase !== "ready")
      throw new Error("Facility is not ready");
    const a = this.registry.activity(this.#active.facility).actions[id];
    if (!a) throw new Error("Unknown facility action");
    return a;
  }
  context(world, input, rolls = []) {
    return readOnly({
      parameters: this.registry.get(this.#active.facility).parameters,
      data: this.#active.data,
      input,
      rolls,
      world,
    });
  }
  prepareAction(id, input, world, rolls) {
    const action = this.action(id);
    validateValue(action.schema, input);
    if (
      !Array.isArray(rolls) ||
      rolls.length !== action.draws.length ||
      rolls.some((r, i) => !integer(r, 0, action.draws[i] - 1))
    )
      throw new Error("Invalid facility random samples");
    return this.plan(
      callSync(action.decide, [this.context(world, input, rolls)]),
    );
  }
  checkTicket(ticket) {
    if (this.#active?.phase !== "battle" || ticket !== this.#ticket)
      throw new Error("Stale facility battle result");
  }
  /** Failed settlement consumes no result/reward and releases the matching wait. */
  cancelBattle(ticket) {
    if (this.#active?.phase !== "battle" || ticket !== this.#ticket) return false;
    this.#active = { ...this.#active, phase: "ready" };
    this.#ticket = null;
    this.#revision++;
    return true;
  }
  prepareResult(ticket, result, world) {
    this.checkTicket(ticket);
    const activity = this.registry.activity(this.#active.facility);
    if (!activity.onBattle || !["win", "loss"].includes(result))
      throw new Error("Unsupported facility battle result");
    return this.plan(
      callSync(activity.onBattle, [this.context(world, {}), result]),
    );
  }
  prepareClaim() {
    if (this.#active?.phase !== "reward")
      throw new Error("No facility reward pending");
    return this.plan({
      data: this.#active.data,
      reward: this.#active.pendingReward,
      outcome: "win",
    });
  }
  prepareQuit() {
    if (!this.active || this.#active.phase === "battle")
      throw new Error("Finish the active battle first");
    return this.plan({ data: this.#active.data, outcome: "quit" });
  }
  plan(value) {
    const p = jsonValue(value);
    if (
      !record(p, [
        "data",
        "battle",
        "cost",
        "reward",
        "pendingReward",
        "outcome",
      ]) ||
      !Object.hasOwn(p, "data")
    )
      throw new Error("Invalid facility transition");
    validateValue(this.registry.activity(this.#active.facility).state, p.data);
    for (const key of ["cost", "reward", "pendingReward"])
      if (p[key] !== undefined) this.registry.valueTransfer(p[key]);
    if (p.outcome !== undefined && !["win", "loss", "quit"].includes(p.outcome))
      throw new Error("Invalid facility outcome");
    if (
      p.battle !== undefined &&
      (!record(p.battle, ["trainerId", "weather"]) ||
        !Object.hasOwn(
          this.registry.references.trainers || {},
          p.battle.trainerId,
        ) ||
        !this.registry.activity(this.#active.facility).onBattle ||
        (p.battle.weather !== undefined &&
          p.battle.weather !== null &&
          !Object.hasOwn(
            this.registry.references.battleWeather || {},
            p.battle.weather,
          )))
    )
      throw new Error("Invalid facility battle");
    if (
      (p.battle && (p.outcome || p.reward || p.pendingReward)) ||
      (p.pendingReward && (p.outcome || p.reward))
    )
      throw new Error("Conflicting facility transition");
    const plan = readOnly({
      ...p,
      transaction: `${this.#active.id}.${this.#active.step + 1}`,
    });
    this.#plans.set(plan, { revision: this.#revision, active: this.#active });
    return plan;
  }
  checkPlan(plan) {
    const stamp = this.#plans.get(plan);
    if (
      !stamp ||
      stamp.revision !== this.#revision ||
      stamp.active !== this.#active
    )
      throw new Error("Stale facility transition");
  }
  commit(plan) {
    this.checkPlan(plan);
    const active = {
      ...this.#active,
      data: structuredClone(plan.data),
      step: this.#active.step + 1,
      phase: plan.battle ? "battle" : plan.pendingReward ? "reward" : "ready",
    };
    delete active.pendingReward;
    if (plan.pendingReward)
      active.pendingReward = structuredClone(plan.pendingReward);
    const event = readOnly({
      kind: plan.outcome ? "finished" : "progress",
      ...active,
      ...(plan.outcome ? { outcome: plan.outcome } : {}),
    });
    if (plan.outcome) {
      this.state.results.push({
        id: active.id,
        facility: active.facility,
        outcome: plan.outcome,
        data: structuredClone(plan.data),
      });
      this.#active = null;
    } else this.#active = active;
    this.#ticket = plan.battle
      ? Object.freeze({
          session: active.id,
          step: active.step,
          trainerId: plan.battle.trainerId,
        })
      : null;
    this.#revision++;
    this.#plans.delete(plan);
    return { event, ticket: this.#ticket };
  }
  event(kind) {
    return readOnly({ kind, ...this.#active });
  }
}
