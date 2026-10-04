import {
  readOnly,
  validateSchema,
  validateValue,
  objectSchema,
  callSync,
} from "./extensions/values.js";
const id = (s) =>
  typeof s === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(s) &&
  !["__proto__", "prototype", "constructor"].includes(s);
const exact = (o, keys) =>
  o &&
  typeof o === "object" &&
  !Array.isArray(o) &&
  Object.keys(o).every((k) => keys.includes(k));
const integer = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
export const emptyAppearances = () => ({ revision: 0, records: {} });
export function appearanceTargetKey(target) {
  if (!target || !["player", "actor", "object"].includes(target.kind))
    throw new Error("Invalid appearance target");
  const keys =
    target.kind === "player"
      ? ["kind"]
      : target.kind === "actor"
        ? ["kind", "uid"]
        : ["kind", "map", "id"];
  if (
    !exact(target, keys) ||
    keys
      .slice(1)
      .some((k) =>
        k === "id"
          ? typeof target[k] !== "string" ||
            !/^[a-zA-Z0-9_.:,-]{1,128}$/.test(target[k]) ||
            ["__proto__", "constructor", "prototype"].includes(target[k])
          : !id(target[k]),
      ) ||
    (target.kind === "actor" && !/^core:actor\.[1-9]\d*$/.test(target.uid)) ||
    (target.kind === "object" && /^core:actor\./.test(target.id))
  )
    throw new Error("Invalid appearance target");
  return JSON.stringify(keys.map((k) => target[k]));
}
function layerValid(layer, actors, resources) {
  if (
    !exact(layer, [
      "kind",
      "actor",
      "resource",
      "rect",
      "size",
      "x",
      "y",
      "opacity",
      "bob",
    ]) ||
    !["actor", "image"].includes(layer.kind) ||
    ["x", "y"].some(
      (k) =>
        layer[k] !== undefined &&
        (!Number.isFinite(layer[k]) || Math.abs(layer[k]) > 512),
    ) ||
    (layer.opacity !== undefined &&
      (!Number.isFinite(layer.opacity) ||
        layer.opacity < 0 ||
        layer.opacity > 1))
  )
    return false;
  if (
    layer.bob !== undefined &&
    (!exact(layer.bob, ["amplitude", "periodMs"]) ||
      !Number.isFinite(layer.bob.amplitude) ||
      Math.abs(layer.bob.amplitude) > 64 ||
      !Number.isFinite(layer.bob.periodMs) ||
      layer.bob.periodMs < 80 ||
      layer.bob.periodMs > 10000)
  )
    return false;
  if (layer.kind === "actor")
    return (
      !!actors[layer.actor] &&
      !["resource", "rect", "size"].some((k) => layer[k] !== undefined)
    );
  return (
    layer.actor === undefined &&
    !!resources[layer.resource] &&
    exact(layer.size, ["width", "height"]) &&
    ["width", "height"].every((k) => integer(layer.size[k], 1, 512)) &&
    (layer.rect === undefined ||
      (exact(layer.rect, ["x", "y", "width", "height"]) &&
        ["x", "y"].every((k) => integer(layer.rect[k], 0, 8192)) &&
        ["width", "height"].every((k) => integer(layer.rect[k], 1, 8192))))
  );
}
/** Immutable sprite recipes. Selectors choose registered variants; never invent resources during drawing. */
export class AppearanceRegistry {
  constructor(definitions = {}, { actors = {}, resources = {} } = {}) {
    this.definitions = new Map();
    this.actors = actors;
    for (const [key, d] of Object.entries(definitions)) {
      if (
        !id(key) ||
        !exact(d, [
          "name",
          "schema",
          "initialData",
          "variants",
          "defaultVariant",
          "select",
        ]) ||
        typeof d.name !== "string" ||
        !d.name ||
        !exact(d.variants, Object.keys(d.variants || {})) ||
        !Object.keys(d.variants).length ||
        Object.keys(d.variants).length > 1024 ||
        (d.select !== undefined && typeof d.select !== "function")
      )
        throw new Error(`Invalid appearance ${key}`);
      const schema = validateSchema(d.schema || objectSchema()),
        initialData = readOnly(d.initialData || {}, 8192),
        variants = readOnly(d.variants),
        defaultVariant = d.defaultVariant || "default";
      if (schema.type !== "object")
        throw new Error("Appearance parameters must be an object");
      validateValue(schema, initialData);
      for (const [v, recipe] of Object.entries(variants))
        if (
          !id(v) ||
          !exact(recipe, ["layers", "shadow", "emoteY"]) ||
          (recipe.emoteY !== undefined &&
            (!Number.isFinite(recipe.emoteY) ||
              Math.abs(recipe.emoteY) > 512)) ||
          (recipe.shadow !== undefined && typeof recipe.shadow !== "boolean") ||
          !Array.isArray(recipe.layers) ||
          !recipe.layers.length ||
          recipe.layers.length > 16 ||
          recipe.layers.some((l) => !layerValid(l, actors, resources))
        )
          throw new Error(`Invalid appearance variant ${key}/${v}`);
      if (!Object.hasOwn(variants, defaultVariant))
        throw new Error(`Unknown default appearance variant ${key}`);
      this.definitions.set(
        key,
        Object.freeze({
          name: d.name,
          schema,
          initialData,
          variants,
          defaultVariant,
          select: d.select,
        }),
      );
    }
  }
  get(id) {
    const d = this.definitions.get(id);
    if (!d) throw new Error(`Unknown appearance ${id}`);
    return d;
  }
  selection(id, data) {
    const d = this.get(id),
      parameters = readOnly(data === undefined ? d.initialData : data, 8192);
    validateValue(d.schema, parameters);
    return readOnly({ appearance: id, data: parameters });
  }
  resolve(selection, view = {}) {
    const d = this.get(selection.appearance),
      choice = this.selection(selection.appearance, selection.data),
      c = readOnly(view, 8192),
      variant = d.select
        ? callSync(d.select, [choice.data, c])
        : d.defaultVariant;
    if (typeof variant !== "string" || !Object.hasOwn(d.variants, variant))
      throw new Error(
        `Unknown selected appearance variant ${selection.appearance}/${variant}`,
      );
    const recipe = d.variants[variant],
      bounds = { left: 0, top: 0, right: 16, bottom: 16 };
    const include = (actor, x, y) => {
      const a = this.actors[actor];
      bounds.left = Math.min(bounds.left, x + (a.offsetX || 0));
      bounds.top = Math.min(bounds.top, y + (a.offsetY || 0));
      bounds.right = Math.max(bounds.right, x + (a.offsetX || 0) + a.w);
      bounds.bottom = Math.max(bounds.bottom, y + (a.offsetY || 0) + a.h);
      if (a.underlay)
        include(a.underlay.actor, x, y + (a.underlay.offsetY || 0));
    };
    for (const l of recipe.layers) {
      const x = l.x || 0,
        y = l.y || 0,
        b = Math.abs(l.bob?.amplitude || 0);
      if (l.kind === "actor") {
        include(l.actor, x, y - b);
        include(l.actor, x, y + b);
      } else {
        bounds.left = Math.min(bounds.left, x);
        bounds.top = Math.min(bounds.top, y - b);
        bounds.right = Math.max(bounds.right, x + l.size.width);
        bounds.bottom = Math.max(bounds.bottom, y + b + l.size.height);
      }
    }
    return readOnly({
      appearance: selection.appearance,
      variant,
      shadow: recipe.shadow !== false,
      emoteY: recipe.emoteY ?? bounds.top,
      bounds,
      layers: recipe.layers,
    });
  }
}
/** Appearance selections are independent of actor movement, species, collision and animation caches. */
export class AppearanceSelections {
  constructor({ registry, state = emptyAppearances(), validTarget }) {
    Object.assign(this, { registry, state, validTarget });
    this.leases = new Map();
    this.sequence = 0;
    this.validate();
  }
  validate() {
    const s = readOnly(this.state);
    if (
      !exact(s, ["revision", "records"]) ||
      !integer(s.revision, 0, Number.MAX_SAFE_INTEGER) ||
      !exact(s.records, Object.keys(s.records || {})) ||
      Object.keys(s.records).length > 1024
    )
      throw new Error("Invalid appearance state");
    for (const [key, r] of Object.entries(s.records)) {
      if (
        !exact(r, ["target", "appearance", "data"]) ||
        key !== appearanceTargetKey(r.target) ||
        !this.validTarget(r.target)
      )
        throw new Error("Invalid saved appearance target");
      this.registry.selection(r.appearance, r.data);
    }
  }
  set(target, appearance, data) {
    const key = appearanceTargetKey(target),
      selection = this.registry.selection(appearance, data);
    if (!this.validTarget(target)) throw new Error("Unknown appearance target");
    if (
      !Object.hasOwn(this.state.records, key) &&
      Object.keys(this.state.records).length >= 1024
    )
      throw new Error("Appearance capacity exceeded");
    if (!integer(this.state.revision + 1, 0, Number.MAX_SAFE_INTEGER))
      throw new Error("Appearance revision overflow");
    this.state.records[key] = {
      target: structuredClone(target),
      ...structuredClone(selection),
    };
    this.state.revision++;
    return readOnly(this.state.records[key]);
  }
  clear(target) {
    const key = appearanceTargetKey(target);
    if (!Object.hasOwn(this.state.records, key)) return false;
    if (!integer(this.state.revision + 1, 0, Number.MAX_SAFE_INTEGER))
      throw new Error("Appearance revision overflow");
    delete this.state.records[key];
    this.state.revision++;
    return true;
  }
  override(
    target,
    appearance,
    data,
    { priority = 0, scope = "visit", map } = {},
  ) {
    const key = appearanceTargetKey(target),
      selection = this.registry.selection(appearance, data);
    if (
      !this.validTarget(target) ||
      !integer(priority, -10000, 10000) ||
      !["visit", "session"].includes(scope) ||
      !id(map)
    )
      throw new Error("Invalid appearance override");
    if (
      [...this.leases.values()].some(
        (l) => l.key === key && l.priority === priority,
      )
    )
      throw new Error("Ambiguous appearance override priority");
    if (
      this.leases.size >= 64 ||
      !integer(this.sequence + 1, 1, Number.MAX_SAFE_INTEGER)
    )
      throw new Error("Appearance override capacity exceeded");
    const token = `core:appearance.${++this.sequence}`;
    this.leases.set(token, {
      key,
      target: readOnly(target),
      selection,
      priority,
      scope,
      map,
    });
    return token;
  }
  release(token) {
    return this.leases.delete(token);
  }
  forget(target) {
    const key = appearanceTargetKey(target);
    this.clear(target);
    for (const [token, l] of this.leases)
      if (l.key === key) this.leases.delete(token);
  }
  visit(map) {
    for (const [token, l] of this.leases)
      if (l.scope === "visit" && l.map !== map) this.leases.delete(token);
  }
  selected(target) {
    const key = appearanceTargetKey(target),
      leases = [...this.leases.values()]
        .filter((l) => l.key === key && this.validTarget(l.target))
        .sort((a, b) => b.priority - a.priority);
    return leases[0]?.selection || this.state.records[key] || null;
  }
  resolve(target, context, fallback) {
    const selected = this.selected(target) || fallback;
    return selected ? this.registry.resolve(selected, context) : null;
  }
  view() {
    return readOnly({
      revision: this.state.revision,
      records: this.state.records,
      overrides: [...this.leases].map(([token, l]) => ({
        token,
        target: l.target,
        ...l.selection,
        priority: l.priority,
        scope: l.scope,
        map: l.map,
      })),
    });
  }
}
