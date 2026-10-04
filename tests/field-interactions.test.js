import { loadContentSync } from "../tools/content-io.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  session,
  manifest,
  objectSchema,
} from "./helpers/session.js";
import { createFieldFixture } from "./fixtures/extensions/field.js";
import {
  FieldEffectRegistry,
  FieldEffects,
  emptyFieldEffects,
} from "../dist/engine/field-effects.js";
import { EMERALD_FIELD_EFFECTS } from "../dist/packs/emerald/field-effects.js";
import { FieldActionRegistry } from "../dist/engine/field-actions.js";
import {
  LightingDirector,
  lightMask,
  drawLighting,
} from "../dist/presentation/lighting.js";
import { validateContent } from "../dist/engine/content.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { planObjectMotion } from "../dist/engine/object-motion.js";
import { setQuantity, inventoryQuantity } from "./helpers/inventory-fixture.js";
const base = loadContentSync();
const room = "fixture-field:room";
function workshop() {
  const s = session([
    createFieldFixture(base.maps.LittlerootTown_ProfessorBirchsLab),
  ]);
  assert(s.game.enter({ map: room, x: 3, y: 4, dir: "up" }));
  return s;
}
function effects() {
  const maps = {
    cave: { indoor: true, darkness: { radius: 24, illuminatedRadius: 72 } },
    next: { indoor: true, darkness: { radius: 24, illuminatedRadius: 96 } },
    town: { indoor: false },
  };
  const service = new FieldEffects({
    maps,
    state: emptyFieldEffects(),
    registry: new FieldEffectRegistry(EMERALD_FIELD_EFFECTS),
  });
  service.commit(service.prepareVisit("cave"));
  return service;
}
test("Effect scopes preserve active saves, reset visit effects and apply registered retention on ordinary entry versus travel", () => {
  const e = effects();
  e.commit(e.prepare("strength", {}));
  e.commit(e.prepare("flash", {}));
  assert.equal(e.prepareVisit("cave", { resume: true }), null);
  const reload = new FieldEffects({
    registry: e.registry,
    maps: e.maps,
    state: structuredClone(e.state),
  });
  assert.deepEqual(reload.view(), e.view());
  e.commit(e.prepareVisit("next"));
  assert.equal(e.state.records.strength, undefined);
  assert.equal(e.view().records.flash.presentation.radius, 96);
  e.commit(e.prepareVisit("town"));
  assert.deepEqual(e.state.records, {});
  e.commit(e.prepareVisit("cave"));
  e.commit(e.prepare("flash", {}));
  e.commit(e.prepareVisit("next", { reason: "travel" }));
  assert.deepEqual(e.state.records, {});
});
test("Effect data, ownership, one-shot plans and retention contracts fail before mutation", () => {
  const e = effects(),
    before = structuredClone(e.state);
  assert.throws(() => e.prepare("flash", { radius: -1 }));
  assert.throws(() => e.prepare("absent", {}), /Unknown field effect/);
  const a = e.prepare("strength", {}),
    b = e.prepare("flash", {});
  assert.throws(() => e.commit({ ...a }), /plan changed/);
  assert.deepEqual(e.state, before);
  e.commit(a);
  assert.throws(() => e.commit(a), /plan changed/);
  assert.throws(() => e.commit(b), /plan changed/);
  assert.throws(
    () =>
      new FieldEffects({
        registry: e.registry,
        maps: e.maps,
        state: { ...e.state, records: { strength: { data: {}, map: "next" } } },
      }),
    /owner/,
  );
  const registry = new FieldEffectRegistry({
    bad: { scope: "world", schema: objectSchema(), retain: () => "yes" },
  });
  const bad = new FieldEffects({
    registry,
    maps: e.maps,
    state: emptyFieldEffects(),
  });
  bad.commit(bad.prepareVisit("cave"));
  bad.commit(bad.prepare("bad", {}));
  const saved = structuredClone(bad.state);
  assert.throws(() => bad.prepareVisit("next"), /boolean/);
  assert.deepEqual(bad.state, saved);
  assert.throws(
    () =>
      new FieldEffectRegistry({
        bad: { scope: "visit", schema: objectSchema(), retain: () => true },
      }),
  );
});
test("Strength activation owns no PP or encounter rolls; ordinary blocked movement displaces and follows through registered plans", async () => {
  const { game: g, bus, mon } = workshop();
  assert(g.enter({ map: room, x: 5, y: 4, dir: "up" }));
  mon.moves = [{ id: "strength", pp: 1, maxPP: 15 }];
  mon.hp = 0;
  const seed = g.rng.seed;
  assert.equal(
    (await bus.execute("core.field.action", { id: "strength" })).ok,
    false,
  );
  g.state.flags.badgeHeat = true;
  assert.equal(
    (await bus.execute("core.field.action", { id: "strength" })).ok,
    true,
  );
  assert.equal(g.field.npcs.objects(room).find((o) => o.id === "stone").y, 3);
  const receipt = await bus.execute("core.field.move", { direction: "up" });
  assert.equal(receipt.status, "interacted"); assert.equal(receipt.moved, false);
  await g.applications.fieldActions.pendingInteraction;
  assert.equal(g.state.position.y, 3);
  assert.equal(g.field.npcs.objects(room).find((o) => o.id === "stone").y, 2);
  assert.equal(mon.moves[0].pp, 1);
  assert.equal(g.rng.seed, seed);
  assert.equal(g.field.busy, false);
  assert.equal(g.actionBusy, false);
  g.loadDocument(g.exportDocument());
  assert.equal(g.fieldEffectView().records.strength.map, room);
  assert.equal(g.field.npcs.objects(room).find((o) => o.id === "stone").y, 2);
  assert(g.enter({ map: room, x: 5, y: 4, dir: "up" }));
  assert.equal(g.fieldEffectView().records.strength, undefined);
  assert.equal(g.field.npcs.objects(room).find((o) => o.id === "stone").y, 3);
});
test("A custom crate triggers without story; its final occupancy drives an independently registered sensor", async () => {
  const { game: g, bus, host } = workshop(),
    facts = [],
    stories = g.state.story.completed.slice();
  host.events.on("core:device-fact", (e) => facts.push(e.payload));
  const receipt = await bus.execute("core.field.move", { direction: "up" });
  assert.equal(receipt.status, "interacted"); assert.equal(receipt.moved, false);
  await g.applications.fieldActions.pendingInteraction;
  assert.equal(g.state.position.y, 3);
  assert.equal(g.field.npcs.objects(room).find((o) => o.id === "crate").y, 2);
  assert.deepEqual(
    g.applications.devices.view().records["fixture-field:sensor"],
    { pressed: true },
  );
  assert.equal(facts.length, 1);
  assert.equal(facts[0].kind, "weight-changed");
  assert.deepEqual(g.state.story.completed, stories);
});
test("Object destinations reject walls, water, other objects, warps and incompatible elevations without moving either participant", async () => {
  for (const obstacle of [
    { kind: "tile", map: room, x: 3, y: 2, block: 1024 },
    { kind: "tile", map: room, x: 3, y: 2, behavior: 16 },
    {
      kind: "object",
      map: room,
      id: "obstacle",
      spawn: true,
      changes: { x: 3, y: 2, actor: "Boy1" },
    },
    { kind: "tile", map: room, x: 3, y: 2, block: 2 << 12 },
  ]) {
    const { game: g } = workshop();
    g.patchWorld([obstacle]);
    if (obstacle.block === 2 << 12) {
      g.patchWorld([
        {
          kind: "object",
          map: room,
          id: "crate",
          changes: { elevation: 1, previousElevation: 1 },
        },
      ]);
      g.state.position.elevation = 1;
      g.state.position.previousElevation = 1;
    }
    const before = structuredClone(g.state.worldState),
      position = { ...g.state.position };
    const result = await g.performFieldAction(
      "fixture-field:shift-crate",
    );
    assert.equal(result.ok, false, JSON.stringify(obstacle));
    assert.deepEqual(g.state.worldState, before);
    assert.deepEqual(g.state.position, position);
    assert.equal(g.actionBusy, false);
  }
  const { game: g } = session([
    createFieldFixture(base.maps.LittlerootTown_ProfessorBirchsLab),
    manifest("warp-case", (api) =>
      api.content.register("mapExtensions", "warp", {
        map: room,
        warps: [
          {
            x: 3,
            y: 2,
            dest_map: "LittlerootTown",
            dest_warp_id: "0",
            elevation: 0,
          },
        ],
      }),
    ),
  ]);
  assert(g.enter({ map: room, x: 3, y: 4, dir: "up" }));
  assert.equal(
    (await g.performFieldAction("fixture-field:shift-crate")).ok,
    false,
  );
  assert.equal(g.state.position.y, 4);
});
test("Motion rechecks occupancy after presentation and a failed follower restores the object overlay", async () => {
  const { game: g } = workshop(),
    actions = g.applications.fieldActions;
  const plan = actions.actions.prepare("fixture-field:shift-crate").plan;
  g.patchWorld([
    {
      kind: "object",
      map: room,
      id: "new",
      spawn: true,
      changes: { x: 3, y: 2, actor: "Boy1" },
    },
  ]);
  assert.equal((await actions.actions.commit(plan)).ok, false);
  assert.equal(g.field.npcs.objects(room).find((o) => o.id === "crate").y, 3);
  g.patchWorld([{ kind: "object", map: room, id: "new", hidden: true }]);
  const operation = {
    kind: "displace",
    object: "crate",
    direction: "up",
    follow: true,
    mode: "walk",
    scope: "visit",
    duration: 320,
  };
  const prepared = actions.objectOperations.prepare(operation),
    before = structuredClone(g.state.worldState);
  // Inject one unavailable follower port, leaving actual planning/overlay ownership intact.
  const move = g.field.move;
  g.field.move = () => false;
  assert.throws(
    () => actions.objectOperations.commit(prepared),
    /follower plan changed/,
  );
  g.field.move = move;
  assert.deepEqual(g.state.worldState, before);
  assert.equal(g.field.npcs.objects(room).find((o) => o.id === "crate").y, 3);
  assert.equal(g.state.position.y, 4);
});
test("Displacement respects both-end reservations and can move independently without moving the player", () => {
  const { game: g } = workshop(),
    operation = {
      kind: "displace",
      object: "crate",
      direction: "up",
      follow: false,
      mode: "walk",
      scope: "permanent",
      duration: 320,
    };
  const context = {
    maps: g.world.maps,
    position: g.state.position,
    objects: g.field.npcs.occupants(room),
    elevation: g.world.elevation,
    objectPassage: (mode, c) => g.movement.traversal(mode, c),
    playerPassage: (c) => g.field.traversal("walk", c),
  };
  assert.throws(
    () =>
      planObjectMotion(operation, {
        ...context,
        objects: [
          ...context.objects,
          {
            id: "moving-npc",
            x: 4,
            y: 2,
            elevation: 0,
            reserved: [
              { x: 3, y: 2 },
              { x: 4, y: 2 },
            ],
          },
        ],
      }),
    /blocked/,
  );
  const before = { ...g.state.position },
    owner = g.applications.fieldActions.objectOperations;
  const result = owner.commit(owner.prepare(operation));
  assert.equal(result.ok, true);
  assert.equal(g.field.npcs.objects(room).find((o) => o.id === "crate").y, 2);
  assert.deepEqual(g.state.position, before);
  assert.equal(g.state.worldState.maps[room].objects.crate.changes.y, 2);
});
test("Object and follower interpolation share one duration and settle before field action unlock", async () => {
  const { game: g } = workshop(),
    wait = g.timeline.wait,
    director = g.actionDirector;
  let observed = false;
  g.timeline.wait = async (ms) => {
    if (director.active?.motion) {
      observed = true;
      assert(g.actionBusy);
      const start = g.timeline.now(),
        mid = director.sample(start + ms / 2),
        end = director.sample(start + ms);
      assert.equal(mid.objects[0].y, 8);
      assert.equal(end.objects[0].y, 0);
      const a = g.motion.sample(g.state.position, start),
        b = g.motion.sample(g.state.position, start + ms / 2),
        c = g.motion.sample(g.state.position, start + ms);
      assert.equal(a.y - b.y, 8);
      assert.equal(b.y - c.y, 8);
    }
    await wait(ms);
  };
  assert.equal(
    (await g.performFieldAction("fixture-field:shift-crate")).ok,
    true,
  );
  assert(observed);
  assert.equal(director.sample(), null);
  assert.equal(g.actionBusy, false);
});
test("Registered interaction priority selects a qualified action consistently and saved effect references declare their plugin dependency", async () => {
  const plugin = manifest("priority-demo", (api) => {
    const effect = api.content.register("fieldEffects", "ready", {
      scope: "visit",
      schema: objectSchema(),
    });
    for (const [id, priority] of [
      ["late", 10],
      ["first", -1],
    ])
      api.content.register("fieldActions", id, {
        name: id,
        cue: "field-cut",
        duration: 0,
        triggers: ["interact"],
        priority,
        allowed: () => true,
        target: (c) => c.position,
        plan: () => ({ kind: "effect", id: effect, data: {} }),
      });
  });
  const { game: g, host } = session([plugin]);
  assert.equal(
    g.applications.fieldActions.interaction("interact").id,
    "priority-demo:first",
  );
  assert.equal((await g.performFieldAction("priority-demo:first")).ok, true);
  assert(host.catalog.dependencies(g.state).includes("priority-demo"));
  const without = session();
  assert.equal(
    validateSave(g.state, without.db, without.catalog, without.host),
    false,
  );
});
test("A terrain interaction is routed into the same action API; item ownership gates the same effect lifecycle", async () => {
  const { game: g, bus } = workshop(),
    selected = [];
  g.ui.showFieldAction = (id) => selected.push(id);
  assert(g.enter({ map: room, x: 1, y: 3, dir: "up" }));
  g.interact();
  assert.deepEqual(selected, ["fixture-field:clear-tile"]);
  assert.equal(
    (await bus.execute("core.field.action", { id: selected[0] })).ok,
    true,
  );
  assert.equal(g.world.map.behavior[17], 0);
  const item = "fixture-field:lamp";
  assert.equal(
    (await bus.execute("core.item.action", { item, action: "light" })).ok,
    false,
  );
  setQuantity(g.state.bag, item, 1);
  assert.equal(
    (await bus.execute("core.item.action", { item, action: "light" })).ok,
    true,
  );
  assert.equal(inventoryQuantity(g.state.bag, item), 1);
  assert.equal(g.fieldEffectView().records[item].presentation.radius, 80);
  g.loadDocument(g.exportDocument());
  assert.equal(g.fieldEffectView().records[item].presentation.radius, 80);
});
test("Flash uses its badge and registered darkness; strict saves reject removed effects and missing current-format state", async () => {
  const { game: g, bus, mon, db, host, catalog } = workshop();
  mon.moves = [{ id: "flash", pp: 20, maxPP: 20 }];
  assert.equal(
    (await bus.execute("core.field.action", { id: "flash" })).ok,
    false,
  );
  g.state.flags.badgeKnuckle = true;
  assert.equal(
    (await bus.execute("core.field.action", { id: "flash" })).ok,
    true,
  );
  const state = structuredClone(g.state);
  assert(validateSave(state, db, catalog, host));
  delete state.fieldEffects;
  assert.equal(validateSave(state, db, catalog, host), false);
  g.loadDocument(g.exportDocument());
  assert.equal(g.fieldEffectView().records.flash.presentation.radius, 72);
  assert(g.enter({ map: "LittlerootTown", x: 10, y: 10, dir: "up" }));
  assert.deepEqual(g.fieldEffectView().records, {});
  assert.equal(
    (await bus.execute("core.field.action", { id: "flash" })).ok,
    false,
  );
});
test("Automatic interaction schemas and priorities validate at registration; pure effect callbacks cannot dispatch writes", async () => {
  const definition = {
    name: "test",
    cue: "field-cut",
    duration: 0,
    allowed: () => true,
    target: (c) => c.position,
    plan: () => ({ kind: "effect", id: "strength", data: {} }),
  };
  assert.throws(
    () =>
      new FieldActionRegistry({ bad: { ...definition, triggers: ["touch"] } }),
  );
  assert.throws(
    () =>
      new FieldActionRegistry({
        bad: {
          ...definition,
          triggers: ["blocked"],
          schema: objectSchema({ n: { type: "integer" } }, ["n"]),
        },
      }),
  );
  const requests = [];
  const plugin = manifest(
    "pure-field",
    (api) => {
      const effect = api.content.register("fieldEffects", "state", {
        scope: "visit",
        schema: objectSchema(),
        presentation: () => {
          const request = api.commands.dispatch("core.field.move", {
            direction: "up",
          });
          request.catch(() => {});
          requests.push(request);
          return null;
        },
      });
      api.content.register("fieldActions", "set", {
        ...definition,
        plan: () => ({ kind: "effect", id: effect, data: {} }),
      });
    },
    ["movement"],
  );
  const s = session([plugin]);
  await s.game.performFieldAction("pure-field:set");
  const p = { ...s.game.state.position };
  s.game.fieldEffectView();
  for (const request of requests)
    await assert.rejects(request, /read-only callback/);
  assert.deepEqual(s.game.state.position, p);
});
test("Lighting metadata validates; pure sampling expands smoothly and reduced motion does not change rule state", () => {
  const db = structuredClone(base);
  db.maps.Route101.darkness = { radius: 24, illuminatedRadius: 72 };
  assert.deepEqual(validateContent(db), []);
  db.maps.Route101.darkness.radius = -1;
  assert(validateContent(db).some((e) => e.includes("darkness")));
  const director = new LightingDirector({ duration: 480 }),
    darkness = { radius: 24, illuminatedRadius: 72 },
    effects = [{ kind: "light-radius", radius: 72 }];
  assert.equal(director.sample("cave", 0, darkness).radius, 24);
  assert.equal(director.sample("cave", 100, darkness, effects).radius, 24);
  assert.equal(director.sample("cave", 340, darkness, effects).radius, 48);
  assert.equal(director.sample("cave", 580, darkness, effects).radius, 72);
  assert.equal(
    director.sample("cave", 590, darkness, [], { reducedMotion: true }).radius,
    24,
  );
  assert.equal(director.sample("town", 600, null), null);
  assert.equal(director.sample("next", 610, darkness, effects).radius, 72);
});
test("Lighting masks preserve world pixels inside the union of lights and draw only outside rows", () => {
  const lights = [
    { x: 2, y: 2, radius: 1 },
    { x: 4, y: 2, radius: 1 },
  ];
  const rectangles = lightMask(7, 5, lights);
  const masked = (x, y) =>
    rectangles.some((r) => r.y === y && r.x <= x && x < r.x + r.width);
  assert.equal(masked(2, 2), false);
  assert.equal(masked(3, 2), false);
  assert.equal(masked(4, 2), false);
  assert.equal(masked(0, 2), true);
  assert.equal(masked(2, 0), true);
  const drawn = [],
    ctx = {
      globalAlpha: 1,
      save() {},
      restore() {},
      fillRect(...args) {
        drawn.push(args);
      },
    };
  drawLighting(ctx, { width: 7, height: 5, lights, opacity: 0.8 });
  assert.equal(drawn.length, rectangles.length);
  assert.equal(ctx.globalAlpha, 0.8);
});
