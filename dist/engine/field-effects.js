import {
  callSync,
  jsonValue,
  readOnly,
  validateSchema,
  validateValue,
} from "./extensions/values.js";
const exact = (v, keys) =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => keys.includes(k));
const identifier = (v) =>
  typeof v === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(v) &&
  !["constructor", "prototype", "__proto__"].includes(v);
export const emptyFieldEffects = () => ({
  revision: 0,
  activeMap: null,
  records: {},
});

/** Registered state and lifecycle policy, independent of inventory, HM names and rendering adapters. */
export class FieldEffectRegistry {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [id, d] of Object.entries(definitions)) {
      if (
        !identifier(id) ||
        !exact(d, ["scope", "schema", "retain", "presentation"]) ||
        !["visit", "world"].includes(d.scope) ||
        (d.retain !== undefined &&
          (d.scope !== "world" || typeof d.retain !== "function")) ||
        (d.presentation !== undefined && typeof d.presentation !== "function")
      )
        throw new Error(`Invalid field effect ${id}`);
      const schema = validateSchema(d.schema);
      if (schema.type !== "object")
        throw new Error("Field effect data must be an object");
      this.definitions.set(id, Object.freeze({ ...d, schema }));
    }
  }
  get(id) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown field effect ${id}`);
    return d;
  }
}

/** Saved authoritative field effects. Plans are one-shot; loading never means entering a new visit. */
export class FieldEffects {
  constructor({ registry, maps, state }) {
    Object.assign(this, { registry, maps, state });
    this.plans = new WeakMap();
    this.validate(state);
  }
  validate(s) {
    jsonValue(s, 65536);
    if (
      !exact(s, ["revision", "activeMap", "records"]) ||
      !Number.isSafeInteger(s.revision) ||
      s.revision < 0 ||
      (s.activeMap !== null && !Object.hasOwn(this.maps, s.activeMap)) ||
      !s.records ||
      !exact(s.records, Object.keys(s.records))
    )
      throw new Error("Invalid field effects state");
    for (const [id, r] of Object.entries(s.records)) {
      const d = this.registry.get(id);
      if (
        !exact(r, ["data", "map"]) ||
        !s.activeMap ||
        (d.scope === "visit" ? r.map !== s.activeMap : r.map !== null)
      )
        throw new Error("Invalid field effect owner");
      validateValue(d.schema, r.data);
    }
  }
  context(map, reason) {
    const m = this.maps[map];
    if (!m) throw new Error("Unknown field effect map");
    return readOnly({
      from: this.state.activeMap,
      to: map,
      reason,
      map: {
        id: map,
        indoor: !!m.indoor,
        darkness: m.darkness || null,
        presentation: m.presentation || {},
      },
    });
  }
  plan(next) {
    if (this.state.revision >= Number.MAX_SAFE_INTEGER)
      throw new Error("Field effect revision overflow");
    next.revision = this.state.revision + 1;
    this.validate(next);
    const p = readOnly(next);
    this.plans.set(p, JSON.stringify(this.state));
    return p;
  }
  prepare(id, data, { remove = false } = {}) {
    const d = this.registry.get(id),
      next = structuredClone(this.state);
    if (!next.activeMap)
      throw new Error("Field effects require an active visit");
    if (remove) delete next.records[id];
    else {
      const value = readOnly(data, 8192);
      validateValue(d.schema, value);
      next.records[id] = {
        data: value,
        map: d.scope === "visit" ? next.activeMap : null,
      };
    }
    return this.plan(next);
  }
  prepareVisit(map, { resume = false, reason = "entry" } = {}) {
    const context = this.context(map, reason);
    if (resume && this.state.activeMap === map) return null;
    const next = structuredClone(this.state);
    next.activeMap = map;
    for (const [id, r] of Object.entries(next.records)) {
      const d = this.registry.get(id);
      const retained =
        d.scope === "world" &&
        (!d.retain || callSync(d.retain, [context, readOnly(r.data)]));
      if (typeof retained !== "boolean")
        throw new Error("Field effect retention must return a boolean");
      if (!retained) delete next.records[id];
    }
    return this.plan(next);
  }
  check(plan) {
    if (
      !this.plans.has(plan) ||
      this.plans.get(plan) !== JSON.stringify(this.state)
    )
      throw new Error("Field effect plan changed");
  }
  commit(plan) {
    this.check(plan);
    this.plans.delete(plan);
    Object.assign(this.state, structuredClone(plan));
    return { ok: true, revision: this.state.revision };
  }
  view() {
    const context = this.state.activeMap
      ? this.context(this.state.activeMap, "query")
      : null;
    return readOnly({
      ...this.state,
      records: Object.fromEntries(
        Object.entries(this.state.records).map(([id, r]) => {
          const d = this.registry.get(id),
            presentation = d.presentation
              ? callSync(d.presentation, [readOnly(r.data), context])
              : null;
          return [id, { ...r, presentation }];
        }),
      ),
    });
  }
}
