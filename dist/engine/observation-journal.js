import { readOnly } from "./extensions/values.js";
/** Bounded session facts, independent of save data, rendering and command transport. */
export class ObservationJournal {
  constructor({ limit = 256, now = () => 0 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 4096)
      throw new Error("Invalid observation journal limit");
    this.limit = limit; this.now = now; this.sequence = 0; this.entries = [];
  }
  record(type, data = {}) {
    const entry = readOnly({ sequence: this.sequence + 1, type, atMs: this.now(), data });
    this.sequence++; this.entries.push(entry);
    if (this.entries.length > this.limit) this.entries.shift();
    return entry;
  }
  read({ since = 0, limit = 32 } = {}) {
    if (!Number.isSafeInteger(since) || since < 0 || !Number.isInteger(limit) || limit < 1 || limit > 256)
      throw new Error("Invalid observation cursor");
    const oldest = this.entries[0]?.sequence ?? this.sequence + 1;
    const entries = this.entries.filter(e => e.sequence > since).slice(0, limit);
    return readOnly({ cursor: this.sequence, nextCursor: entries.at(-1)?.sequence ?? Math.min(since, this.sequence),
      gap: since < oldest - 1 || since > this.sequence, hasMore: entries.at(-1)?.sequence < this.sequence,
      entries });
  }
}
