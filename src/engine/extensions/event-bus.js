import { readOnly } from "./values.js";
/** Post-commit delivery. A faulty listener is reported without undoing an already committed fact. */
export class EventBus {
  constructor({ onError = () => {}, limit = 256 } = {}) {
    this.onError = onError;
    this.limit = limit;
    this.listeners = new Map();
    this.queue = [];
    this.delivering = false;
    this.sequence = 0;
  }
  on(type, listener) {
    if (typeof type !== "string" || !type || typeof listener !== "function")
      throw new Error("Invalid event subscription");
    const list = this.listeners.get(type) || new Set();
    list.add(listener);
    this.listeners.set(type, list);
    return () => {
      list.delete(listener);
      if (!list.size) this.listeners.delete(type);
    };
  }
  /** Trusted transaction boundary: facts are detached now and delivered only on commit. */
  beginBatch() {
    if (this.batch) throw new Error("Nested event batches are forbidden");
    const pending = [];
    this.batch = pending;
    const close = () => {
      if (this.batch !== pending) throw new Error("Expired event batch");
      this.batch = null;
    };
    return {
      rollback: close,
      commit: () => {
        close();
        for (const event of pending)
          this.queue.push(readOnly({ ...event, sequence: ++this.sequence }));
        this.deliver();
      },
    };
  }
  emit(type, payload = {}) {
    if (typeof type !== "string" || !type)
      throw new Error("Invalid event type");
    if (this.queue.length + (this.batch?.length || 0) >= this.limit)
      throw new Error("Event queue limit exceeded");
    if (this.batch) {
      this.batch.push(readOnly({ type, payload }));
      return;
    }
    this.queue.push(readOnly({ type, payload, sequence: ++this.sequence }));
    this.deliver();
  }
  deliver() {
    if (this.delivering) return;
    this.delivering = true;
    let delivered = 0;
    try {
      while (this.queue.length) {
        if (++delivered > this.limit) {
          this.queue.length = 0;
          this.onError(new Error("Event cascade limit exceeded"));
          break;
        }
        const event = this.queue.shift();
        for (const fn of [...(this.listeners.get(event.type) || [])]) {
          try {
            const result = fn(event);
            if (result?.then) result.catch(this.onError);
          } catch (error) {
            this.onError(error);
          }
        }
      }
    } finally {
      this.delivering = false;
    }
  }
}
