import { isGrass } from "../src/engine/extensions/terrain-utils.js";
import test from "node:test";
import assert from "node:assert/strict";
import { EncounterPolicyRegistry } from "../src/engine/encounter-policies.js";
import { FieldContacts } from "../src/engine/field-contacts.js";
import { GEN3_ELEVATION } from "../src/engine/rules/gen3/elevation.js";

import { validateSave } from "../src/packs/emerald/save-contract.js";
import { objectSchema } from "../src/engine/extensions/values.js";
import { encounterFixture } from "./helpers/encounter-extension-fixture.js";

test("Channel policies select one eligible priority and explicit suppression never falls through", () => {
  const seen = [],
    r = new EncounterPolicyRegistry({
      base: { channel: "step", decide: () => ({ area: "land" }) },
      stop: {
        channel: "step",
        priority: 5,
        when: (c) => {
          assert(Object.isFrozen(c.position));
          seen.push(c);
          return true;
        },
        decide: () => null,
      },
    });
  assert.equal(r.resolve("step", { position: { map: "a" } }).decision, null);
  assert.equal(r.resolve("fishing", {}), null);
  assert.equal(seen.length, 1);
  const ambiguous = new EncounterPolicyRegistry({
    a: { channel: "step", decide: () => null },
    b: { channel: "step", decide: () => null },
  });
  assert.throws(() => ambiguous.resolve("step", {}), /Ambiguous/);
  for (const decide of [
    () => ({ area: "unknown" }),
    () => ({ area: "land", checkRate: 0 }),
    async () => null,
  ])
    assert.throws(() =>
      new EncounterPolicyRegistry({ a: { channel: "step", decide } }).resolve(
        "step",
        {},
      ),
    );
  assert.throws(
    () =>
      new EncounterPolicyRegistry({
        a: { channel: "step", decide: () => null, priority: 0.1 },
      }),
  );
  assert.throws(() =>
    new EncounterPolicyRegistry({
      a: { channel: "step", when: () => 1, decide: () => null },
    }).resolve("step", {}),
  );
});
test("Disabled native step encounters consume no random samples and remain independent of StoryRunner", async () => {
  const s = encounterFixture(),
    seed = s.game.rng.seed,
    story = structuredClone(s.game.state.story),
    attempts = [];
  s.host.events.on("core:encounter-attempt", (e) => attempts.push(e.payload));
  for (let i = 0; i < 12; i++) {
    s.game.world.steps++;
    s.game.step(s.game.world.cell(1, 2));
  }
  assert.equal(s.game.rng.seed, seed);
  assert.equal(s.game.battle, null);
  assert.deepEqual(attempts, []);
  assert.deepEqual(s.game.state.story, story);
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.policy", {
        channel: "step",
      })
    ).policy,
    "encounter-lab:control",
  );
  s.game.enter({ map: "Route101", x: 5, y: 10, dir: "down" });
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.policy", {
        channel: "step",
      })
    ).policy,
    "emerald-step",
  );
});
test("Regional queries merge registered and embedded sources without random draws; sample yields no individual custody", async () => {
  const s = encounterFixture(),
    seed = s.game.rng.seed;
  const t = await s.api.commands.dispatch("core.encounter.table", {
    area: "land",
  });
  assert.equal(t.source, "registered");
  assert.equal(t.id, "encounter-lab:field");
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.table", {
        map: "Route101",
        area: "land",
      })
    ).source,
    "map",
  );
  assert.equal(
    await s.api.commands.dispatch("core.encounter.table", { area: "water" }),
    null,
  );
  assert.throws(() => (t.entries[0].species = "mudkip"), TypeError);
  assert.equal(s.game.rng.seed, seed);
  const result = await s.api.commands.dispatch("core.encounter.sample", {
    area: "land",
  });
  assert.equal(result.sample.species, "zigzagoon");
  assert.equal(result.sample.level, 2);
  assert(!Object.hasOwn(result.sample, "uid"));
  assert.equal(s.game.encounterView().length, 0);
  assert.notEqual(s.game.rng.seed, seed);
  const end = s.game.rng.seed;
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.rng.seed, end);
  await assert.rejects(
    s.api.commands.dispatch("core.encounter.table", {
      area: "land",
      rod: "old",
    }),
    /rod/,
  );
});
test("Policy callbacks are pure and sampling permission is separate from free read-only queries", async () => {
  const s = encounterFixture({ permissions: ["actors", "movement"] });
  await s.api.commands.dispatch("core.world.cells", {
    x: 0,
    y: 0,
    width: 1,
    height: 1,
  });
  await assert.rejects(
    s.api.commands.dispatch("core.encounter.sample", { area: "land" }),
    /permission/i,
  );
  let dispatch;
  const p = encounterFixture({
    decide: () => {
      dispatch = p.api.commands.dispatch("core.encounter.sample", {
        area: "land",
      });
      dispatch.catch(() => {});
      return null;
    },
  });
  await p.api.commands.dispatch("core.encounter.policy", { channel: "step" });
  await assert.rejects(dispatch, /pure|read.only/i);
});
test("World region queries reflect overlays and true/reserved occupancy with detached snapshots and bounded regions", async () => {
  const s = encounterFixture(),
    { actor } = await s.spawn();
  const q = await s.api.commands.dispatch("core.world.cells", {
    x: 1,
    y: 2,
    width: 2,
    height: 1,
  });
  assert.equal(q.cells[0].occupants[0].id, "player");
  assert.equal(q.cells[1].occupants[0].id, actor.uid);
  s.game.patchWorld([
    {
      kind: "tile",
      map: "encounter-lab:field",
      x: 4,
      y: 3,
      block: 0xf000,
      behavior: 3,
    },
  ]);
  const change = await s.api.commands.dispatch("core.world.cells", {
    x: 4,
    y: 3,
    width: 1,
    height: 1,
  });
  assert.equal(change.cells[0].elevation, 15);
  assert.equal(change.cells[0].behavior, 3);
  assert.throws(() => q.cells[0].occupants.push({}), TypeError);
  await assert.rejects(
    s.api.commands.dispatch("core.world.cells", {
      x: 5,
      y: 4,
      width: 2,
      height: 1,
    }),
    /region/,
  );
  await assert.rejects(
    s.api.commands.dispatch("core.world.bounds", { map: "missing" }),
    /map/i,
  );
  assert.equal(
    (await s.api.commands.dispatch("core.world.bounds", {})).width,
    6,
  );
  await s.api.commands.dispatch("core.actor.update", {
    uid: actor.uid,
    hidden: true,
  });
  assert.equal(
    (
      await s.api.commands.dispatch("core.world.cells", {
        x: 2,
        y: 2,
        width: 1,
        height: 1,
      })
    ).cells[0].occupants.length,
    0,
  );
  assert.equal(q.cells[1].occupants.length, 1);
});
test("Contact edges deduplicate held and reversed requests; movement, separation and distinct planes invalidate proofs", () => {
  const tracker = new FieldContacts(GEN3_ELEVATION),
    a = { id: "player", map: "a", x: 1, y: 1, dir: "right", elevation: 3 },
    b = { id: "npc", map: "a", x: 2, y: 1, dir: "left", elevation: 3 },
    lookup = (e) => (e.id === "player" ? a : b);
  assert(tracker.claim(a, b, { kind: "bump", direction: "right" }));
  assert.equal(tracker.take(lookup).length, 1);
  assert.equal(
    tracker.claim(b, a, { kind: "request", interaction: "greet" }),
    false,
  );
  assert.equal(tracker.view(lookup).length, 1);
  b.moving = true;
  tracker.reconcile(lookup);
  assert.equal(tracker.view(lookup).length, 0);
  assert.equal(
    tracker.claim(a, b, { kind: "bump", direction: "right" }),
    false,
  );
  b.moving = false;
  b.elevation = 4;
  assert.equal(tracker.claim(a, b, { kind: "request" }), false);
  b.elevation = 3;
  assert(tracker.claim(a, b, { kind: "bump", direction: "right" }));
  b.x = 3;
  assert.equal(tracker.take(lookup).length, 0);
  assert.throws(() => tracker.claim(a, b, { kind: "touch" }), /contact/);
});
test("Real field collisions publish one stable contact after commands and accept a fresh contact after separation", async () => {
  const s = encounterFixture(),
    { actor } = await s.spawn(),
    events = [];
  s.host.events.on("core:field-contact", (e) => events.push(e.payload));
  assert.equal(
    (await s.api.commands.dispatch("core.field.move", { direction: "right" })).moved,
    false,
  );
  assert.equal(
    (await s.api.commands.dispatch("core.field.move", { direction: "right" })).moved,
    false,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].target.id, actor.uid);
  await s.walk("down");
  await s.walk("up");
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  assert.equal(events.length, 2);
  assert(events[1].sequence > events[0].sequence);
  const old = events[1].sequence;
  s.game.loadDocument(s.game.exportDocument());
  assert.deepEqual(s.api.query().contacts, []);
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  assert(events.at(-1).sequence > old);
});
test("NPC active interactions bridge into the same contact facts at frame boundary", async () => {
  const s = encounterFixture({
      behavior: () => ({
        move: false,
        pose: "still",
        interaction: { target: "player", kind: "encounter-lab:approach" },
      }),
    }),
    { actor } = await s.spawn(),
    events = [];
  s.host.events.on("core:field-contact", (e) => events.push(e.payload));
  s.game.field.npcs.objects("encounter-lab:field");
  s.game.tick(5000, ["encounter-lab:field"]);
  s.game.tick(10000, ["encounter-lab:field"]);
  assert.equal(events.length, 1);
  assert.equal(events[0].subject.id, actor.uid);
  assert.equal(events[0].target.id, "player");
  assert.equal(events[0].interaction, "encounter-lab:approach");
});
test("Prepared individuals have one saved custodian and actor dependency; duplicate or corrupt references are rejected", async () => {
  const s = encounterFixture(),
    { actor } = await s.spawn(),
    { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
      actor: actor.uid,
      area: "land",
    });
  assert.equal(ticket.species, "zigzagoon");
  assert.equal(s.game.state.party.length, 1);
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.prepare", {
        actor: actor.uid,
        area: "land",
      })
    ).ok,
    false,
  );
  const saved = s.game.exportDocument();
  assert(validateSave(saved.state, s.db, s.catalog, s.host));
  assert(saved.state.contentDependencies.includes("encounter-lab"));
  s.game.loadDocument(saved);
  assert.equal(s.api.query().encounters[0].id, ticket.id);
  for (const mutate of [
    (x) => delete x.actors.records[actor.uid],
    (x) => (x.encounters.records[ticket.id].monster.uid = x.party[0].uid),
    (x) => (x.encounters.records[ticket.id].monster.moves[0].id = "bad"),
    (x) => (x.encounters.records[ticket.id].table = "bad"),
  ]) {
    const bad = structuredClone(saved.state);
    mutate(bad);
    assert.equal(validateSave(bad, s.db, s.catalog, s.host), false);
  }
  await s.api.commands.dispatch("core.actor.remove", { uid: actor.uid });
  assert.equal(s.api.query().encounters.length, 0);
});
test("A ticket starts exactly one real wild battle on published contact; capture transfers custody and never runs a story", async () => {
  const s = encounterFixture(),
    { actor } = await s.spawn(),
    { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
      actor: actor.uid,
      area: "land",
    }),
    story = structuredClone(s.game.state.story);
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.request", {
        ticket: ticket.id,
        contact: 1,
      })
    ).ok,
    false,
  );
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  const edge = s.api.query().contacts[0];
  const start = s.api.commands.dispatch("core.encounter.request", {
    ticket: ticket.id,
    contact: edge.sequence,
  });
  await assert.rejects(
    s.api.commands.dispatch("core.encounter.request", {
      ticket: ticket.id,
      contact: edge.sequence,
    }),
    /busy/,
  );
  assert.equal((await start).ok, true);
  assert.equal(s.game.battle.enemy.species, "zigzagoon");
  assert(s.api.query().encounters[0].claimed);
  // Arrange a guaranteed capture result; run the real settlement/director/exit path.
  const uid = s.game.battle.enemy.uid;
  s.game.battle.rules.captureCheck = () => ({ caught: true, shakes: 3 });
  s.game.inventory.commit(
    s.game.inventory.prepare(s.game.state.bag, [
      { kind: "add", item: "pokeball", count: 1 },
    ]),
    s.game.state.bag,
  );
  await s.bus.execute("core.battle.action", { kind: "item", item: "pokeball" });
  assert.equal(s.game.battle, null);
  assert.equal(s.api.query().encounters.length, 0);
  assert(!s.api.query().actors[actor.uid]);
  assert.equal(s.game.state.party.filter((m) => m.uid === uid).length, 1);
  assert.deepEqual(s.game.state.story, story);
  assert.deepEqual(s.dialogs, []);
  await assert.rejects(
    s.api.commands.dispatch("core.encounter.request", {
      ticket: ticket.id,
      contact: edge.sequence,
    }),
    /Unknown encounter/,
  );
  assert(validateSave(s.game.exportDocument().state, s.db, s.catalog, s.host));
});

test("Plugin contact listeners can request battle at the stable boundary and a failed start keeps the ticket reusable", async () => {
  let requested, ticketId;
  const s = encounterFixture({
      extra: (api) =>
        api.events.on("core:field-contact", (edge) => {
          requested = api.commands.dispatch("core.encounter.request", {
            ticket: ticketId,
            contact: edge.sequence,
          });
        }),
    }),
    { actor } = await s.spawn(),
    { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
      actor: actor.uid,
      area: "land",
    });
  ticketId = ticket.id;
  const start = s.game.applications.battle.startEncounterBattle.bind(
    s.game.applications.battle,
  );
  s.game.applications.battle.startEncounterBattle = async () => false;
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  assert.equal((await requested).ok, false);
  assert.equal(s.api.query().encounters[0].claimed, false);
  s.game.applications.battle.startEncounterBattle = start;
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.request", {
        ticket: ticket.id,
        contact: s.api.query().contacts[0].sequence,
      })
    ).ok,
    true,
  );
});
test("Encounter results release once without story rewards or duplicate actors; loss shows the native whiteout pages", async () => {
  for (const result of ["win", "escaped", "loss"]) {
    const s = encounterFixture(),
      { actor } = await s.spawn(),
      { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
        actor: actor.uid,
        area: "land",
      }),
      events = [],
      story = structuredClone(s.game.state.story);
    s.host.events.on("core:encounter-resolved", (e) => events.push(e.payload));
    await s.api.commands.dispatch("core.field.move", { direction: "right" });
    await s.api.commands.dispatch("core.encounter.request", {
      ticket: ticket.id,
      contact: s.api.query().contacts[0].sequence,
    });
    // Fixture selects result; real BattleSession exit commits it once and saves fresh state.
    if (result === "loss") s.mon.hp = 0;
    s.game.battle.finish(result);
    await s.bus.execute("core.battle.action", { kind: "run" });
    assert.equal(events.length, 1);
    assert.equal(events[0].result, result);
    assert.equal(s.api.query().encounters.length, 0);
    assert(!s.api.query().actors[actor.uid]);
    assert.deepEqual(s.game.state.story, story);
    assert.equal(s.dialogs.length, result === "loss" ? 1 : 0);
    if (result === "loss") assert.deepEqual(s.dialogs[0].lines, [
      `${s.game.state.playerName}已经没有可以战斗的宝可梦了！`,
      `${s.game.state.playerName}眼前一片漆黑……`,
    ]);
    assert.equal(s.game.state.party.length, 1);
    if (result === "loss") assert.equal(s.mon.hp, s.mon.stats.hp);
  }
});
test("Reserved actor source cells are visible to queries but never count as actual contact", async () => {
  const s = encounterFixture({
      behavior: () => ({
        move: true,
        dir: "right",
        pose: "walk",
        duration: 120,
      }),
    }),
    { actor } = await s.spawn(),
    events = [];
  s.host.events.on("core:field-contact", (e) => events.push(e.payload));
  s.game.field.npcs.objects("encounter-lab:field");
  s.game.tick(5000, ["encounter-lab:field"]);
  const cells = (
    await s.api.commands.dispatch("core.world.cells", {
      x: 2,
      y: 2,
      width: 2,
      height: 1,
    })
  ).cells;
  assert(cells[0].occupants.some((o) => o.id === actor.uid && o.reserved));
  assert(cells[1].occupants.some((o) => o.id === actor.uid && !o.reserved));
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  assert.equal(events.length, 0);
});
test("Stale and different-actor contact proofs cannot consume a prepared ticket, and dead-party requests do not spend it", async () => {
  const s = encounterFixture(),
    { actor } = await s.spawn(),
    { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
      actor: actor.uid,
      area: "land",
    });
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  const contact = s.api.query().contacts[0].sequence;
  await s.walk("down");
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.request", {
        ticket: ticket.id,
        contact,
      })
    ).ok,
    false,
  );
  await s.walk("up");
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  const fresh = s.api.query().contacts[0].sequence;
  s.mon.hp = 0;
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.request", {
        ticket: ticket.id,
        contact: fresh,
      })
    ).ok,
    false,
  );
  assert(!s.api.query().encounters[0].claimed);
  s.mon.hp = s.mon.stats.hp;
  const other = await s.spawn(2, 3),
    prepared = await s.api.commands.dispatch("core.encounter.prepare", {
      actor: other.actor.uid,
      area: "land",
    });
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.request", {
        ticket: prepared.ticket.id,
        contact: fresh,
      })
    ).ok,
    false,
  );
  assert(
    await s.api.commands.dispatch("core.encounter.release", {
      ticket: prepared.ticket.id,
    }),
  );
  assert(s.api.query().actors[other.actor.uid]);
});
test("The native encounter cooldown has one owner and is reset during field rebinding", () => {
  const s = encounterFixture();
  s.game.applications.encounters.lastEncounterSteps = 100;
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.lastEncounterSteps, -5);
  assert(!Object.hasOwn(s.game.applications.triggers, "lastEncounterSteps"));
});

test("Failed individual preparation restores the random source and ticket state before any notification", async () => {
  const s = encounterFixture(),
    { actor } = await s.spawn(),
    events = [];
  s.host.events.on("core:encounter-prepared", (e) => events.push(e.payload));
  s.game.state.encounters.sequence = Number.MAX_SAFE_INTEGER;
  const seed = s.game.rng.seed,
    before = structuredClone(s.game.state.encounters);
  await assert.rejects(
    s.api.commands.dispatch("core.encounter.prepare", {
      actor: actor.uid,
      area: "land",
    }),
    /capacity/,
  );
  assert.equal(s.game.rng.seed, seed);
  assert.deepEqual(s.game.state.encounters, before);
  assert.deepEqual(events, []);
});
test("Full capture storage rejects before claiming or starting a wild battle", async () => {
  const s = encounterFixture(),
    { actor } = await s.spawn(),
    { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
      actor: actor.uid,
      area: "land",
    });
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  for (let i = 1; i < 6; i++)
    s.game.state.party.push({
      ...structuredClone(s.mon),
      uid: `fixture-party-${i}`,
    });
  for (let i = 0; i < 200; i++)
    s.game.state.box.push({
      ...structuredClone(s.mon),
      uid: `fixture-box-${i}`,
    });
  assert.equal(
    (
      await s.api.commands.dispatch("core.encounter.request", {
        ticket: ticket.id,
        contact: s.api.query().contacts[0].sequence,
      })
    ).ok,
    false,
  );
  assert.equal(s.game.battle, null);
  assert(!s.api.query().encounters[0].claimed);
});

test("Plugins choose distinct grass cells proportionally through the seeded random permission, then save the resulting source", async () => {
  const s = encounterFixture({
      permissions: ["actors", "encounters", "movement", "random"],
    }),
    region = await s.api.commands.dispatch("core.world.cells", {
      x: 0,
      y: 0,
      width: 6,
      height: 5,
    });
  const values = region.cells
    .filter(
      (c) =>
        isGrass(c.behavior) &&
        c.collision === 0 &&
        !c.warp &&
        !c.occupants.length,
    )
    .map((c) => ({ x: c.x, y: c.y }));
  const seed = s.game.rng.seed,
    count = Math.floor(values.length / 10),
    selected = await s.api.commands.dispatch("core.random.sample", {
      values: JSON.stringify(values),
      count,
    });
  assert.equal(selected.length, count);
  assert.equal(new Set(selected.map((p) => `${p.x}:${p.y}`)).size, count);
  assert.notEqual(s.game.rng.seed, seed);
  assert.equal(s.game.battle, null);
  const after = s.game.rng.seed;
  assert.throws(() => (selected[0].x = 999), TypeError);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.rng.seed, after);
  await assert.rejects(
    s.api.commands.dispatch("core.random.sample", { values: "[]", count: 1 }),
    /selection/,
  );
  assert.equal(s.game.rng.seed, after);
  assert.deepEqual(
    await s.api.commands.dispatch("core.random.sample", {
      values: JSON.stringify(values),
      count: 0,
    }),
    [],
  );
  assert.equal(s.game.rng.seed, after);
  const denied = encounterFixture();
  await assert.rejects(
    denied.api.commands.dispatch("core.random.sample", {
      values: "[1]",
      count: 1,
    }),
    /permission/,
  );
});

test("Rejected encounter custody leaves its ticket and actor reusable and does not mark it caught", async () => {
  const s = encounterFixture(), { actor } = await s.spawn();
  const { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
    actor: actor.uid, area: "land",
  });
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  await s.api.commands.dispatch("core.encounter.request", {
    ticket: ticket.id, contact: s.api.query().contacts[0].sequence,
  });
  s.game.battle.finish("caught");
  const before = structuredClone(s.game.state);
  const receive = s.game.partyStorage.receive;
  s.game.partyStorage.receive = () => false; // Includes the duplicate-UID rejection contract.
  try {
    await assert.rejects(s.bus.execute("core.battle.action", { kind: "run" }), /could not be received/);
  } finally { s.game.partyStorage.receive = receive; }
  assert.deepEqual(s.game.state, before);
  assert.equal(s.game.battle, null);
  assert.equal(s.api.query().encounters[0].claimed, false);
  assert(s.api.query().actors[actor.uid]);
  assert(validateSave(s.game.exportDocument().state, s.db, s.catalog, s.host));
});

test("A wild encounter table's creature ai flows through prepare and request into the real battle", async () => {
  const s = encounterFixture({
      strategies: (api) => ({
        wary: api.content.register("creatureStrategies", "wary", {
          version: 1,
          memory: objectSchema({}),
          score: (view) => ({
            scores: view.candidates.map((c) => ({
              candidateId: c.id,
              value: 1,
            })),
          }),
        }),
      }),
      ai: (registered) => ({
        creature: { id: registered.wary },
        information: "observed",
        choice: { mode: "best", band: 0 },
      }),
    }),
    { actor } = await s.spawn(),
    { ticket } = await s.api.commands.dispatch("core.encounter.prepare", {
      actor: actor.uid,
      area: "land",
    });
  await s.api.commands.dispatch("core.field.move", { direction: "right" });
  const edge = s.api.query().contacts[0];
  const started = await s.api.commands.dispatch("core.encounter.request", {
    ticket: ticket.id,
    contact: edge.sequence,
  });
  assert.equal(started.ok, true);
  const controller = [...s.game.battle.roster.controllers.values()].find(
    (c) => c.kind === "ai",
  );
  assert.equal(controller.ai.creature.id, "encounter-lab:wary");
  assert.equal(controller.ai.information, "observed");
  assert.deepEqual(controller.ai.choice, { mode: "best", band: 0 });
});
