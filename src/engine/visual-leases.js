import { readOnly } from "./extensions/values.js";
/** Runtime presentation ownership: no saved gameplay data, no frame-time writes. */
export class VisualLeases {
  constructor(prefix, { limit = 64, exclusive = false } = {}) {
    Object.assign(this, { prefix, limit, exclusive });
    this.records = new Map();
    this.sequence = 0;
  }
  acquire(value, { map, scope = "visit", priority = 0 } = {}) {
    if (
      typeof map !== "string" ||
      !["visit", "session"].includes(scope) ||
      !Number.isSafeInteger(priority) ||
      Math.abs(priority) > 10000
    )
      throw new Error("Invalid visual lease");
    if (
      this.exclusive &&
      [...this.records.values()].some((r) => r.priority === priority)
    )
      throw new Error("Ambiguous visual lease priority");
    if (
      this.records.size >= this.limit ||
      !Number.isSafeInteger(this.sequence + 1)
    )
      throw new Error("Visual lease capacity exceeded");
    const payload = readOnly(value, 16384),
      token = `core:${this.prefix}.${++this.sequence}`;
    this.records.set(token, { token, value: payload, map, scope, priority });
    return token;
  }
  release(token) {
    return this.records.delete(token);
  }
  visit(map) {
    for (const [token, r] of this.records)
      if (r.scope === "visit" && r.map !== map) this.records.delete(token);
  }
  reset() {
    this.records.clear();
  }
  list() {
    return readOnly(
      [...this.records.values()].sort(
        (a, b) =>
          a.priority - b.priority ||
          Number(a.token.split(".").at(-1)) - Number(b.token.split(".").at(-1)),
      ),
    );
  }
}
