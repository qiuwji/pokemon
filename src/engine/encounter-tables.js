import { ConditionQueries } from "./condition-queries.js";
import { readOnly, validateSchema } from "./extensions/values.js";
import { validateCondition, matchesCondition } from "./conditions.js";
import { validateAiBinding } from "./battle/strategy-contract.js";
const emptySchema = () => ({
  type: "object",
  properties: {},
  required: [],
  additionalProperties: false,
});
/** Named encounter tables can target existing maps without replacing the immutable map catalog. */
export class EncounterTableRegistry {
  constructor(definitions = {}, db) {
    this.maps = db.maps;
    this.tables = [];
    this.queries = new ConditionQueries(db.conditionQueries);
    // A wild encounter may carry a creature-only `ai`; it is content on the table, not saved with
    // the ticket, and is the only fair "intelligence" lever for wild creatures.
    this.aiLookups =
      db.creatureStrategies && db.battleStrategies
        ? {
            trainerLookup: (sid) => {
              const d = db.battleStrategies[sid];
              return d?.version === 2 ? d : null;
            },
            creatureLookup: (sid) => db.creatureStrategies[sid] || null,
            attachment: (aid) => {
              const d = db.battleAttachments?.[aid];
              return d ? validateSchema(d.parameters || emptySchema()) : null;
            },
          }
        : null;
    for (const [id, t] of Object.entries(definitions)) {
      if (
        !t ||
        Object.keys(t).some(
          (k) =>
            ![
              "map",
              "area",
              "rate",
              "entries",
              "requires",
              "priority",
              "rod",
              "ai",
            ].includes(k),
        ) ||
        !db.maps[t.map] ||
        !["land", "water", "fishing", "rock"].includes(t.area) ||
        (t.rod !== undefined &&
          (t.area !== "fishing" ||
            !["old", "good", "super"].includes(t.rod))) ||
        !Number.isInteger(t.rate) ||
        t.rate < 0 ||
        t.rate > 180 ||
        (t.priority !== undefined &&
          (!Number.isInteger(t.priority) || Math.abs(t.priority) > 1000)) ||
        !Array.isArray(t.entries) ||
        !t.entries.length ||
        t.entries.length > 256 ||
        t.entries.some(
          (e) =>
            !e ||
            Object.keys(e).some(
              (k) => !["species", "weight", "min", "max"].includes(k),
            ) ||
            !db.species[e.species] ||
            !Number.isFinite(e.weight) ||
            e.weight <= 0 ||
            e.weight > 1000000 ||
            !Number.isInteger(e.min) ||
            e.min < 1 ||
            !Number.isInteger(e.max) ||
            e.max < e.min ||
            e.max > 100,
        )
      )
        throw new Error(`Invalid encounter table ${id}`);
      validateCondition(
        t.requires,
        new Set(),
        "encounter.requires",
        this.queries,
      );
      const ai =
        t.ai === undefined
          ? undefined
          : this.aiLookups
            ? validateAiBinding(t.ai, { path: id, ...this.aiLookups })
            : (() => {
                throw new Error(
                  `Encounter table ${id}: ai requires registered strategies`,
                );
              })();
      this.tables.push(readOnly({ id, ...t, ...(ai ? { ai } : {}) }));
    }
    this.tables.sort(
      (a, b) =>
        (b.priority || 0) - (a.priority || 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  }
  table(id) {
    return this.tables.find((t) => t.id === id) || null;
  }
  select(map, area, state, { rod } = {}) {
    return (
      this.tables.find(
        (t) =>
          t.map === map &&
          t.area === area &&
          (t.rod === undefined || t.rod === rod) &&
          matchesCondition(t.requires, state, this.queries),
      ) || null
    );
  }
  /** One source of effective regional tables, including the original map-embedded land/water data. */
  effective(map, area, state, options = {}) {
    if (
      !Object.hasOwn(this.maps, map) ||
      !["land", "water", "fishing", "rock"].includes(area)
    )
      throw new Error("Invalid encounter table query");
    if (
      options.rod !== undefined &&
      (area !== "fishing" || !["old", "good", "super"].includes(options.rod))
    )
      throw new Error("Invalid encounter rod query");
    const registered = this.select(map, area, state, options);
    if (registered) return readOnly({ ...registered, source: "registered" });
    const m = this.maps[map],
      entries =
        area === "land"
          ? m.encounters
          : area === "water"
            ? m.waterEncounters
            : null;
    if (!entries?.length) return null;
    return readOnly({
      id: null,
      map,
      area,
      entries,
      rate: area === "land" ? m.encounterRate : m.waterEncounterRate,
      source: "map",
    });
  }
}
