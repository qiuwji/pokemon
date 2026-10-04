import { inventoryQuantity, inventoryCounts } from "./inventory.js";
import {
  objectSchema,
  validateSchema,
  validateValue,
  readOnly,
  callSync,
} from "./extensions/values.js";
const id = { type: "string", minLength: 1, maxLength: 128 };
export const CONDITION_QUERIES = {
  playerName: { schema: objectSchema(), read: (s) => s.playerName || "训练家" },
  worldHour: {
    schema: objectSchema(),
    read: (s) => Math.floor((s.clock?.localMs || 0) / 3600000) % 24,
  },
  worldMinute: {
    schema: objectSchema(),
    read: (s) => Math.floor((s.clock?.localMs || 0) / 60000) % 60,
  },
  worldDay: {
    schema: objectSchema(),
    read: (s) => Math.floor((s.clock?.localMs || 0) / 86400000),
  },
  clockSet: { schema: objectSchema(), read: (s) => !!s.clock?.initialized },
  money: { schema: objectSchema(), read: (s) => s.money },
  itemCount: {
    schema: objectSchema({ item: id }, ["item"]),
    read: (s, { item }) => inventoryQuantity(s.bag, item),
  },
  itemSpace: {
    schema: objectSchema({ item: id, count: { type: "integer", minimum: 1 } }, [
      "item",
      "count",
    ]),
    read: () => {
      throw new Error("Inventory policy is required for itemSpace");
    },
  },
  partyCount: {
    schema: objectSchema(),
    read: (s) => s.party.filter((m) => !m.egg).length,
  },
  hasSpecies: {
    schema: objectSchema({ species: id }, ["species"]),
    read: (s, { species }) =>
      s.party.some((m) => !m.egg && m.species === species),
  },
  variable: {
    schema: objectSchema({ name: id }, ["name"]),
    read: (s, { name }) => s.story?.variables?.[name] ?? null,
  },
  map: { schema: objectSchema(), read: (s) => s.position.map },
  positionX: { schema: objectSchema(), read: (s) => s.position.x },
  positionY: { schema: objectSchema(), read: (s) => s.position.y },
};
/** Registered predicates query detached progress; built-ins read narrow scalar values without cloning full state. */
export class ConditionQueries {
  constructor(definitions = {}, { inventory } = {}) {
    this.definitions = new Map(Object.entries(CONDITION_QUERIES));
    this.custom = new Set();
    if (inventory)
      this.definitions.set("itemSpace", {
        ...CONDITION_QUERIES.itemSpace,
        read: (state, { item, count }) =>
          inventory.preview(state.bag, [{ kind: "add", item, count }]).ok,
      });
    for (const [id, def] of Object.entries(definitions)) {
      if (this.definitions.has(id) || typeof def?.read !== "function")
        throw new Error(`Invalid condition query ${id}`);
      this.definitions.set(id, { ...def, schema: validateSchema(def.schema) });
      this.custom.add(id);
    }
  }
  validate(query) {
    if (
      !query ||
      Object.keys(query).some((k) => !["id", "input"].includes(k)) ||
      !this.definitions.has(query.id)
    )
      throw new Error("Unknown condition query");
    validateValue(
      this.definitions.get(query.id).schema,
      query.input || {},
      "condition.query",
    );
  }
  read(query, state) {
    this.validate(query);
    const def = this.definitions.get(query.id);
    const view = this.custom.has(query.id)
      ? readOnly({
          position: state.position,
          party: state.party,
          bag: inventoryCounts(state.bag),
          money: state.money,
          flags: state.flags,
          story: state.story,
          ...(state.clock ? { clock: state.clock } : {}),
        })
      : state;
    const value = callSync(def.read, [view, readOnly(query.input || {})]);
    if (
      (value !== null &&
        !["string", "boolean", "number"].includes(typeof value)) ||
      (typeof value === "number" && !Number.isFinite(value))
    )
      throw new Error("Condition query must return a scalar");
    return value;
  }
}
export const DEFAULT_CONDITION_QUERIES = new ConditionQueries();
