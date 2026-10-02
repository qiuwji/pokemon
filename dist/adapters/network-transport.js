/** Browser transport adapter. Protocol and domain dispatch remain outside the socket. */
export class WebSocketTransport {
  constructor(socket) {
    this.socket = socket;
    this.messages = new Set();
    this.closures = new Set();
    this.closed = false;
    this.message = (event) => {
      // Binary data has no implicit decoding path into commands.
      for (const listener of this.messages)
        listener(typeof event.data === "string" ? event.data : null);
    };
    this.end = () => this.finish();
    socket.addEventListener("message", this.message);
    socket.addEventListener("close", this.end);
    socket.addEventListener("error", this.end);
  }
  static connect(url, { Socket = WebSocket, timeoutMs = 5000 } = {}) {
    const parsed = new URL(url);
    if (
      !["ws:", "wss:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    )
      return Promise.reject(new Error("Invalid WebSocket endpoint"));
    return new Promise((resolve, reject) => {
      const socket = new Socket(parsed.href);
      const clear = () => {
        clearTimeout(timer);
        socket.removeEventListener("open", opened);
        socket.removeEventListener("error", failed);
        socket.removeEventListener("close", failed);
      };
      const opened = () => {
        clear();
        resolve(new WebSocketTransport(socket));
      };
      const failed = () => {
        clear();
        socket.close();
        reject(new Error("Connection failed"));
      };
      const timer = setTimeout(failed, timeoutMs);
      socket.addEventListener("open", opened);
      socket.addEventListener("error", failed);
      socket.addEventListener("close", failed);
    });
  }
  onMessage(fn) {
    this.messages.add(fn);
    return () => this.messages.delete(fn);
  }
  onClose(fn) {
    this.closures.add(fn);
    return () => this.closures.delete(fn);
  }
  send(raw) {
    if (this.closed || this.socket.readyState !== 1)
      throw new Error("Connection is closed");
    this.socket.send(raw);
  }
  finish() {
    if (this.closed) return;
    this.closed = true;
    this.socket.removeEventListener("message", this.message);
    this.socket.removeEventListener("close", this.end);
    this.socket.removeEventListener("error", this.end);
    for (const listener of [...this.closures]) listener();
    this.messages.clear();
    this.closures.clear();
  }
  close() {
    this.finish();
    this.socket.close();
  }
}
/** In-memory duplex for protocol verification; it follows the exact socket transport contract. */
export function createLoopbackTransport() {
  const make = () => ({
    messages: new Set(),
    closures: new Set(),
    closed: false,
    onMessage(fn) {
      this.messages.add(fn);
      return () => this.messages.delete(fn);
    },
    onClose(fn) {
      this.closures.add(fn);
      return () => this.closures.delete(fn);
    },
    send(raw) {
      if (this.closed || this.peer.closed)
        throw new Error("Connection is closed");
      queueMicrotask(() => {
        if (!this.peer.closed) for (const fn of this.peer.messages) fn(raw);
      });
    },
    close() {
      for (const end of [this, this.peer]) {
        if (end.closed) continue;
        end.closed = true;
        for (const fn of [...end.closures]) fn();
        end.messages.clear();
        end.closures.clear();
      }
    },
  });
  const client = make(),
    server = make();
  client.peer = server;
  server.peer = client;
  return { client, server };
}
