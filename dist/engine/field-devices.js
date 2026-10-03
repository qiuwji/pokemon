import {
  callSync,
  readOnly,
  validateSchema,
  validateValue,
  objectSchema,
} from "./extensions/values.js";
const exact = (o, keys) =>
  o &&
  typeof o === "object" &&
  !Array.isArray(o) &&
  Object.keys(o).every((k) => keys.includes(k));
const id = (s) =>
  typeof s === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(s) &&
  !["__proto__", "constructor", "prototype"].includes(s);
const time = (n) =>
  Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
const phases = ["enter", "leave", "settle", "timer", "interact"];
export const emptyFieldDevices = () => ({
  revision: 0,
  elapsedMs: 0,
  records: {},
  timers: {},
  requests: {},
});
/** Device policy is pure; placement and persistence are content, not branches in movement. */
export class FieldDeviceCatalog {
  constructor({ mechanisms = {}, devices = {}, maps, actions }) {
    Object.assign(this, { maps, actions });
    this.mechanisms = new Map();
    this.devices = new Map();
    for (const [key, d] of Object.entries(mechanisms)) {
      if (
        !id(key) ||
        !exact(d, [
          "scope",
          "schema",
          "initialState",
          "configSchema",
          ...phases,
        ]) ||
        !["visit", "permanent"].includes(d.scope) ||
        !phases.some((p) => typeof d[p] === "function") ||
        phases.some((p) => d[p] !== undefined && typeof d[p] !== "function")
      )
        throw new Error("Invalid field mechanism");
      const schema = validateSchema(d.schema || objectSchema()),
        configSchema = validateSchema(d.configSchema || objectSchema()),
        initialState = readOnly(d.initialState || {});
      validateValue(schema, initialState);
      this.mechanisms.set(
        key,
        Object.freeze({ ...d, schema, configSchema, initialState }),
      );
    }
    for (const [key, value] of Object.entries(devices)) {
      const d = readOnly(value),
        m = maps[d.map],
        policy = this.mechanisms.get(d.mechanism);
      if (
        !id(key) ||
        !exact(d, ["map", "x", "y", "elevation", "mechanism", "config"]) ||
        !m ||
        !Number.isInteger(d.x) ||
        !Number.isInteger(d.y) ||
        d.x < 0 ||
        d.y < 0 ||
        d.x >= m.width ||
        d.y >= m.height ||
        !policy ||
        (d.elevation !== undefined &&
          (!Number.isInteger(d.elevation) ||
            d.elevation < 0 ||
            d.elevation > 14))
      )
        throw new Error("Invalid field device placement");
      validateValue(policy.configSchema, d.config || {});
      this.devices.set(
        key,
        readOnly({ ...d, id: key, config: d.config || {} }),
      );
    }
    this.ordered = [...this.devices.values()].sort((a, b) =>
      a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
    );
  }
  get(key) {
    const d = this.devices.get(key);
    if (!d) throw new Error("Unknown field device");
    return d;
  }
  action(request) {
    if (
      !exact(request, ["action", "input"]) ||
      !this.actions?.definitions.has(request.action)
    )
      throw new Error("Unknown device action");
    validateValue(
      this.actions.definitions.get(request.action).schema,
      request.input || {},
    );
  }
}
/** Frame-local timers pause with field simulation; RTC/offline scheduling belongs to WorldSchedule. */
export class FieldDevices {
  constructor({
    catalog,
    state = emptyFieldDevices(),
    context,
    prepareOperations,
    commitOperations,
  }) {
    Object.assign(this, {
      catalog,
      state,
      context,
      prepareOperations,
      commitOperations,
    });
    this.validate(state);
  }
  validate(s) {
    readOnly(s, 512 * 1024);
    if (
      !exact(s, ["revision", "elapsedMs", "records", "timers", "requests"]) ||
      !Number.isSafeInteger(s.revision) ||
      s.revision < 0 ||
      !time(s.elapsedMs) ||
      ![s.records, s.timers, s.requests].every((o) =>
        exact(o, [...this.catalog.devices.keys()]),
      ) ||
      Object.keys(s.records).length > 1024
    )
      throw new Error("Invalid saved field devices");
    for (const [key, data] of Object.entries(s.records))
      validateValue(
        this.catalog.mechanisms.get(this.catalog.get(key).mechanism).schema,
        data,
      );
    let timers = 0,
      requests = 0;
    for (const [key, entries] of Object.entries(s.timers)) {
      this.catalog.get(key);
      if (!exact(entries, Object.keys(entries)))
        throw new Error("Invalid device timers");
      for (const [name, t] of Object.entries(entries)) {
        if (
          !id(name) ||
          !exact(t, ["dueMs", "payload"]) ||
          !time(t.dueMs) ||
          !Object.hasOwn(t, "payload")
        )
          throw new Error("Invalid device timer");
        timers++;
      }
    }
    for (const [key, entries] of Object.entries(s.requests)) {
      this.catalog.get(key);
      if (!exact(entries, Object.keys(entries)))
        throw new Error("Invalid device requests");
      for (const [name, r] of Object.entries(entries)) {
        if (!id(name)) throw new Error("Invalid device request key");
        this.catalog.action(r);
        requests++;
      }
    }
    if (timers > 256 || requests > 64)
      throw new Error("Field device capacity exceeded");
  }
  matches(d, p) {
    return (
      d.map === p.map &&
      d.x === p.x &&
      d.y === p.y &&
      (d.elevation === undefined ||
        d.elevation === 0 ||
        p.elevation === 0 ||
        d.elevation === p.elevation)
    );
  }
  invoke(draft, device, phase, payload, effects) {
    const policy = this.catalog.mechanisms.get(device.mechanism),
      fn = policy[phase];
    if (!fn) return;
    const state = draft.records[device.id] ?? policy.initialState,
      context = readOnly({
        ...this.context(device),
        device,
        state,
        event: { phase, payload },
      }),
      decision = readOnly(callSync(fn, [context]), 65536);
    if (
      !exact(decision, [
        "state",
        "operations",
        "timers",
        "cancelTimers",
        "requests",
        "cancelRequests",
        "facts",
      ])
    )
      throw new Error("Invalid device decision");
    if (decision.state !== undefined) {
      validateValue(policy.schema, decision.state);
      draft.records[device.id] = structuredClone(decision.state);
    }
    for (const key of [
      "operations",
      "timers",
      "requests",
      "cancelTimers",
      "cancelRequests",
      "facts",
    ])
      if (
        decision[key] !== undefined &&
        (!Array.isArray(decision[key]) || decision[key].length > 128)
      )
        throw new Error("Invalid device effect list");
    effects.operations.push(...(decision.operations || []));
    for (const [list, table] of [
      ["cancelTimers", "timers"],
      ["cancelRequests", "requests"],
    ])
      for (const key of decision[list] || []) {
        if (!id(key)) throw new Error("Invalid device cancellation");
        delete draft[table][device.id]?.[key];
      }
    for (const t of decision.timers || []) {
      if (
        !exact(t, ["key", "delayMs", "payload"]) ||
        !id(t.key) ||
        !time(t.delayMs) ||
        t.delayMs > 60000
      )
        throw new Error("Invalid device timer request");
      (draft.timers[device.id] ||= {})[t.key] = {
        dueMs: draft.elapsedMs + t.delayMs,
        payload: t.payload ?? null,
      };
    }
    for (const r of decision.requests || []) {
      if (!exact(r, ["key", "action", "input"]) || !id(r.key))
        throw new Error("Invalid device action request");
      const request = { action: r.action, input: r.input || {} };
      this.catalog.action(request);
      (draft.requests[device.id] ||= {})[r.key] = request;
    }
    for (const fact of decision.facts || []) {
      if (!exact(fact, ["kind", "data"]) || !id(fact.kind))
        throw new Error("Invalid device fact");
      effects.facts.push({
        device: device.id,
        kind: fact.kind,
        data: fact.data ?? null,
      });
    }
  }
  transact(build) {
    const draft = structuredClone(this.state),
      effects = { operations: [], facts: [] };
    build(draft, effects);
    draft.revision++;
    this.validate(draft);
    const world = effects.operations.length
      ? this.prepareOperations(effects.operations)
      : null;
    if (world) this.commitOperations(world, effects.operations);
    Object.assign(this.state, draft);
    return effects;
  }
  event(phase, position, payload = null) {
    if (!phases.includes(phase) || phase === "timer")
      throw new Error("Invalid field device event");
    const devices = this.catalog.ordered.filter((d) =>
      this.matches(d, position),
    );
    if (!devices.length) return { operations: [], facts: [] };
    return this.transact((draft, effects) => {
      for (const d of devices) this.invoke(draft, d, phase, payload, effects);
    });
  }
  interact(key) {
    const device = this.catalog.get(key);
    return this.transact((draft, effects) =>
      this.invoke(draft, device, "interact", null, effects),
    );
  }
  advance(deltaMs) {
    if (!time(deltaMs) || !time(this.state.elapsedMs + deltaMs))
      throw new Error("Invalid field timer advance");
    if (!Object.values(this.state.timers).some((o) => Object.keys(o).length))
      return { operations: [], facts: [] };
    return this.transact((draft, effects) => {
      draft.elapsedMs += deltaMs;
      const due = Object.entries(draft.timers)
        .flatMap(([device, timers]) =>
          Object.entries(timers).map(([key, timer]) => ({
            device,
            key,
            ...timer,
            timer,
          })),
        )
        .filter((t) => t.dueMs <= draft.elapsedMs)
        .sort(
          (a, b) =>
            a.dueMs - b.dueMs ||
            (a.device < b.device
              ? -1
              : a.device > b.device
                ? 1
                : a.key < b.key
                  ? -1
                  : a.key > b.key
                    ? 1
                    : 0),
        );
      for (const t of due) {
        // An earlier callback may cancel or replace another due timer.
        if (draft.timers[t.device]?.[t.key] !== t.timer) continue;
        delete draft.timers[t.device][t.key];
        this.invoke(
          draft,
          this.catalog.get(t.device),
          "timer",
          { key: t.key, data: t.payload },
          effects,
        );
      }
    });
  }
  prepareVisit(map, { resume = false } = {}) {
    if (!this.catalog.maps[map]) throw new Error("Unknown device map");
    if (resume) return null;
    const draft = structuredClone(this.state);
    draft.timers = {};
    draft.requests = {};
    for (const d of this.catalog.ordered)
      if (
        d.map === map &&
        this.catalog.mechanisms.get(d.mechanism).scope === "visit"
      )
        delete draft.records[d.id];
    draft.revision++;
    return draft;
  }
  checkVisit(draft) {
    this.validate(draft);
    if (draft.revision !== this.state.revision + 1)
      throw new Error("Stale device visit");
  }
  commitVisit(draft) {
    if (!draft) return;
    this.checkVisit(draft);
    Object.assign(this.state, draft);
  }
  nextRequest() {
    for (const d of this.catalog.ordered)
      for (const key of Object.keys(this.state.requests[d.id] || {}).sort())
        return readOnly({
          device: d.id,
          key,
          ...this.state.requests[d.id][key],
        });
    return null;
  }
  finishRequest(request) {
    if (
      JSON.stringify(this.state.requests[request.device]?.[request.key]) !==
      JSON.stringify({ action: request.action, input: request.input })
    )
      return false;
    delete this.state.requests[request.device][request.key];
    this.state.revision++;
    return true;
  }
  view() {
    return readOnly({
      records: this.state.records,
      pending: this.state.requests,
      devices: Object.fromEntries(this.catalog.devices),
    });
  }
}
