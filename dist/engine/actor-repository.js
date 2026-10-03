import {
  readOnly,
  validateSchema,
  validateValue,
  objectSchema,
} from "./extensions/values.js";
const id = (s) =>
  typeof s === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(s) &&
  !["__proto__", "prototype", "constructor"].includes(s);
const exact = (o, keys) =>
  !!o && !Array.isArray(o) && Object.keys(o).every((k) => keys.includes(k));
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
export const emptyActors = () => ({ sequence: 0, records: {} });
export class ActorTemplateRegistry {
  constructor(definitions = {}, { actors, behaviors }) {
    this.behaviors = behaviors;
    this.definitions = new Map();
    for (const [key, d] of Object.entries(definitions)) {
      if (
        !id(key) ||
        !exact(d, [
          "name",
          "actor",
          "behavior",
          "config",
          "schema",
          "initialState",
          "perceptionRadius",
        ]) ||
        typeof d.name !== "string" ||
        !d.name ||
        !actors[d.actor] ||
        !behaviors.definitions.has(d.behavior) ||
        (d.perceptionRadius !== undefined &&
          (!integer(d.perceptionRadius) || d.perceptionRadius > 32))
      )
        throw new Error(`Invalid actor template ${key}`);
      const schema = validateSchema(d.schema || objectSchema()),
        initialState = readOnly(d.initialState || {}, 8192);
      validateValue(schema, initialState);
      this.definitions.set(
        key,
        readOnly({
          ...d,
          config: d.config || {},
          schema,
          initialState,
          perceptionRadius: d.perceptionRadius ?? 8,
        }),
      );
    }
  }
  get(key) {
    const d = this.definitions.get(key);
    if (!d) throw new Error(`Unknown actor template ${key}`);
    return d;
  }
}
/** Global identity and committed grid state outlive map-local animation caches. */
export class ActorRepository {
  constructor({ registry, maps, state = emptyActors() }) {
    Object.assign(this, { registry, maps, state });
    this.validate();
  }
  location(p) {
    const m = this.maps[p.map];
    if (
      !m ||
      !integer(p.x) ||
      !integer(p.y) ||
      p.x >= m.width ||
      p.y >= m.height ||
      !["up", "down", "left", "right"].includes(p.dir)
    )
      throw new Error("Invalid actor location");
  }
  validate() {
    const s = readOnly(this.state);
    if (
      !exact(s, ["sequence", "records"]) ||
      !integer(s.sequence) ||
      !s.records ||
      Array.isArray(s.records) ||
      Object.keys(s.records).length > 256
    )
      throw new Error("Invalid actor state");
    for (const [uid, r] of Object.entries(s.records)) {
      const serial = /^core:actor\.([1-9]\d*)$/.exec(uid);
      if (
        !serial ||
        !integer(Number(serial[1])) ||
        Number(serial[1]) > s.sequence ||
        !id(uid) ||
        !exact(r, [
          "template",
          "map",
          "x",
          "y",
          "dir",
          "data",
          "hidden",
          "version",
          "pose",
        ]) ||
        typeof r.hidden !== "boolean" ||
        !integer(r.version) ||
        !this.registry.behaviors.poses.definitions.has(r.pose)
      )
        throw new Error("Invalid actor record");
      this.location(r);
      validateValue(
        this.registry.get(r.template).schema,
        readOnly(r.data, 8192),
      );
    }
  }
  spawn(template, position) {
    const d = this.registry.get(template);
    this.location(position);
    if (
      Object.keys(this.state.records).length >= 256 ||
      !integer(this.state.sequence + 1)
    )
      throw new Error("Actor capacity exceeded");
    const uid = `core:actor.${this.state.sequence + 1}`;
    if (Object.hasOwn(this.state.records, uid))
      throw new Error("Actor identity collision");
    this.state.sequence++;
    this.state.records[uid] = {
      template,
      map: position.map,
      x: position.x,
      y: position.y,
      dir: position.dir,
      hidden: false,
      version: 0,
      pose: "still",
      data: structuredClone(d.initialState),
    };
    return this.view(uid);
  }
  record(uid) {
    const r = this.state.records[uid];
    if (!r) throw new Error(`Unknown actor ${uid}`);
    return r;
  }
  update(uid, { position, data, hidden, pose } = {}, { external = true } = {}) {
    const r = this.record(uid),
      draft = structuredClone(r);
    if (position) {
      this.location(position);
      Object.assign(draft, {
        map: position.map,
        x: position.x,
        y: position.y,
        dir: position.dir,
      });
    }
    if (data !== undefined) {
      draft.data = structuredClone(readOnly(data, 8192));
      validateValue(this.registry.get(r.template).schema, draft.data);
    }
    if (hidden !== undefined) {
      if (typeof hidden !== "boolean")
        throw new Error("Invalid actor visibility");
      draft.hidden = hidden;
    }
    if (pose !== undefined) {
      if (!this.registry.behaviors.poses.definitions.has(pose))
        throw new Error("Unknown actor pose");
      draft.pose = pose;
    }
    if (external && (position || hidden !== undefined)) {
      if (!integer(draft.version + 1))
        throw new Error("Actor version overflow");
      draft.version++;
    }
    this.state.records[uid] = draft;
    return this.view(uid);
  }
  remove(uid) {
    if (!Object.hasOwn(this.state.records, uid)) return false;
    delete this.state.records[uid];
    return true;
  }
  view(uid) {
    return readOnly({ uid, ...this.record(uid) });
  }
  objects(map) {
    return Object.entries(this.state.records)
      .filter(([, r]) => r.map === map && !r.hidden)
      .map(([uid, r]) => {
        const d = this.registry.get(r.template);
        return {
          id: uid,
          _actorUid: uid,
          _worldVersion: `actor:${r.version}`,
          map: r.map,
          x: r.x,
          y: r.y,
          dir: r.dir,
          pose: r.pose,
          actor: d.actor,
          name: d.name,
          kind: "actor",
          movement: { ...d.config, mode: d.behavior },
        };
      });
  }
  list() {
    return readOnly(this.state.records);
  }
}
