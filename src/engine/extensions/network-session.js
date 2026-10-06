import {
  encodeMessage,
  errorResult,
  NETWORK_PROTOCOL,
} from "./network-protocol.js";
/** Replaceable transport contract: onMessage/onClose/send/close. Connection owns no game state. */
export class NetworkSession {
  constructor({
    gateway,
    transport,
    onError = () => {},
    onResponse = () => {},
  }) {
    Object.assign(this, { gateway, transport, onError, onResponse });
    this.closed = false;
    this.unsubscribe = transport.onMessage((raw) => void this.accept(raw));
    this.unsubscribeClose = transport.onClose(() => this.close());
    try {
      transport.send(
        encodeMessage({
          protocol: NETWORK_PROTOCOL,
          type: "hello",
          session: gateway.session,
          nextSequence: gateway.nextSequence,
        }),
      );
    } catch (error) {
      this.close();
      throw error;
    }
  }
  async accept(raw) {
    try {
      const response = await this.gateway.receive(raw);
      if (!this.closed) {
        let encoded;
        try {
          encoded = encodeMessage(response);
        } catch (error) {
          encoded = encodeMessage({
            protocol: NETWORK_PROTOCOL,
            type: "result",
            session: response.session,
            id: response.id,
            sequence: response.sequence,
            ok: false,
            error: errorResult(error),
          });
        }
        try {
          this.onResponse(response);
        } catch (error) {
          this.onError(error);
        }
        this.transport.send(encoded);
      }
    } catch (error) {
      this.onError(error);
    }
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.unsubscribe?.();
    this.unsubscribeClose?.();
    this.gateway.close();
    this.transport.close();
  }
}
