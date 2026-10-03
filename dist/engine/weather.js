import { readOnly, jsonValue } from "./extensions/values.js";
const own = (object, key) => Object.hasOwn(object, key);
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
/** World weather definitions own labels and cross-domain references, never drawing or combat rules. */
export class WeatherRegistry {
  constructor(
    definitions,
    { defaultWeather, battleKinds = {}, effects = null } = {},
  ) {
    this.defaultWeather = defaultWeather;
    this.definitions = readOnly(definitions);
    for (const [id, d] of Object.entries(this.definitions)) {
      if (
        !id ||
        !d ||
        typeof d.label !== "string" ||
        !d.label ||
        Object.keys(d).some(
          (k) =>
            !["label", "visual", "battle", "cycle", "periodMs"].includes(k),
        ) ||
        (d.visual !== undefined &&
          (typeof d.visual !== "string" ||
            !d.visual ||
            (effects && !effects.has(d.visual)))) ||
        (d.battle !== undefined && !own(battleKinds, d.battle)) ||
        (d.periodMs !== undefined &&
          (!d.cycle || !Number.isFinite(d.periodMs) || d.periodMs <= 0)) ||
        (d.cycle !== undefined &&
          (!Array.isArray(d.cycle) ||
            !d.cycle.length ||
            d.visual !== undefined ||
            d.battle !== undefined))
      )
        throw new Error(`Invalid weather definition ${id}`);
    }
    for (const [id, d] of Object.entries(this.definitions))
      for (const child of d.cycle || [])
        if (!own(this.definitions, child) || this.definitions[child].cycle)
          throw new Error(`Invalid weather cycle ${id}`);
    this.get(defaultWeather);
  }
  get(id) {
    if (!own(this.definitions, id)) throw new Error(`Unknown weather ${id}`);
    return this.definitions[id];
  }
  resolve(id, day, elapsedMs = 0) {
    const d = this.get(id);
    return d.cycle
      ? d.cycle[
          (d.periodMs ? Math.floor(elapsedMs / d.periodMs) : day) %
            d.cycle.length
        ]
      : id;
  }
  validateMaps(maps) {
    for (const [id, map] of Object.entries(maps)) {
      this.get(map.weather?.default || this.defaultWeather);
      if (map.presentation?.weather !== undefined)
        throw new Error(
          `Map ${id}: weather belongs in map.weather, not presentation`,
        );
      if (
        map.weather &&
        (typeof map.weather !== "object" ||
          Array.isArray(map.weather) ||
          typeof map.weather.default !== "string" ||
          !map.weather.default ||
          Object.keys(map.weather).some(
            (k) => !["default", "regions"].includes(k),
          ) ||
          (map.weather.regions !== undefined &&
            !Array.isArray(map.weather.regions)))
      )
        throw new Error(`Invalid map weather ${id}`);
      for (const r of map.weather?.regions || []) {
        this.get(r.weather);
        if (
          Object.keys(r).some(
            (k) =>
              !["x", "y", "width", "height", "elevation", "weather"].includes(
                k,
              ),
          ) ||
          !integer(r.x) ||
          !integer(r.y) ||
          !Number.isInteger(r.width ?? 1) ||
          (r.width ?? 1) < 1 ||
          !Number.isInteger(r.height ?? 1) ||
          (r.height ?? 1) < 1 ||
          r.x + (r.width ?? 1) > map.width ||
          r.y + (r.height ?? 1) > map.height ||
          (r.elevation !== undefined &&
            (!integer(r.elevation) || r.elevation > 15))
        )
          throw new Error(`Invalid weather region ${id}`);
      }
    }
  }
}
export const emptyWeather = () => ({
  day: 0,
  revision: 0,
  active: null,
  overrides: {},
});
/** Saved world state. Selection resolves daily cycles on entry/coordinate trigger, matching Emerald; no frame or RNG dependency. */
export class WorldWeather {
  constructor({ state, registry, maps }) {
    this.state = state;
    this.registry = registry;
    this.maps = maps;
    registry.validateMaps(maps);
    this.validate();
  }
  validate() {
    const s = this.state;
    jsonValue(s);
    if (
      !integer(s.day) ||
      !integer(s.revision) ||
      !s.overrides ||
      Array.isArray(s.overrides) ||
      Object.keys(s).some(
        (k) => !["day", "revision", "active", "overrides"].includes(k),
      )
    )
      throw new Error("Invalid saved weather");
    for (const [map, r] of Object.entries(s.overrides)) {
      this.map(map);
      this.registry.get(r.weather);
      if (
        Object.keys(r).some((k) => !["weather", "expiresAt"].includes(k)) ||
        !(r.expiresAt === null || integer(r.expiresAt))
      )
        throw new Error("Invalid weather override");
    }
    if (s.active !== null) {
      const a = s.active;
      this.map(a.map);
      this.registry.get(a.selection);
      this.registry.get(a.kind);
      if (
        this.registry.get(a.kind).cycle ||
        !(this.registry.get(a.selection).cycle || [a.selection]).includes(
          a.kind,
        ) ||
        !["map", "override", "coordinate", "script"].includes(a.source) ||
        (a.source === "override" &&
          s.overrides[a.map]?.weather !== a.selection) ||
        (a.source === "map" &&
          (this.map(a.map).weather?.default || this.registry.defaultWeather) !==
            a.selection) ||
        (a.source === "coordinate" &&
          !this.map(a.map).weather?.regions?.some(
            (r) => r.weather === a.selection,
          )) ||
        (this.registry.get(a.selection).periodMs &&
          this.registry.resolve(a.selection, s.day, a.elapsedMs) !== a.kind) ||
        !Number.isFinite(a.elapsedMs) ||
        a.elapsedMs < 0 ||
        a.elapsedMs > Number.MAX_SAFE_INTEGER ||
        Object.keys(a).some(
          (k) =>
            !["map", "selection", "kind", "source", "elapsedMs"].includes(k),
        )
      )
        throw new Error("Invalid active weather");
    }
  }
  map(id) {
    if (!own(this.maps, id)) throw new Error("Unknown weather map");
    return this.maps[id];
  }
  select(map, selection, source) {
    this.map(map);
    const next = {
      map,
      selection,
      kind: this.registry.resolve(selection, this.state.day),
      source,
      elapsedMs: 0,
    };
    if (
      this.state.active &&
      next.map === this.state.active.map &&
      next.selection === this.state.active.selection &&
      next.source === this.state.active.source &&
      !this.registry.get(selection).cycle
    )
      return false;
    this.state.active = next;
    this.state.revision++;
    return true;
  }
  enter(map, now) {
    this.map(map);
    this.expire(now);
    const override = this.state.overrides[map];
    return this.select(
      map,
      override?.weather ||
        this.map(map).weather?.default ||
        this.registry.defaultWeather,
      override ? "override" : "map",
    );
  }
  set(map, weather, { now, durationMs = null } = {}) {
    this.map(map);
    this.registry.get(weather);
    if (
      !integer(now) ||
      (durationMs !== null &&
        (!Number.isSafeInteger(durationMs) ||
          durationMs <= 0 ||
          !Number.isSafeInteger(now + durationMs)))
    )
      throw new Error("Invalid weather duration");
    this.state.overrides[map] = {
      weather,
      expiresAt: durationMs === null ? null : now + durationMs,
    };
    this.state.revision++;
    if (this.state.active?.map === map) this.select(map, weather, "override");
  }
  clear(map) {
    this.map(map);
    if (!own(this.state.overrides, map)) return false;
    delete this.state.overrides[map];
    this.state.revision++;
    if (this.state.active?.map === map)
      this.select(
        map,
        this.map(map).weather?.default || this.registry.defaultWeather,
        "map",
      );
    return true;
  }
  expire(now) {
    if (!integer(now)) throw new Error("Invalid weather clock");
    for (const [map, r] of Object.entries(this.state.overrides))
      if (r.expiresAt !== null && now >= r.expiresAt) this.clear(map);
  }
  advanceDays(days) {
    if (!integer(days) || !Number.isSafeInteger(this.state.day + days))
      throw new Error("Invalid weather days");
    if (days) {
      this.state.day += days;
      this.state.revision++;
    }
  }
  step(position) {
    const map = this.map(position.map);
    if (this.state.overrides[position.map]) return false;
    const r = map.weather?.regions?.find(
      (r) =>
        position.x >= r.x &&
        position.y >= r.y &&
        position.x < r.x + (r.width ?? 1) &&
        position.y < r.y + (r.height ?? 1) &&
        (r.elevation === undefined ||
          r.elevation === 0 ||
          r.elevation === position.elevation),
    );
    return r ? this.select(position.map, r.weather, "coordinate") : false;
  }
  advance(ms) {
    if (!Number.isFinite(ms) || ms < 0)
      throw new Error("Invalid weather frame time");
    const a = this.state.active;
    if (!a || !this.registry.get(a.selection).periodMs) return;
    const elapsed = a.elapsedMs + ms;
    if (elapsed > Number.MAX_SAFE_INTEGER)
      throw new Error("Weather time overflow");
    a.elapsedMs = elapsed;
    const kind = this.registry.resolve(a.selection, this.state.day, elapsed);
    if (kind !== a.kind) {
      a.kind = kind;
      this.state.revision++;
    }
  }
  view(map = this.state.active?.map) {
    if (!map) return null;
    this.map(map);
    const active = this.state.active?.map === map ? this.state.active : null;
    const selection =
      active?.selection ||
      this.state.overrides[map]?.weather ||
      this.map(map).weather?.default ||
      "clear";
    const kind =
      active?.kind || this.registry.resolve(selection, this.state.day);
    const d = this.registry.get(kind);
    return readOnly({
      map,
      kind,
      selection,
      source:
        active?.source || (this.state.overrides[map] ? "override" : "map"),
      label: d.label,
      visual: d.visual || null,
      battle: d.battle || null,
      day: this.state.day,
      revision: this.state.revision,
    });
  }
}
