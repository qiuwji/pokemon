import { calculateStats } from "../model.js";
import { jsonValue, readOnly } from "../extensions/values.js";
const combatStats = ["atk", "def", "spa", "spd", "spe"];
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => keys.includes(k));
/** Registered form identity and derived values are separate from canonical species/IV/EV/learnset. */
export class CreatureFormRegistry {
  constructor(definitions = {}, db, abilities = {}, heldItems = {}) {
    this.db = db;
    this.abilities = abilities;
    this.definitions = definitions;
    for (const [id, d] of Object.entries(definitions)) {
      if (
        !exact(d, [
          "species",
          "name",
          "scope",
          "baseStats",
          "types",
          "ability",
          "sprites",
          "heldItem",
          "oncePerController",
          "clearOn",
        ]) ||
        !db.species[d.species] ||
        typeof d.name !== "string" ||
        !d.name ||
        !["world", "battle"].includes(d.scope) ||
        (d.baseStats !== undefined &&
          (!exact(d.baseStats, combatStats) ||
            Object.values(d.baseStats).some(
              (v) => !Number.isInteger(v) || v < 1 || v > 255,
            ))) ||
        (d.types !== undefined &&
          (!Array.isArray(d.types) ||
            !d.types.length ||
            d.types.length > 2 ||
            d.types.some((t) => !db.typeChart[t]))) ||
        (d.ability !== undefined && !abilities[d.ability]) ||
        (d.heldItem !== undefined && !heldItems[d.heldItem]) ||
        (d.oncePerController !== undefined &&
          (typeof d.oncePerController !== "boolean" || d.scope === "world")) ||
        (d.clearOn !== undefined &&
          (!Array.isArray(d.clearOn) ||
            d.clearOn.some((v) => !["leave", "faint"].includes(v)))) ||
        (d.sprites !== undefined &&
          (!exact(d.sprites, ["front", "back"]) ||
            Object.values(d.sprites).some((v) => !db.resources?.[v])))
      )
        throw new Error(`Invalid creature form ${id}`);
    }
  }
  validateEffects(effects) {
    for (const d of Object.values(effects.definitions))
      for (const phase of [
        "primary",
        "beforeDamage",
        "afterDamage",
        "secondary",
        "onCharge",
      ])
        for (const step of d[phase] || [])
          if (step.op === "activateForm") this.get(step.id);
  }
  get(id) {
    const d = this.definitions[id];
    if (!d) throw new Error(`Unknown creature form ${id}`);
    return d;
  }
}
/** Records contain form IDs or battle-only overlays; no changes to the base creature are needed to restore. */
export class CreatureForms {
  constructor({ registry, records = {}, creatures = () => [] }) {
    this.registry = registry;
    this.records = records;
    this.creatures = creatures;
    this.used = new Set();
    this.validatePersistent(records);
  }
  validatePersistent(records) {
    jsonValue(records);
    if (!records || Array.isArray(records))
      throw new Error("Invalid form records");
    for (const [uid, r] of Object.entries(records)) {
      const mon = this.creatures().find((m) => m.uid === uid),
        d = this.registry.get(r.id);
      if (
        !exact(r, ["id"]) ||
        !mon ||
        mon.species !== d.species ||
        d.scope !== "world"
      )
        throw new Error("Invalid saved creature form");
    }
  }
  canActivate(mon, id, controller) {
    const d = this.registry.get(id);
    return (
      !mon.egg &&
      mon.hp > 0 &&
      mon.species === d.species &&
      (!d.heldItem || mon.heldItem === d.heldItem) &&
      this.records[mon.uid]?.id !== id &&
      (!d.oncePerController || !this.used.has(controller))
    );
  }
  activate(mon, id, controller = mon.uid) {
    const d = this.registry.get(id);
    if (!this.canActivate(mon, id, controller)) return false;
    this.records[mon.uid] = { id };
    if (d.oncePerController) this.used.add(controller);
    return true;
  }
  overlay(mon, values, { kind = "temporary", sourceUid = null } = {}) {
    if (
      !exact(values, [
        "species",
        "stats",
        "iv",
        "moves",
        "ability",
        "types",
        "sprites",
      ])
    )
      throw new Error("Invalid creature overlay");
    jsonValue(values);
    const db = this.registry.db;
    if (
      (values.species !== undefined && !db.species[values.species]) ||
      (values.stats !== undefined &&
        (!exact(values.stats, combatStats) ||
          Object.values(values.stats).some(
            (v) => !Number.isInteger(v) || v < 1,
          ))) ||
      (values.iv !== undefined &&
        (!exact(values.iv, ["hp", ...combatStats]) ||
          Object.keys(values.iv).length !== 6 ||
          Object.values(values.iv).some(
            (v) => !Number.isInteger(v) || v < 0 || v > 31,
          ))) ||
      (values.moves !== undefined &&
        (!Array.isArray(values.moves) ||
          !values.moves.length ||
          values.moves.length > 4 ||
          values.moves.some(
            (m) =>
              !db.moves[m.id] ||
              !Number.isInteger(m.pp) ||
              m.pp < 0 ||
              m.pp > db.moves[m.id].pp,
          )))
    )
      throw new Error("Invalid temporary creature values");
    if (
      (values.ability !== undefined &&
        !this.registry.abilities[values.ability]) ||
      (values.types !== undefined &&
        (!Array.isArray(values.types) ||
          !values.types.length ||
          values.types.length > 2 ||
          values.types.some((t) => !db.typeChart[t])))
    )
      throw new Error("Invalid temporary form references");
    this.records[mon.uid] = {
      ...(this.records[mon.uid] || {}),
      kind,
      sourceUid,
      overrides: {
        ...this.records[mon.uid]?.overrides,
        ...structuredClone(values),
      },
    };
  }
  effective(mon) {
    const r = this.records[mon.uid];
    if (!r) return mon;
    const d = r.id ? this.registry.get(r.id) : {},
      overrides = r.overrides || {},
      stats = d.baseStats
        ? calculateStats(mon, {
            ...this.registry.db.species[mon.species],
            stats: {
              ...this.registry.db.species[mon.species].stats,
              ...d.baseStats,
            },
          })
        : mon.stats;
    return {
      ...mon,
      species: overrides.species || mon.species,
      stats: { ...stats, ...overrides.stats, hp: mon.stats.hp },
      iv: overrides.iv || mon.iv,
      moves: overrides.moves || mon.moves,
      ability: overrides.ability || d.ability || mon.ability,
      types:
        overrides.types ||
        d.types ||
        this.registry.db.species[overrides.species || mon.species].types,
      form: r.id || r.kind,
      sprites: overrides.sprites || d.sprites || null,
    };
  }
  moves(mon) {
    return this.records[mon.uid]?.overrides?.moves || mon.moves;
  }
  reconcile() {
    const creatures = this.creatures();
    for (const [uid, r] of Object.entries(this.records)) {
      const mon = creatures.find((m) => m.uid === uid);
      if (!mon || (r.id && this.registry.get(r.id).species !== mon.species))
        delete this.records[uid];
    }
  }
  restore(mon, reason = "removed") {
    const r = this.records[mon.uid];
    if (!r) return false;
    const d = r.id ? this.registry.get(r.id) : null;
    if (reason === "end" && d?.scope === "world") {
      delete r.overrides;
      delete r.kind;
      delete r.sourceUid;
      return false;
    }
    if (
      ["leave", "faint"].includes(reason) &&
      d &&
      !d.clearOn?.includes(reason)
    ) {
      delete r.overrides;
      delete r.kind;
      delete r.sourceUid;
      return false;
    }
    delete this.records[mon.uid];
    return true;
  }
  view(mon) {
    return readOnly({
      baseSpecies: mon.species,
      ...this.effective(mon),
      form: this.records[mon.uid]?.id || this.records[mon.uid]?.kind || null,
    });
  }
}
