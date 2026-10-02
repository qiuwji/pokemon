import {
  jsonValue,
  objectSchema,
  validateSchema,
  validateValue,
} from "./values.js";
import { CommandError } from "./command-bus.js";
export const NETWORK_PROTOCOL = 1;
export const NETWORK_LIMITS = Object.freeze({
  requestBytes: 16384,
  responseBytes: 2097152,
  queued: 32,
  cached: 128,
  waitMs: 3000,
});
const identifier = { type: "string", minLength: 1, maxLength: 128 };
const envelope = validateSchema(
  objectSchema(
    {
      protocol: { type: "integer", enum: [NETWORK_PROTOCOL] },
      type: { type: "string", enum: ["command"] },
      session: identifier,
      id: identifier,
      sequence: {
        type: "integer",
        minimum: 1,
        maximum: Number.MAX_SAFE_INTEGER,
      },
      command: identifier,
      policy: { type: "string", enum: ["reject", "wait"] },
      // Command-specific input is validated by the same CommandBus used by UI.
    },
    ["protocol", "type", "session", "id", "sequence", "command"],
  ),
);
export function decodeRequest(raw) {
  try {
    if (
      typeof raw !== "string" ||
      new TextEncoder().encode(raw).length > NETWORK_LIMITS.requestBytes
    )
      throw new Error("Expected bounded JSON text");
    const request = jsonValue(JSON.parse(raw), NETWORK_LIMITS.requestBytes),
      { input = {}, ...header } = request;
    validateValue(envelope, header, "message");
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error("Command input must be an object");
    return { ...header, input, policy: header.policy || "reject" };
  } catch (error) {
    throw new CommandError("invalid_message", error.message);
  }
}
export function encodeMessage(message) {
  return JSON.stringify(jsonValue(message, NETWORK_LIMITS.responseBytes));
}
export function errorResult(error) {
  return {
    code: error.code || "command_failed",
    message: String(error.message || "Command failed").slice(0, 256),
  };
}
/** Stable identity fingerprint: object key order does not change retry identity. */
export function requestFingerprint(value) {
  return JSON.stringify(value, function (_, v) {
    return v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, v[k]]),
        )
      : v;
  });
}
