import { ConditionQueries } from "./condition-queries.js";
import { readOnly } from "./extensions/values.js";
import { validateCondition, matchesCondition } from "./conditions.js";
/** Named encounter tables can target existing maps without replacing the immutable map catalog. */
export class EncounterTableRegistry {
  constructor(definitions = {}, db) {
    this.tables = [];
    this.queries = new ConditionQueries(db.conditionQueries);
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
      this.tables.push(readOnly({ id, ...t }));
    }
    this.tables.sort(
      (a, b) =>
        (b.priority || 0) - (a.priority || 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
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
}
