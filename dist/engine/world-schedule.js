import {
  readOnly,
  validateSchema,
  validateValue,
  objectSchema,
} from "./extensions/values.js";
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const id = (n) => typeof n === "string" && /^[a-zA-Z0-9_.:-]{1,128}$/.test(n);
export const emptyWorldSchedule = () => ({ sequence: 0, tasks: {} });
/** Timers produce facts. Gameplay callbacks and state writes stay in their owning command/transaction. */
export class TimeTaskRegistry {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [key, definition] of Object.entries(definitions))
      this.register(key, definition);
  }
  register(key, definition) {
    if (
      !id(key) ||
      this.definitions.has(key) ||
      !definition ||
      Object.keys(definition).some(
        (k) => !["schema", "intervalMs", "catchUp"].includes(k),
      ) ||
      (definition.intervalMs !== undefined &&
        (!integer(definition.intervalMs) || definition.intervalMs < 1)) ||
      (definition.catchUp !== undefined &&
        !["all", "aggregate", "latest"].includes(definition.catchUp))
    )
      throw new Error("Invalid time task definition");
    this.definitions.set(
      key,
      readOnly({
        schema: validateSchema(definition.schema || objectSchema()),
        intervalMs: definition.intervalMs || null,
        catchUp: definition.catchUp || "aggregate",
      }),
    );
  }
  get(key) {
    const definition = this.definitions.get(key);
    if (!definition) throw new Error(`Unknown time task ${key}`);
    return definition;
  }
}
export class WorldSchedule {
  constructor({ registry, state = emptyWorldSchedule(), limit = 256 }) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 4096)
      throw new Error("Invalid schedule limit");
    Object.assign(this, { registry, state, limit });
    this.validate();
  }
  validate() {
    const s = this.state;
    readOnly(s);
    if (
      !s ||
      Object.keys(s).some((k) => !["sequence", "tasks"].includes(k)) ||
      !integer(s.sequence) ||
      !s.tasks ||
      Array.isArray(s.tasks) ||
      Object.keys(s.tasks).length > this.limit
    )
      throw new Error("Invalid world schedule state");
    for (const [key, task] of Object.entries(s.tasks)) {
      if (
        !id(key) ||
        !task ||
        Object.keys(task).some(
          (k) => !["definition", "dueMs", "data"].includes(k),
        ) ||
        !integer(task.dueMs)
      )
        throw new Error("Invalid saved time task");
      validateValue(
        this.registry.get(task.definition).schema,
        readOnly(task.data, 8192),
      );
    }
  }
  schedule(definitionId, now, { delayMs = 0, data = {} } = {}) {
    const definition = this.registry.get(definitionId),
      view = readOnly(data, 8192);
    validateValue(definition.schema, view);
    if (
      !integer(now) ||
      !integer(delayMs) ||
      !integer(now + delayMs) ||
      Object.keys(this.state.tasks).length >= this.limit ||
      !integer(this.state.sequence + 1)
    )
      throw new Error("Invalid task scheduling request");
    const key = `task.${this.state.sequence + 1}`;
    if (Object.hasOwn(this.state.tasks, key))
      throw new Error("Task sequence collision");
    this.state.sequence++;
    this.state.tasks[key] = {
      definition: definitionId,
      dueMs: now + delayMs,
      data: structuredClone(view),
    };
    return readOnly({ id: key, ...this.state.tasks[key] });
  }
  cancel(key) {
    if (!Object.hasOwn(this.state.tasks, key)) return false;
    delete this.state.tasks[key];
    return true;
  }
  collect(now, maxEvents = 128) {
    if (
      !integer(now) ||
      !Number.isInteger(maxEvents) ||
      maxEvents < 1 ||
      maxEvents > 4096
    )
      throw new Error("Invalid scheduler clock");
    const result = [],
      draft = structuredClone(this.state.tasks);
    while (result.length < maxEvents) {
      const due = Object.entries(draft)
        .filter(([, task]) => task.dueMs <= now)
        .sort(
          ([a, x], [b, y]) => x.dueMs - y.dueMs || (a < b ? -1 : a > b ? 1 : 0),
        )[0];
      if (!due) break;
      const [key, task] = due,
        definition = this.registry.get(task.definition),
        count = definition.intervalMs
          ? Math.floor((now - task.dueMs) / definition.intervalMs) + 1
          : 1;
      const deliveries = definition.catchUp === "all" ? 1 : count;
      const lastDueMs = definition.intervalMs
        ? task.dueMs + (deliveries - 1) * definition.intervalMs
        : task.dueMs;
      const next = definition.intervalMs
        ? task.dueMs + deliveries * definition.intervalMs
        : null;
      if (next !== null && !integer(next))
        throw new Error("Time task overflow");
      const event = readOnly({
        id: key,
        definition: task.definition,
        dueMs: task.dueMs,
        lastDueMs,
        observedMs: now,
        count: definition.catchUp === "latest" ? 1 : deliveries,
        skipped: definition.catchUp === "latest" ? deliveries - 1 : 0,
        data: task.data,
      });
      if (next === null) delete draft[key];
      else task.dueMs = next;
      result.push(event);
    }
    this.state.tasks = draft;
    return result;
  }
  view() {
    return readOnly(this.state);
  }
}
