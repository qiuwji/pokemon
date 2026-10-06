import test from "node:test";
import assert from "node:assert/strict";
import { session, manifest, objectSchema } from "./helpers/session.js";
import { interactionSessionFixture } from "./fixtures/extensions/interaction-session.js";

const prize = (s) => s.host.runtime.query().bag["fixture-bar:prize"] || 0;
const runBar = async (s) => {
  await s.bus.execute(
    "core.interaction.start",
    { definition: "fixture-bar:bar", parameters: JSON.stringify({ speed: 0.1 }) },
    "ui",
  );
  await s.bus.execute("core.interaction.advance", { ticks: 5 }, "ui");
  await s.bus.execute(
    "core.interaction.input",
    { action: "confirm", active: true },
    "ui",
  );
  await s.bus.execute("core.interaction.advance", { ticks: 1 }, "ui");
};

test("a plugin session starts through public commands and settles reward once", async () => {
  const s = session([interactionSessionFixture]);
  const started = await s.bus.execute(
    "core.interaction.start",
    { definition: "fixture-bar:bar", parameters: JSON.stringify({ speed: 0.1 }) },
    "ui",
  );
  assert.equal(started.ok, true);
  await s.bus.execute("core.interaction.advance", { ticks: 5 }, "ui");
  await s.bus.execute(
    "core.interaction.input",
    { action: "confirm", active: true },
    "ui",
  );
  const result = await s.bus.execute("core.interaction.advance", { ticks: 1 }, "ui");
  assert.equal(result.terminals.length, 1);
  assert.equal(result.terminals[0].ok, true, result.terminals[0].reason);
  assert.equal(s.host.runtime.view("fixture-bar").store.get("last"), 0.6);
  assert.equal(prize(s), 1);
  const document = s.game.exportDocument();
  s.game.loadDocument(document);
  assert.equal(s.host.runtime.view("fixture-bar").store.get("last"), 0.6);
  assert.equal(prize(s), 1);

  const view = await s.bus.execute("core.interaction.view", {}, "ui");
  assert.equal(view.active, false);
  assert.equal(view.instance, null);
});

test("the completion handler is host-only and cannot be invoked directly", async () => {
  const s = session([interactionSessionFixture]);
  await assert.rejects(
    s.bus.execute("fixture-bar:finish", {
      instance: "x",
      context: {},
      outcome: "success",
      result: { cursor: 0.5 },
    }, "ui"),
    /unknown/i,
  );
  assert.equal(prize(s), 0);
});

test("a completed session persists its settled result", async () => {
  const s = session([interactionSessionFixture]);
  const writes = [];
  const set = s.saved.set.bind(s.saved);
  s.saved.set = (key, value) => {
    writes.push(key);
    return set(key, value);
  };
  await runBar(s);
  assert.equal(prize(s), 1);
  assert(writes.length >= 1);
});

test("a session cannot start while a story holds the host", async () => {
  const s = session([interactionSessionFixture]);
  s.game.storyBusy = true;
  await assert.rejects(
    s.bus.execute(
      "core.interaction.start",
      { definition: "fixture-bar:bar", parameters: JSON.stringify({ speed: 0.1 }) },
      "ui",
    ),
    /busy/,
  );
  s.game.storyBusy = false;
});

test("a read-only view callback cannot dispatch a command", async () => {
  const plugin = manifest("view-guard", (api) => {
    api.interactions.register("bar", {
      version: 1,
      parameters: objectSchema(),
      state: objectSchema({ cursor: { type: "number" } }, ["cursor"]),
      result: objectSchema({ cursor: { type: "number" } }, ["cursor"]),
      inputs: ["confirm"],
      init: () => ({ cursor: 0 }),
      step: (state) => ({ kind: "running", state }),
      view: () => {
        api.commands
          .dispatch("core.interaction.cancel", {})
          .catch(() => {});
        return { nodes: [] };
      },
    });
  });
  const s = session([plugin]);
  await s.bus.execute("core.interaction.start", { definition: "view-guard:bar" }, "ui");
  await s.bus.execute("core.interaction.view", {}, "ui");
  assert.equal(s.game.applications.interaction.active(), true);
});

test("a field/facility entry can start a session through the interaction application", async () => {
  const s = session([interactionSessionFixture]);
  const view = s.game.applications.interaction.start(
    "fixture-bar:bar",
    { speed: 0.1 },
    "field:demo",
  );
  assert.equal(view.lifecycle, "running");
  assert.equal(s.game.applications.interaction.active(), true);
  await s.bus.execute("core.interaction.advance", { ticks: 5 }, "ui");
  await s.bus.execute(
    "core.interaction.input",
    { action: "confirm", active: true },
    "ui",
  );
  await s.bus.execute("core.interaction.advance", { ticks: 1 }, "ui");
  assert.equal(s.game.applications.interaction.active(), false);
});

test("completion publishes a source-tagged fact for world/facility adapters", async () => {
  const s = session([interactionSessionFixture]);
  const observed = [];
  s.host.events.on("core:interaction-completed", (event) =>
    observed.push(event.payload),
  );
  await s.bus.execute(
    "core.interaction.start",
    { definition: "fixture-bar:bar", source: "field:demo", parameters: JSON.stringify({ speed: 0.1 }) },
    "ui",
  );
  await s.bus.execute("core.interaction.advance", { ticks: 5 }, "ui");
  await s.bus.execute(
    "core.interaction.input",
    { action: "confirm", active: true },
    "ui",
  );
  await s.bus.execute("core.interaction.advance", { ticks: 1 }, "ui");
  assert.equal(observed.length, 1);
  assert.equal(observed[0].source, "field:demo");
  assert.equal(observed[0].outcome, "success");
});
