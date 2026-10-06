import test from "node:test";
import assert from "node:assert/strict";
import { session } from "../tests/helpers/session.js";
import { starCatch } from "../src/plugins/star-catch/index.js";

const PADDLE_HALF = 22;
const start = (s, parameters) =>
  s.bus.execute("core.interaction.start",
    { definition: "star-catch:catch", parameters: JSON.stringify(parameters) }, "ui");

const drive = async (s, strategy) => {
  for (let i = 0; i < 8000; i++) {
    const view = await s.bus.execute("core.interaction.view", {}, "ui");
    if (!view.active) return null;
    const state = view.instance.state;
    const want = strategy(state);
    await s.bus.execute("core.interaction.input", { action: "left", active: !!want.left }, "ui");
    await s.bus.execute("core.interaction.input", { action: "right", active: !!want.right }, "ui");
    const advanced = await s.bus.execute("core.interaction.advance", { ticks: 1 }, "ui");
    if (advanced.terminals?.length) return advanced.terminals[0];
  }
  return null;
};

test("authoring: the mini-game is steered to a win and settles one reward", async () => {
  const s = session([starCatch]);
  const money = () => s.game.state.money;
  const store = () => s.host.runtime.view("star-catch").store;
  const before = money();

  assert((await start(s, { target: 2, lives: 5, speed: 0.2 })).ok);
  const terminal = await drive(s, (state) => {
    const center = state.paddle + PADDLE_HALF;
    return { left: center > state.starX + 1, right: center < state.starX - 1 };
  });

  assert(terminal, "the mini-game should reach a terminal outcome");
  assert.equal(terminal.outcome, "success");
  assert.equal(money(), before + 200);
  assert.equal(store().get("wins"), 1);
  assert.equal(store().get("plays"), 1);

  s.game.loadDocument(s.game.exportDocument());
  assert.equal(money(), before + 200);
  assert.equal(store().get("wins"), 1);
});

test("authoring: missing every star fails without a reward and can be retried", async () => {
  const s = session([starCatch]);
  const money = () => s.game.state.money;
  const store = () => s.host.runtime.view("star-catch").store;
  const before = money();

  assert((await start(s, { target: 5, lives: 1, speed: 3 })).ok);
  const terminal = await drive(s, (state) => {
    const away = state.starX < 120 ? "right" : "left";
    return { left: away === "left", right: away === "right" };
  });

  assert(terminal, "the mini-game should reach a terminal outcome");
  assert.equal(terminal.outcome, "failure");
  assert.equal(money(), before);
  assert.equal(store().get("wins") ?? 0, 0);
  assert.equal(store().get("plays"), 1);
});

test("authoring: the confirm-key field entry resolves and starts a session", async () => {
  const s = session([starCatch]);
  const definition = s.catalog.fieldActions["star-catch:play"];
  assert(definition, "the field entry should be compiled into the catalog");
  assert(definition.triggers.includes("interact"));

  // The confirm-key flow resolves the triggered id through fieldActionOptions();
  // a menu:false action is filtered out there and gets silently swallowed.
  const entry = s.game.fieldActionOptions().find((a) => a.id === "star-catch:play");
  assert(entry, "the action must be listed for showFieldAction() to find it");
  assert.equal(entry.ok, true);

  const result = await s.game.performFieldAction("star-catch:play");
  assert.equal(result.ok, true);
  assert.equal(s.game.applications.interaction.active(), true);
});
