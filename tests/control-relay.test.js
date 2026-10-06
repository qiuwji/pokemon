import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { PollingTransport } from "../src/adapters/polling-transport.js";

test("Local HTTP control relay handles real HTTP, sequencing, deduplication and scenario assertions", () => {
  assert.doesNotThrow(() => execFileSync("python3", ["tools/tests/test_control_relay.py"], { cwd: new URL("../", import.meta.url), encoding: "utf8" }));
});
test("Polling transport sends hello before responses and closes on a broken relay", async () => {
  const replies = [];
  const transport = new PollingTransport("http://example/control", async (_url, input) => {
    const body = JSON.parse(input.body); replies.push(body.message);
    return { ok: true, json: async () => ({}) };
  }, 100);
  transport.client = "client";
  transport.send(JSON.stringify({ type: "hello" }));
  transport.send(JSON.stringify({ type: "result" }));
  await transport.sending;
  assert.deepEqual(replies.map(m => m.type), ["hello", "result"]);
  let closed = 0; transport.onClose(() => closed++);
  transport.request = async () => { throw new Error("Disconnected"); };
  await transport.poll();
  assert.equal(closed, 1); assert.equal(transport.closed, true);
  assert.throws(() => transport.send("{}"), /closed/);
});

// A command waiting on UI must not prevent the very input that releases it.
test("Concurrent ingress observes and confirms an awaited domain action while ordinary mutations remain ordered", async () => {
  const { CommandBus } = await import("../src/engine/extensions/command-bus.js");
  const { NetworkGateway } = await import("../src/engine/extensions/network-gateway.js");
  const { objectSchema } = await import("../src/engine/extensions/values.js");
  const bus = new CommandBus(), order = [];
  let release;
  const awaited = new Promise(resolve => { release = resolve; });
  bus.register("core.wait", { schema: objectSchema(), mode: "async", network: true,
    run: async () => { order.push("wait"); await awaited; order.push("released"); return true; } });
  bus.register("core.observe", { schema: objectSchema(), concurrent: true, network: true,
    run: () => ({ active: bus.active }) });
  bus.register("core.confirm", { schema: objectSchema(), concurrent: true, network: true,
    run: () => { release(); return true; } });
  bus.register("core.mutate", { schema: objectSchema(), network: true,
    run: () => { order.push("mutate"); return true; } });
  const gateway = new NetworkGateway({ bus, session: "s" });
  const send = (command, sequence) => gateway.receive(JSON.stringify({ protocol: 1, type: "command", session: "s", id: "req-" + sequence, sequence, command, input: {} }));
  const pending = send("core.wait", 1), queued = send("core.mutate", 2);
  const observation = await send("core.observe", 3);
  assert.equal(observation.result.active, "core.wait");
  assert.deepEqual(order, ["wait"]);
  assert.equal((await send("core.confirm", 4)).ok, true);
  assert.equal((await pending).ok, true); assert.equal((await queued).ok, true);
  assert.deepEqual(order, ["wait", "released", "mutate"]);
  assert.equal(bus.active, null); gateway.close();
});
