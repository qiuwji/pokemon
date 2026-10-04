/** Same transport contract as WebSocketTransport, using the local developer HTTP relay. */
export class PollingTransport {
  static async connect(endpoint, { fetch: request = (...args) => fetch(...args), intervalMs = 100 } = {}) {
    const url = new URL(endpoint, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol) || url.search || url.hash)
      throw new Error("Control relay must be same-origin HTTP");
    const transport = new PollingTransport(url.href.replace(/\/$/, ""), request, intervalMs);
    transport.client = (await transport.post("connect", {})).client;
    transport.timer = setTimeout(() => void transport.poll(), 0);
    return transport;
  }
  constructor(endpoint, request, intervalMs) {
    Object.assign(this, { endpoint, request, intervalMs });
    this.messages = new Set(); this.closures = new Set(); this.closed = false;
    this.sending = Promise.resolve();
  }
  async post(route, data) {
    const response = await this.request(this.endpoint + "/" + route, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data),
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
    try {
      const { messages } = await this.post("poll", { client: this.client });
      if (this.closed) return;
      for (const message of messages) for (const fn of this.messages) fn(JSON.stringify(message));
      this.timer = setTimeout(() => void this.poll(), this.intervalMs);
    } catch { this.close(); }
  }
  close() {
    if (this.closed) return;
    this.closed = true; clearTimeout(this.timer);
    for (const fn of [...this.closures]) fn();
    this.messages.clear(); this.closures.clear();
    void this.post("close", { client: this.client }).catch(() => {});
  }
}
