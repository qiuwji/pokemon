import test from "node:test";
import assert from "node:assert/strict";
import { PluginHost } from "../dist/engine/extensions/plugin-host.js";
import { Battle } from "../dist/engine/battle.js";
import { createMonster } from "../dist/engine/model.js";
import {
  manifest,
  session,
  objectSchema,
} from "./helpers/session.js";

test("Plugin subscriptions reject internal/unknown core facts, foreign namespaces and namespace spoofing atomically", () => {
  for (const type of [
    "core:command-complete",
    "core:future-private",
    "other:secret",
    "observer-extra:secret",
    "observer:",
    "observer:x:y",
    null,
  ]) {
    const host = new PluginHost({
      base: {},
      publicEvents: ["core:field-step"],
    });
    assert.throws(
      () =>
        host.load([
          manifest("observer", (api) => {
            api.content.register("resources", "icon", "assets/egg-front.png");
            api.events.on(type, () => {});
          }),
        ]),
      /Event subscription denied|Invalid event subscription/,
    );
    assert.equal(host.catalog.entries.size, 0);
    assert.equal(host.manifests.size, 0);
    assert.equal(host.events.listeners.size, 0);
  }
  assert.throws(
    () => new PluginHost({ base: {} }).load([manifest("core", () => {})]),
    /manifest/,
  );
});

test("Own and declared dependency events remain observable as detached frozen facts", () => {
  const facts = [];
  const dependencies = { publisher: 1 };
  let observer;
  const host = new PluginHost({ base: {} });
  host.load([
    manifest("publisher", () => {}),
    {
      ...manifest("observer", (api) => {
        observer = api;
        for (const type of ["observer:finished", "publisher:finished"])
          api.events.on(type, (event) => {
            assert(Object.isFrozen(event.payload.nested));
            assert.throws(
              () => event.payload.nested.values.push("changed"),
              TypeError,
            );
            facts.push(event);
          });
      }),
      dependencies,
    },
  ]);
  dependencies.secret = 1;
  assert.throws(
    () => observer.events.on("secret:finished", () => {}),
    /Event subscription denied/,
  );
  const payload = { nested: { values: [1] } };
  host.events.emit("publisher:finished", payload);
  host.events.emit("observer:finished", payload);
  assert.equal(facts.length, 2);
  assert.notEqual(facts[0].payload, payload);
  assert.deepEqual(payload, { nested: { values: [1] } });
});

test("Public command settlement reveals neither private command identity nor arguments/results", async () => {
  let api;
  const publicFacts = [],
    privateFacts = [];
  const { bus, host } = session([
    manifest("observer", (extension) => {
      api = extension;
      api.events.on("core:command-settled", (fact) => publicFacts.push(fact));
    }),
  ]);
  host.events.on("core:command-complete", (fact) => privateFacts.push(fact));
  bus.register("core.private", {
    schema: objectSchema({ token: { type: "string" } }, ["token"]),
    run: ({ token }) => ({ privateRecord: token }),
  });
  await assert.rejects(
    api.commands.dispatch("core.private", { token: "private-input" }),
    /permission denied/,
  );
  assert.equal(publicFacts.length, 0);
  await bus.execute("core.private", { token: "private-input" });
  assert.equal(publicFacts.length, 1);
  assert.equal(publicFacts[0].type, "core:command-settled");
  assert.deepEqual(publicFacts[0].payload, {});
  assert.equal(JSON.stringify(publicFacts).includes("private"), false);
  assert.equal(privateFacts[0].payload.id, "core.private");
  assert.deepEqual(privateFacts[0].payload.args, { token: "private-input" });
  assert.deepEqual(privateFacts[0].payload.result, {
    privateRecord: "private-input",
  });
});

for (const kind of ["rule", "ability"]) {
  test(`Plugin ${kind} type transforms cannot mutate live condition arrays and can return a replacement`, () => {
    let calls = 0;
    const modify = (value) => {
      calls++;
      assert(Object.isFrozen(value));
      assert.throws(() => value.push("poison"), TypeError);
      return [...value, "fire"];
    };
    const plugin = manifest("transformer", (api) => {
      if (kind === "rule")
        api.rules.register("types", { phase: "types", modify });
      else
        api.content.register("abilities", "types", {
          name: "类型修饰",
          hooks: [{ phase: "types", role: "actor", modify }],
        });
    });
    const { game, db, mon } = session([plugin]);
    if (kind === "ability") mon.ability = "transformer:types";
    const battle = new Battle({
      party: game.state.party,
      enemy: createMonster("zigzagoon", 5, db, game.rng),
      db,
      rng: game.rng,
      bag: game.state.bag,
      traits: {
        abilities: game.catalog.abilities,
        heldItems: game.catalog.heldItems,
        hooks: game.ruleHooks,
      },
    });
    const original = ["water"];
    const condition = battle.conditions.get(battle.homeSeat);
    condition.types = original;
    const effective = battle.traits.types(battle.homeSeat);
    assert.deepEqual(effective, ["water", "fire"]);
    assert.equal(condition.types, original);
    assert.deepEqual(original, ["water"]);
    assert.equal(Object.isFrozen(original), false);
    assert(calls > 0);
  });
}
