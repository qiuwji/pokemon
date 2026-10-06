/** Same transport contract as WebSocket, with cancellable long polls against the local relay. */
export class PollingTransport {
  static async connect(endpoint, { fetch: request = (...args) => fetch(...args), waitMs = 25000 } = {}) {
    const url = new URL(endpoint, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) || url.search || url.hash)
      throw new Error("Control relay must be same-origin HTTP");
    const transport = new PollingTransport(url.href.replace(/\/$/, ""), request, waitMs);
    transport.client = (await transport.post("connect", {})).client;
    transport.timer = setTimeout(() => void transport.poll(), 0);
    return transport;
  }
  constructor(endpoint, request, waitMs = 25000) {
    if (!Number.isInteger(waitMs) || waitMs < 1 || waitMs > 25000) throw new Error("Invalid long-poll timeout");
    Object.assign(this, { endpoint, request, waitMs });
    this.messages = new Set(); this.closures = new Set(); this.closed = false;
    this.sending = Promise.resolve();
  }
  async post(route, data, signal) {
    const response = await this.request(this.endpoint + "/" + route, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
      ...(signal ? { signal } : {}),
    });
    if (!response.ok) throw new Error("Control relay rejected request");
    return response.json();
  }
  onMessage(fn) { this.messages.add(fn); return () => this.messages.delete(fn); }
  onClose(fn) { this.closures.add(fn); return () => this.closures.delete(fn); }
  send(raw) {
    if (this.closed) throw new Error("Connection is closed");
    this.sending = this.sending.then(() => this.post("reply", { client: this.client, message: JSON.parse(raw) }))
      .catch(() => this.close());
  }
  async poll() {
    if (this.closed || this.polling) return;
    this.polling = true;
    this.abort = new AbortController();
    try {
      const { messages } = await this.post("poll", { client: this.client, waitMs: this.waitMs }, this.abort.signal);
      if (this.closed) return;
      for (const message of messages) for (const fn of this.messages) fn(JSON.stringify(message));
      // Immediately reopen; the server sleeps until ingress or the bounded heartbeat expires.
      this.timer = setTimeout(() => void this.poll(), 0);
    } catch { this.close(); }
    finally { this.polling = false; this.abort = null; }
  }
  close() {
    if (this.closed) return;
    this.closed = true; clearTimeout(this.timer); this.abort?.abort();
    for (const fn of [...this.closures]) fn();
    this.messages.clear(); this.closures.clear();
    void this.post("close", { client: this.client }).catch(() => {});
  }
}
