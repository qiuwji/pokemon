import test from "node:test";
import assert from "node:assert/strict";
import {
  AppearanceRegistry,
  emptyAppearances,
} from "../src/engine/appearances.js";
import { drawAppearance } from "../src/presentation/appearance-canvas.js";
import { session, manifest } from "./helpers/session.js";
const definition = {
  name: "Layered",
  variants: {
    default: {
      layers: [
        { kind: "actor", actor: "ProfBirch", y: -16 },
        {
          kind: "image",
          resource: "mudkip-front",
          size: { width: 8, height: 8 },
          x: 4,
          y: -14,
        },
      ],
    },
  },
};
const wardrobe = (capture, permissions = ["appearance", "actors"]) =>
  manifest(
    "wardrobe",
    (api) => {
      capture(api);
      api.content.register("appearances", "layers", definition);
      api.content.register("actorTemplates", "model", {
        name: "model",
        appearance: { id: "wardrobe:layers" },
        behavior: "still",
      });
    },
    permissions,
  );
test("Appearance public commands persist a layered choice without changing creature, movement or random state", async () => {
  let api;
  const { game } = session([wardrobe((v) => (api = v))]);
  const before = structuredClone({
    party: game.state.party,
    movement: game.state.movement,
    position: game.state.position,
    rng: game.state.rng,
  });
  assert(
    (
      await api.commands.dispatch("core.appearance.set", {
        target: { kind: "player" },
        appearance: "wardrobe:layers",
      })
    ).ok,
  );
  const f = await api.commands.dispatch("core.appearance.preview", {
    appearance: "wardrobe:layers",
  });
  assert.equal(f.layers.length, 2);
  assert(Object.isFrozen(f.layers));
  assert.deepEqual(
    {
      party: game.state.party,
      movement: game.state.movement,
      position: game.state.position,
      rng: game.state.rng,
    },
    before,
  );
  const saved = game.exportDocument();
  game.loadDocument(saved);
  assert.equal(
    game.appearanceFrame({ kind: "player" }, {}).appearance,
    "wardrobe:layers",
  );
  assert(saved.state.contentDependencies.includes("wardrobe"));
  assert.equal(
    await api.commands.dispatch("core.appearance.clear", {
      target: { kind: "player" },
    }),
    true,
  );
  assert.equal(
    game.appearanceFrame({ kind: "player" }, {}).appearance,
    "emerald-player",
  );
});
test("Appearance-only Actor template shares persistent identity and removals clear its selection", async () => {
  let api;
  const { game } = session([wardrobe((v) => (api = v))]);
  const { actor } = await api.commands.dispatch("core.actor.spawn", {
    template: "wardrobe:model",
    position: { map: "Route101", x: 5, y: 10, dir: "down" },
  });
  const target = { kind: "actor", uid: actor.uid };
  assert.equal(game.appearanceFrame(target, {}).appearance, "wardrobe:layers");
  await api.commands.dispatch("core.appearance.set", {
    target,
    appearance: "emerald-species",
    data: JSON.stringify({ species: "mudkip" }),
  });
  assert.equal(game.appearanceFrame(target, {}).variant, "mudkip");
  const snapshot = structuredClone(game.state.actors.records[actor.uid]);
  await api.commands.dispatch("core.appearance.override", {
    target,
    appearance: "wardrobe:layers",
    scope: "session",
  });
  assert.deepEqual(game.state.actors.records[actor.uid], snapshot);
  await api.commands.dispatch("core.actor.remove", { uid: actor.uid });
  assert.deepEqual(api.query().appearances.records, {});
  assert.equal(api.query().appearances.overrides.length, 0);
});
test("Appearance leases prioritize, reject ties, release to saved choice and expire on map entry/load", async () => {
  let api;
  const { game } = session([wardrobe((v) => (api = v))]);
  const target = { kind: "player" };
  await api.commands.dispatch("core.appearance.set", {
    target,
    appearance: "wardrobe:layers",
  });
  const a = await api.commands.dispatch("core.appearance.override", {
    target,
    appearance: "emerald-player",
    priority: 1,
    scope: "visit",
  });
  await assert.rejects(
    api.commands.dispatch("core.appearance.override", {
      target,
      appearance: "wardrobe:layers",
      priority: 1,
    }),
    /Ambiguous/,
  );
  const b = await api.commands.dispatch("core.appearance.override", {
    target,
    appearance: "wardrobe:layers",
    priority: 2,
    scope: "session",
  });
  assert.equal(game.appearanceFrame(target, {}).appearance, "wardrobe:layers");
  await api.commands.dispatch("core.appearance.release", { token: b.token });
  assert.equal(game.appearanceFrame(target, {}).appearance, "emerald-player");
  game.enter({ map: "Route101", x: 5, y: 11, dir: "up" });
  assert.equal(api.query().appearances.overrides.length, 0);
  assert.equal(game.appearanceFrame(target, {}).appearance, "wardrobe:layers");
  const c = await api.commands.dispatch("core.appearance.override", {
    target,
    appearance: "emerald-player",
    priority: 3,
    scope: "session",
  });
  const saved = game.exportDocument();
  game.loadDocument(saved);
  assert.equal(api.query().appearances.overrides.length, 0);
  const d = await api.commands.dispatch("core.appearance.override", {
    target,
    appearance: "emerald-player",
    priority: 3,
  });
  assert.notEqual(c.token, d.token);
  assert.notEqual(a.token, d.token);
});
test("Appearance recipes reject invalid references, parameters, identities and asynchronous selectors before selection writes", async () => {
  for (const mutate of [
    (d) => (d.variants.default.layers[0].actor = "Missing"),
    (d) => (d.variants.default.layers[1].size.width = 0),
    (d) => (d.variants.default.layers[0].random = true),
  ]) {
    const d = structuredClone(definition);
    mutate(d);
    assert.throws(
      () =>
        session([
          manifest("bad", (api) =>
            api.content.register("appearances", "bad", d),
          ),
        ]),
      /appearance/,
    );
  }
  let api;
  const { game } = session([wardrobe((v) => (api = v))]);
  const before = structuredClone(game.state.appearances);
  await assert.rejects(
    api.commands.dispatch("core.appearance.set", {
      target: { kind: "player", uid: "extra" },
      appearance: "wardrobe:layers",
    }),
    /target/,
  );
  await assert.rejects(
    api.commands.dispatch("core.appearance.set", {
      target: { kind: "player" },
      appearance: "emerald-species",
      data: '{"species":"missing"}',
    }),
  );
  assert.deepEqual(game.state.appearances, before);
  assert.throws(
    () =>
      session([
        manifest("bad", (api) =>
          api.content.register("actorTemplates", "bad", {
            name: "bad",
            actor: "Missing",
            appearance: { id: "emerald-player" },
            behavior: "still",
          }),
        ),
      ]),
    /template/,
  );
  const registry = new AppearanceRegistry(
    {
      bad: {
        name: "bad",
        variants: {
          default: {
            layers: [
              { kind: "image", resource: "x", size: { width: 1, height: 1 } },
            ],
          },
        },
        select: async () => "default",
      },
    },
    { resources: { x: "x" } },
  );
  assert.throws(
    () => registry.resolve(registry.selection("bad")),
    /synchronous/,
  );
});
test("Appearance selectors are pure and permissions reject unauthorized writes", async () => {
  let api, denied;
  const { game } = session([
    manifest(
      "pure",
      (v) => {
        api = v;
        v.content.register("appearances", "bad", {
          ...definition,
          select: () => {
            denied = v.commands
              .dispatch("core.appearance.clear", { target: { kind: "player" } })
              .then(
                () => null,
                (error) => error,
              );
            return "default";
          },
        });
      },
      ["appearance"],
    ),
  ]);
  await api.commands.dispatch("core.appearance.preview", {
    appearance: "pure:bad",
  });
  assert.match((await denied).message, /read-only callback/);
  assert.deepEqual(game.state.appearances, emptyAppearances());
  let no;
  session([wardrobe((v) => (no = v), [])]);
  await assert.rejects(
    no.commands.dispatch("core.appearance.set", {
      target: { kind: "player" },
      appearance: "wardrobe:layers",
    }),
    /permission/,
  );
});
test("Layer drawing shares direction/pose clock, deterministic offsets, reduced motion and balanced cleanup", () => {
  const seen = [];
  let depth = 0;
  const ctx = {
    globalAlpha: 1,
    save() {
      depth++;
    },
    restore() {
      depth--;
    },
    drawImage(...a) {
      seen.push(a);
    },
  };
  const renderer = {
    ctx,
    assets: { hat: { width: 32, height: 32 } },
    actor(...a) {
      seen.push(a);
    },
  };
  const frame = {
    layers: [
      { kind: "actor", actor: "body" },
      { kind: "actor", actor: "shirt" },
      {
        kind: "image",
        resource: "hat",
        size: { width: 8, height: 8 },
        bob: { amplitude: 2, periodMs: 400 },
      },
    ],
  };
  const p = {
    dir: "left",
    progress: 0.5,
    foot: 1,
    moving: true,
    pose: "walk",
    timeMs: 100,
  };
  drawAppearance(renderer, frame, p, 10, 20);
  assert.deepEqual(seen[0].slice(3), seen[1].slice(3));
  assert.equal(seen[2][2], 22);
  assert.equal(depth, 0);
  seen.length = 0;
  drawAppearance(renderer, frame, p, 10, 20, { reducedMotion: true });
  assert.equal(seen[2][2], 20);
  assert.throws(
    () =>
      drawAppearance(
        renderer,
        {
          layers: [
            {
              kind: "image",
              resource: "missing",
              size: { width: 1, height: 1 },
            },
          ],
        },
        p,
        0,
        0,
      ),
    /Missing/,
  );
  assert.equal(depth, 0);
});
test("Saved choices validate current schemas, missing Actor identities and referenced resource dependencies", async () => {
  let api;
  const { game } = session([wardrobe((v) => (api = v))]);
  await api.commands.dispatch("core.appearance.set", {
    target: { kind: "player" },
    appearance: "wardrobe:layers",
  });
  const doc = game.exportDocument();
  const before = JSON.stringify(game.state);
  const corrupt = structuredClone(doc);
  delete corrupt.state.appearances;
  assert.throws(() => game.loadDocument(corrupt), /Invalid save/);
  assert.equal(JSON.stringify(game.state), before);
  const alien = structuredClone(doc);
  const key = Object.keys(alien.state.appearances.records)[0];
  alien.state.appearances.records[key].data = { bad: true };
  assert.throws(() => game.loadDocument(alien));
  assert.equal(JSON.stringify(game.state), before);
});

test("Scene object selectors accept stable native IDs and restore dormant choices without modifying object state", async () => {
  let api;
  const { game } = session([wardrobe((v) => (api = v))]);
  const object = game
      .baseWorldObjects("LittlerootTown")
      .find((n) => n.kind === "talk" && n.id.startsWith("core:npc."));
  assert(object, "The pack must expose a stable native NPC identity");
  const target = { kind: "object", map: "LittlerootTown", id: object.id };
  const before = structuredClone(game.worldState.record("LittlerootTown"));
  assert(
    (
      await api.commands.dispatch("core.appearance.set", {
        target,
        appearance: "wardrobe:layers",
      })
    ).ok,
  );
  assert.equal(
    game.appearanceFrame(target, { actor: object.actor }).appearance,
    "wardrobe:layers",
  );
  assert.deepEqual(game.worldState.record("LittlerootTown"), before);
  game.loadDocument(game.exportDocument());
  assert.equal(
    game.appearanceFrame(target, { actor: object.actor }).appearance,
    "wardrobe:layers",
  );
});

test("Saved appearance dependencies include the resource owner even when another plugin declares the recipe", async () => {
  let api;
  const resource = manifest("cloth", (a) =>
    a.content.register("resources", "sheet", "assets/mudkip-front.png"),
  );
  const outfit = manifest(
    "tailor",
    (a) => {
      api = a;
      a.content.register("appearances", "coat", {
        name: "coat",
        variants: {
          default: {
            layers: [
              {
                kind: "image",
                resource: "cloth:sheet",
                size: { width: 16, height: 16 },
              },
            ],
          },
        },
      });
    },
    ["appearance"],
  );
  const { game } = session([resource, outfit]);
  await api.commands.dispatch("core.appearance.set", {
    target: { kind: "player" },
    appearance: "tailor:coat",
  });
  const doc = game.exportDocument();
  assert(doc.state.contentDependencies.includes("tailor"));
  assert(doc.state.contentDependencies.includes("cloth"));
  const other = session();
  other.game.loadDocument(doc);
  assert.equal(Object.keys(other.game.state.appearances.records).length, 0);
  assert(other.game.state.suspendedContent.records.some(r => r.payload.path?.[0] === "appearances"));
  assert.equal(other.game.state.money, doc.state.money);
});
