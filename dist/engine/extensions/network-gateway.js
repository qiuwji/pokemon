import { CommandError } from "./command-bus.js";
import {
  NETWORK_PROTOCOL,
  NETWORK_LIMITS,
  decodeRequest,
  errorResult,
  requestFingerprint,
} from "./network-protocol.js";
import { readOnly } from "./values.js";
/** Ordered mutations with bounded concurrent queries/input. Owns protocol state only, never domain locks or rules. */
export class NetworkGateway {
  constructor({
    bus,
    session,
    now = () => Date.now(),
    wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    limits = {},
  }) {
    if (typeof session !== "string" || !session || session.length > 128)
      throw new Error("Invalid network session");
    Object.assign(this, { bus, session, now, wait });
    this.limits = { ...NETWORK_LIMITS, ...limits };
    for (const [key, min, max] of [
      ["queued", 1, 1024],
      ["cached", 1, 4096],
      ["waitMs", 0, 60000],
    ])
      if (
        !Number.isInteger(this.limits[key]) ||
        this.limits[key] < min ||
        this.limits[key] > max
      )
        throw new Error("Invalid network limits");
    this.nextSequence = 1;
    this.requests = new Map();
    this.queue = [];
    this.running = false;
    this.concurrent = 0;
    this.closed = false;
  }
  receive(raw) {
    let request;
    try {
      request = decodeRequest(raw);
      if (request.session !== this.session)
        throw new CommandError("wrong_session");
      const fingerprint = requestFingerprint(request),
        previous = this.requests.get(request.id);
      if (previous) {
        if (previous.fingerprint !== fingerprint)
          throw new CommandError("request_id_conflict");
        return previous.promise;
      }
      if (this.closed) throw new CommandError("disconnected");
      if (request.sequence !== this.nextSequence)
        throw new CommandError(
          "out_of_order",
          `Expected sequence ${this.nextSequence}`,
        );
      if (this.queue.length + (this.running ? 1 : 0) + this.concurrent >= this.limits.queued)
        throw new CommandError("queue_full");
      let resolve;
      const promise = new Promise((r) => {
        resolve = r;
      });
      this.requests.set(request.id, { fingerprint, promise, settled: false });
      this.nextSequence++;
      const job = { request, resolve };
      if (this.running && this.bus.definition(request.command)?.concurrent === true) {
        this.concurrent++;
        void this.executeJob(job).finally(() => { this.concurrent--; });
      } else {
        this.queue.push(job);
        void this.drain();
      }
      return promise;
    } catch (error) {
      return Promise.resolve(
        this.response(request, { ok: false, error: errorResult(error) }),
      );
    }
  }
  response(request, body) {
    return readOnly({
      protocol: NETWORK_PROTOCOL,
      type: request ? "result" : "error",
      session: this.session,
      ...(request ? { id: request.id, sequence: request.sequence } : {}),
      ...body,
    });
  }
  async run(request) {
    const deadline = this.now() + this.limits.waitMs;
    for (;;) {
      if (this.closed) throw new CommandError("disconnected");
      try {
        this.bus.prepare(request.command, request.input, "network");
      } catch (error) {
        if (error.code !== "busy" || request.policy !== "wait") throw error;
        if (this.now() >= deadline) throw new CommandError("busy_timeout");
        await this.wait(Math.min(16, Math.max(1, deadline - this.now())));
        continue;
      }
      // Only readiness checks are retryable. A handler failure must never replay a partially committed action.
      return await this.bus.execute(request.command, request.input, "network");
    }
  }
  settle(job, body) {
    const response = this.response(job.request, body);
    this.requests.get(job.request.id).settled = true;
    job.resolve(response);
    // Only completed retries are evicted; pending entries remain deduplicated.
    for (const [id, record] of this.requests) {
      if (this.requests.size <= this.limits.cached) break;
      if (record.settled) this.requests.delete(id);
    }
  }
  async executeJob(job) {
    try {
      this.settle(job, { ok: true, result: (await this.run(job.request)) ?? null });
    } catch (error) {
      this.settle(job, { ok: false, error: errorResult(error) });
    }
  }
  async drain() {
    if (this.running) return;
    this.running = true;
    try {
      while (this.queue.length) {
        const job = this.queue.shift();
        await this.executeJob(job);
      }
    } finally {
      this.running = false;
    }
  }
  close() {
    this.closed = true;
    for (const job of this.queue.splice(0))
      this.settle(job, {
        ok: false,
        error: errorResult(new CommandError("disconnected")),
      });
    // An already accepted asynchronous domain action owns its own finally/release and may finish.
  }
}
