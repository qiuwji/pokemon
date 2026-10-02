import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CommandBus,
  CommandError,
} from "../dist/engine/extensions/command-bus.js";
import { objectSchema } from "../dist/engine/extensions/values.js";
import { NetworkGateway } from "../dist/engine/extensions/network-gateway.js";
import { NetworkSession } from "../dist/engine/extensions/network-session.js";
import {
  createLoopbackTransport,
  WebSocketTransport,
} from "../dist/adapters/network-transport.js";
import { createEmeraldCommandFacade } from "../dist/packs/emerald/command-facade.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { createMonster } from "../dist/engine/model.js";
import { companionCare } from "../dist/plugins/companion-care.js";
const wire = (sequence, command = "test.increment", input = {}, extras = {}) =>
  JSON.stringify({
    protocol: 1,
    type: "command",
    session: "test-session",
    id: `request-${sequence}`,
    sequence,
    command,
    input,
    ...extras,
  });
const tick = () => new Promise((resolve) => setImmediate(resolve));
function counter(options = {}) {
  let value = 0;
  const bus = new CommandBus(options);
  bus.register("test.increment", {
    schema: objectSchema(),
    network: true,
    run: () => ++value,
  });
  bus.register("test.private", { schema: objectSchema(), run: () => ++value });
  return {
    bus,
    gateway: new NetworkGateway({ bus, session: "test-session" }),
    value: () => value,
  };
}
test("Wire decoder rejects malformed, oversized, unsupported and prototype-bearing messages without mutation", async () => {
  const { gateway, value } = counter();
  for (const raw of [
    "{",
    "null",
    wire(1, undefined, {}, { protocol: 2 }),
    wire(1, undefined, {}, { extra: true }),
    wire(1, undefined, { constructor: "bad" }),
    " ".repeat(16385),
    wire(1, undefined, {}, { session: "foreign" }),
  ]) {
    assert.equal((await gateway.receive(raw)).ok, false);
  }
  assert.equal(value(), 0);
  assert.equal((await gateway.receive(wire(1))).result, 1);
});
test("Completed and pending duplicate requests execute exactly once; conflicts and out-of-order requests are explicit", async () => {
  const { gateway, value, bus } = counter();
  let release;
  bus.register("test.slow", {
    mode: "async",
    schema: objectSchema(),
    network: true,
    run: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const first = gateway.receive(wire(1, "test.slow")),
    retry = gateway.receive(wire(1, "test.slow"));
  assert.equal(first, retry);
  assert.equal(
    (await gateway.receive(wire(1))).error.code,
    "request_id_conflict",
  );
  assert.equal((await gateway.receive(wire(3))).error.code, "out_of_order");
  const second = gateway.receive(wire(2));
  release("finished");
  assert.equal((await first).result, "finished");
  assert.equal((await second).result, 1);
  assert.deepEqual(await gateway.receive(wire(2)), await second);
  assert.equal(value(), 1);
  assert.equal(bus.active, null);
});
test("Unknown/private commands and invalid parameters are rejected on the shared registry; failures consume accepted sequence", async () => {
  const { gateway, value } = counter();
  assert.equal(
    (await gateway.receive(wire(1, "missing"))).error.code,
    "unknown_command",
  );
  assert.equal(
    (await gateway.receive(wire(2, "test.private"))).error.code,
    "not_network_enabled",
  );
  assert.equal(
    (await gateway.receive(wire(3, "test.increment", { extra: 1 }))).ok,
    false,
  );
  assert.equal((await gateway.receive(wire(4))).result, 1);
  assert.equal(value(), 1);
});
test("Reject and bounded wait busy policies use readiness only; handler busy errors never replay", async () => {
  let busy = true,
    now = 0;
  const { bus, value } = counter({ ready: () => !busy });
  const gateway = new NetworkGateway({
    bus,
    session: "test-session",
    now: () => now,
    wait: async (ms) => {
      now += ms;
      if (now >= 32) busy = false;
    },
  });
  assert.equal((await gateway.receive(wire(1))).error.code, "busy");
  assert.equal(
    (await gateway.receive(wire(2, undefined, {}, { policy: "wait" }))).result,
    1,
  );
  busy = true;
  const timeout = new NetworkGateway({
    bus,
    session: "test-session",
    now: () => now,
    wait: async (ms) => {
      now += ms;
    },
    limits: { waitMs: 32 },
  });
  assert.equal(
    (await timeout.receive(wire(1, undefined, {}, { policy: "wait" }))).error
      .code,
    "busy_timeout",
  );
  busy = false;
  let attempts = 0;
  bus.register("test.partial", {
    schema: objectSchema(),
    network: true,
    run: () => {
      attempts++;
      throw new CommandError("busy");
    },
  });
  assert.equal(
    (await gateway.receive(wire(3, "test.partial", {}, { policy: "wait" })))
      .error.code,
    "busy",
  );
  assert.equal(attempts, 1);
  assert.equal(value(), 1);
});
test("Queue bounds and disconnect cancel pending work while a committed asynchronous action releases its own lock", async () => {
  const { bus, value } = counter();
  let release;
  bus.register("test.slow", {
    mode: "async",
    schema: objectSchema(),
    network: true,
    run: () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  });
  const gateway = new NetworkGateway({
    bus,
    session: "test-session",
    limits: { queued: 2 },
  });
  const active = gateway.receive(wire(1, "test.slow")),
    pending = gateway.receive(wire(2));
  assert.equal((await gateway.receive(wire(3))).error.code, "queue_full");
  gateway.close();
  assert.equal((await pending).error.code, "disconnected");
  release("committed");
  assert.equal((await active).result, "committed");
  assert.equal(bus.active, null);
  assert.equal(value(), 0);
  assert.equal((await gateway.receive(wire(3))).error.code, "disconnected");
});
test("Retry fingerprints ignore object key order and expired cache cannot replay an old sequence", async () => {
  const bus = new CommandBus();
  let count = 0;
  bus.register("test.pair", {
    schema: objectSchema({ a: { type: "integer" }, b: { type: "integer" } }),
    network: true,
    run: () => ++count,
  });
  const gateway = new NetworkGateway({
    bus,
    session: "test-session",
    limits: { cached: 1 },
  });
  await gateway.receive(wire(1, "test.pair", { a: 1, b: 2 }));
  assert.equal(
    (await gateway.receive(wire(1, "test.pair", { b: 2, a: 1 }))).result,
    1,
  );
  await gateway.receive(wire(2, "test.pair"));
  assert.equal(
    (await gateway.receive(wire(1, "test.pair", { a: 1, b: 2 }))).error.code,
    "out_of_order",
  );
  assert.equal(count, 2);
});
test("Loopback transport carries hello, encoded commands, results and disconnect without protocol-specific game logic", async () => {
  const { gateway, value } = counter(),
    { client, server } = createLoopbackTransport(),
    received = [];
  client.onMessage((raw) => received.push(JSON.parse(raw)));
  const session = new NetworkSession({ gateway, transport: server });
  await tick();
  assert.equal(received[0].type, "hello");
  client.send(wire(1));
  await tick();
  assert.equal(received.at(-1).result, 1);
  client.send(wire(1));
  await tick();
  assert.equal(value(), 1);
  client.close();
  assert(session.closed);
  assert(gateway.closed);
});
class FakeSocket extends EventTarget {
  static last;
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 0;
    this.sent = [];
    FakeSocket.last = this;
    queueMicrotask(() => {
      this.readyState = 1;
      this.dispatchEvent(new Event("open"));
    });
  }
  send(raw) {
    this.sent.push(raw);
  }
  close() {
    this.readyState = 3;
    this.dispatchEvent(new Event("close"));
  }
  receive(data) {
    this.dispatchEvent(new MessageEvent("message", { data }));
  }
}
test("WebSocket adapter and loopback are interchangeable; binary input and disconnection are handled by the wire boundary", async () => {
  const transport = await WebSocketTransport.connect("ws://127.0.0.1:8787", {
      Socket: FakeSocket,
    }),
    { gateway } = counter();
  const session = new NetworkSession({ gateway, transport }),
    socket = FakeSocket.last;
  socket.receive(new Uint8Array([1]));
  await tick();
  assert.equal(JSON.parse(socket.sent.at(-1)).error.code, "invalid_message");
  socket.receive(wire(1));
  await tick();
  assert.equal(JSON.parse(socket.sent.at(-1)).result, 1);
  socket.close();
  assert(session.closed);
  assert(gateway.closed);
  await assert.rejects(
    WebSocketTransport.connect("https://example.com", { Socket: FakeSocket }),
    /endpoint/,
  );
});
function adventure() {
  const base = JSON.parse(
      fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
    ),
    { host, db, catalog } = createEmeraldPlugins(base, [companionCare]);
  const timeline = new Timeline({ now: () => 0, wait: async () => {} }),
    game = new EmeraldAdventure({
      db,
      catalog,
      plugins: host,
      timeline,
      transitions: new TransitionController(timeline),
      director: new BattleDirector(timeline),
      motion: new GridMotion(new SceneGraph(db.maps)),
      storage: { getItem: () => null, setItem() {} },
    });
  game.ui = {
    blocked: false,
    dialog: null,
    updateSide() {},
    closeModal() {},
    extensions: { refresh() {}, present() {} },
  };
  const { bus } = attachEmeraldExtensions(game, host);
  game.state.party.push(
    createMonster("mudkip", 6, db, game.rng),
    createMonster("treecko", 6, db, game.rng),
  );
  game.state.flags.rescued = true;
  game.state.flags.pokedex = true;
  return { game, host, bus, ui: createEmeraldCommandFacade(game, bus) };
}
test("UI facade, plugin action and network use one registry; stable UIDs survive reordering and disabled commands cannot replace saves", async () => {
  const { game, ui, bus } = adventure(),
    uid = game.state.party[1].uid,
    completed = [];
  const originalComplete = bus.onComplete;
  bus.onComplete = (...args) => {
    completed.push(args[0]);
    originalComplete(...args);
  };
  assert(ui.setLead(1));
  assert.equal(game.state.party[0].uid, uid);
  const gateway = new NetworkGateway({ bus, session: "test-session" });
  assert(
    (
      await gateway.receive(
        wire(1, "companion-care:interact", { uid, activity: "pet" }),
      )
    ).ok,
  );
  assert.equal(
    game.state.extensions["companion-care"].data.partners[uid].interactions,
    1,
  );
  await gateway.receive(
    wire(1, "companion-care:interact", { uid, activity: "pet" }),
  );
  assert.equal(
    game.state.extensions["companion-care"].data.partners[uid].interactions,
    1,
  );
  assert.equal(
    (await gateway.receive(wire(2, "core.save.reset"))).error.code,
    "not_network_enabled",
  );
  assert.equal(
    (await gateway.receive(wire(3, "core.save.import", { document: "{}" })))
      .error.code,
    "not_network_enabled",
  );
  assert.deepEqual(completed.slice(0, 2), [
    "core.party.lead",
    "companion-care:interact",
  ]);
  game.storyBusy = true;
  assert.equal(ui.move("up"), false);
  assert.equal(
    (await gateway.receive(wire(4, "core.item.buy", { item: "potion" }))).error
      .code,
    "busy",
  );
  game.storyBusy = false;
  ui.advancePlayTime();
  assert.equal(game.state.playSeconds, 0);
  game.tickTime(0);
  game.tickTime(1000);
  assert.equal(game.state.playSeconds, 1);
});
test("Core actions enforce UID/custody/selection constraints and UI evolution commands rebuild a valid domain plan", async () => {
  const { game, ui, bus } = adventure();
  assert.equal(ui.chooseStarter("mudkip") instanceof Promise, true);
  await tick();
  assert.equal(game.state.flags.starter, undefined);
  await assert.rejects(
    bus.execute("core.item.equip", { uid: game.state.party[0].uid }),
    /item/,
  );
  await assert.rejects(
    bus.execute("core.growth.learn", {
      uid: game.state.party[0].uid,
      index: 0,
      skip: true,
    }),
    /slot/,
  );
  game.enter({
    map: "LittlerootTown_ProfessorBirchsLab",
    x: 8,
    y: 8,
    dir: "up",
  });
  const mon = createMonster("eevee", 6, game.db, game.rng);
  game.state.party.push(mon);
  game.state.bag.water_stone = 1;
  const plan = game.evolutionPlan(mon, {
    trigger: "item",
    item: "water_stone",
  });
  assert(plan);
  assert((await ui.animateEvolution(mon, plan)).ok);
  assert.equal(mon.species, "vaporeon");
  assert.equal(game.state.bag.water_stone, 0);
  assert.equal(bus.active, null);
});

test(
  "Real loopback WebSocket handshake and encoded retry reach the same CommandBus once",
  { timeout: 5000 },
  async (t) => {
    const { createWebSocketController } = await import(
      "./helpers/websocket-controller.js"
    );
    const { gateway, value } = counter();
    let resolve;
    const done = new Promise((r) => {
        resolve = r;
      }),
      results = [];
    const controller = await createWebSocketController((message, send) => {
      if (message.type === "hello") {
        send(JSON.parse(wire(1)));
        send(JSON.parse(wire(1)));
      }
      if (message.type === "result") {
        results.push(message);
        if (results.length === 2) resolve();
      }
    });
    t.after(() => controller.close());
    const transport = await WebSocketTransport.connect(controller.url),
      session = new NetworkSession({ gateway, transport });
    t.after(() => session.close());
    await done;
    assert.equal(results[0].result, 1);
    assert.equal(results[1].result, 1);
    assert.equal(value(), 1);
  },
);

test("Readiness callbacks cannot leave locks overwritten and completion observers cannot report a committed command as failed", async () => {
  const errors = [],
    bus = new CommandBus({
      onComplete: () => {
        throw new Error("observer fault");
      },
      onError: (error) => errors.push(error),
    });
  bus.register("test.commit", {
    schema: objectSchema(),
    run: () => "committed",
  });
  assert.equal(bus.executeSync("test.commit"), "committed");
  assert.equal(errors[0].message, "observer fault");
  assert.throws(() =>
    bus.register("test.concurrent", {
      schema: objectSchema(),
      mode: "async",
      concurrent: true,
      run: async () => true,
    }),
  );
  assert.throws(
    () =>
      new NetworkGateway({
        bus,
        session: "test-session",
        limits: { queued: 0 },
      }),
    /limits/,
  );
});

test("Command completion is delivered after lock release, allowing a committed listener to submit follow-up work", async () => {
  const bus = new CommandBus();
  let count = 0;
  bus.register("test.follow", { schema: objectSchema(), run: () => ++count });
  bus.register("test.async", {
    schema: objectSchema(),
    mode: "async",
    run: async () => true,
  });
  bus.onComplete = (id) => {
    if (id === "test.async") bus.executeSync("test.follow");
  };
  await bus.execute("test.async");
  assert.equal(count, 1);
  assert.equal(bus.active, null);
});
