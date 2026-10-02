import { createServer } from "node:http";
import { createHash } from "node:crypto";
/** Test-only RFC 6455 peer: text frames and close, no production service/authentication. */
export async function createWebSocketController(onMessage) {
  const sockets = new Set();
  const server = createServer((_, response) => {
    response.writeHead(404);
    response.end();
  });
  server.on("upgrade", (request, socket, head) => {
    const key = request.headers["sec-websocket-key"];
    if (!key || request.headers["sec-websocket-version"] !== "13") {
      socket.destroy();
      return;
    }
    const accept = createHash("sha1")
      .update(key + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")
      .digest("base64");
    socket.write(
      `HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`,
    );
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => {});
    const send = (value) => {
      const data = Buffer.from(JSON.stringify(value)),
        header = Buffer.alloc(
          data.length < 126 ? 2 : data.length <= 65535 ? 4 : 10,
        );
      header[0] = 0x81;
      if (header.length === 2) header[1] = data.length;
      else if (header.length === 4) {
        header[1] = 126;
        header.writeUInt16BE(data.length, 2);
      } else {
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(data.length), 2);
      }
      socket.write(Buffer.concat([header, data]));
    };
    let buffer = head;
    const consume = (data) => {
      buffer = Buffer.concat([buffer, data]);
      while (buffer.length >= 2) {
        const opcode = buffer[0] & 15,
          masked = !!(buffer[1] & 128);
        let length = buffer[1] & 127,
          offset = 2;
        if (length === 126) {
          if (buffer.length < 4) return;
          length = buffer.readUInt16BE(2);
          offset = 4;
        }
        if (length === 127) {
          if (buffer.length < 10) return;
          const big = buffer.readBigUInt64BE(2);
          if (big > 2097152n) {
            socket.destroy();
            return;
          }
          length = Number(big);
          offset = 10;
        }
        if (!masked || !(buffer[0] & 128) || length > 2097152) {
          socket.destroy();
          return;
        }
        if (buffer.length < offset + 4 + length) return;
        const mask = buffer.subarray(offset, offset + 4),
          payload = Buffer.from(
            buffer.subarray(offset + 4, offset + 4 + length),
          );
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
        buffer = buffer.subarray(offset + 4 + length);
        if (opcode === 8) {
          socket.end(Buffer.from([0x88, 0]));
          return;
        }
        if (opcode !== 1) {
          socket.destroy();
          return;
        }
        try {
          onMessage(JSON.parse(payload.toString("utf8")), send);
        } catch {
          socket.destroy();
        }
      }
    };
    socket.on("data", consume);
    if (head.length) consume(Buffer.alloc(0));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `ws://127.0.0.1:${server.address().port}`,
    close: async () => {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}
