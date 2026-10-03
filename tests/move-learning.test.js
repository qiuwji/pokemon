import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
  setQuantity,
} from "./helpers/inventory-fixture.js";
import { BreedingService } from "../dist/engine/growth/breeding.js";
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { MoveLearningService } from "../dist/engine/growth/move-learning.js";
import { createMonster, Random } from "../dist/engine/model.js";
import { learnPendingMove } from "../dist/engine/party.js";
import { emeraldDatabase } from "../dist/packs/emerald/database.js";
import { EMERALD_LEARNING_METHODS } from "../dist/packs/emerald/machine-learning.js";
import {
  MACHINES,
  MACHINE_LEARNSETS,
  MACHINE_SOURCE,
} from "../dist/engine/rules/gen3/machine-learning.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { createEmeraldCommandFacade } from "../dist/packs/emerald/command-facade.js";
import { createBagInterface } from "../dist/packs/emerald/bag-interface.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
const db = emeraldDatabase(base);
function fixture({ friendship, methods = EMERALD_LEARNING_METHODS } = {}) {
  const rng = new Random(123),
    mon = createMonster("mudkip", 5, db, rng);
  const state = {
    party: [mon],
    bag: createBag({ tm_toxic: 2, hm_surf: 1, hm_fly: 1 }),
    flags: {},
    position: { map: "Lab", x: 1, y: 1 },
  };
  const learning = new MoveLearningService({
    inventory: fixtureInventory(),
    db,
    methods,
    items: ITEMS,
    friendship,
  });
  return { state, mon, rng, learning };
}
test("Reference machine catalog preserves all 50 TMs, 8 HMs and species eligibility without guessed moves", () => {
  assert.equal(Object.keys(MACHINES).length, 58);
  assert.equal(
    MACHINE_SOURCE.revision,
    "731ad5bfd6e6f265508d0efcca0ba42f9dcf5881",
  );
  assert.equal(MACHINES.tm_focus_punch.number, 1);
  assert.equal(MACHINES.tm_overheat.number, 50);
  assert.deepEqual(
    Object.values(MACHINES)
      .filter((m) => m.kind === "hm")
      .map((m) => m.move),
    [
      "cut",
      "fly",
      "surf",
      "strength",
      "flash",
      "rock_smash",
      "waterfall",
      "dive",
    ],
  );
  assert(MACHINE_LEARNSETS.mudkip.includes("surf"));
  assert(!MACHINE_LEARNSETS.mudkip.includes("fly"));
  assert.equal(ITEMS.hm_surf.holdable, false);
  assert.equal(ITEMS.mach_bike.holdable, false);
  assert.equal(ITEMS.tm_toxic.holdable, true);
});
test("Machine teaching appends full PP, permits a fainted non-egg, changes friendship once and consumes only a successful TM", () => {
  const s = fixture({ friendship: ({ mon }) => mon.friendship + 1 });
  s.mon.hp = 0;
  const before = s.mon.friendship,
    seed = s.rng.seed;
  const result = s.learning.use(s.state, "tm_toxic", s.mon.uid);
  assert(result.ok);
  assert.deepEqual(s.mon.moves.at(-1), { id: "toxic", pp: db.moves.toxic.pp });
  assert.equal(s.mon.friendship, before + 1);
  assert.equal(inventoryQuantity(s.state.bag, "tm_toxic"), 1);
  assert.equal(s.rng.seed, seed);
  const saved = structuredClone(s.state);
  assert.equal(s.learning.use(s.state, "tm_toxic", s.mon.uid).ok, false);
  assert.deepEqual(s.state, saved);
});
test("HM ownership is required but success retains the machine; incompatible species and eggs leave everything unchanged", () => {
  const s = fixture();
  assert(s.learning.use(s.state, "hm_surf", s.mon.uid).ok);
  assert.equal(inventoryQuantity(s.state.bag, "hm_surf"), 1);
  for (const change of [
    () => {},
    () => {
      s.mon.egg = true;
    },
    () => {
      delete s.mon.egg;
      setQuantity(s.state.bag, "hm_fly", 0);
    },
  ]) {
    change();
    const before = structuredClone(s.state);
    assert.equal(s.learning.use(s.state, "hm_fly", s.mon.uid).ok, false);
    assert.deepEqual(s.state, before);
  }
  const absent = fixture();
  setQuantity(absent.state.bag, "hm_surf", 0);
  assert.equal(
    absent.learning.prepare(absent.state, "hm_surf", absent.mon.uid).ok,
    false,
  );
});
test("Four-slot learning requires an explicit forgettable slot; HM protection and cancellation never consume a TM", () => {
  const s = fixture();
  s.mon.moves = ["surf", "tackle", "growl", "water_gun"].map((id) => ({
    id,
    pp: 1,
  }));
  const plan = s.learning.prepare(s.state, "tm_toxic", s.mon.uid),
    before = structuredClone(s.state);
  assert(plan.requiresReplacement);
  assert.deepEqual(plan.replaceable, [1, 2, 3]);
  assert.equal(s.learning.commit(plan, { state: s.state }).ok, false);
  assert.equal(s.learning.commit(plan, { state: s.state, index: 0 }).ok, false);
  assert.deepEqual(s.state, before);
  assert(s.learning.commit(plan, { state: s.state, cancel: true }).cancelled);
  assert.deepEqual(s.state, before);
  assert(s.learning.use(s.state, "tm_toxic", s.mon.uid, 2).ok);
  assert.deepEqual(s.mon.moves[2], { id: "toxic", pp: db.moves.toxic.pp });
  assert.equal(s.mon.moves[0].id, "surf");
  assert.equal(s.mon.moves.length, 4);
});
test("Owned learning plans reject forgery, duplicate commits and changed inventory, custody, slots, qualification or loaded state", () => {
  for (const mutate of [
    (s) =>
      setQuantity(
        s.state.bag,
        "tm_toxic",
        inventoryQuantity(s.state.bag, "tm_toxic") + 1,
      ),
    (s) => (s.state.party = []),
    (s) => s.mon.moves[0].pp--,
    (s) => (s.state.flags.changed = true),
    (s) => s.state.position.x++,
  ]) {
    const s = fixture(),
      plan = s.learning.prepare(s.state, "tm_toxic", s.mon.uid);
    mutate(s);
    const before = structuredClone(s.state);
    assert.equal(s.learning.commit(plan, { state: s.state }).ok, false);
    assert.deepEqual(s.state, before);
  }
  const s = fixture(),
    plan = s.learning.prepare(s.state, "tm_toxic", s.mon.uid);
  assert.throws(() => {
    plan.move = "surf";
  }, TypeError);
  assert.equal(
    s.learning.commit(structuredClone(plan), { state: s.state }).ok,
    false,
  );
  assert.equal(
    s.learning.commit(plan, { state: structuredClone(s.state) }).ok,
    false,
  );
  const fresh = s.learning.prepare(s.state, "tm_toxic", s.mon.uid);
  assert(s.learning.commit(fresh, { state: s.state }).ok);
  assert.equal(s.learning.commit(fresh, { state: s.state }).ok, false);
  assert.equal(inventoryQuantity(s.state.bag, "tm_toxic"), 1);
});
test("Tutor methods compose immutable qualification and declared costs; malformed or asynchronous policies fail before mutation", () => {
  const tutor = {
    move: "toxic",
    consume: 0,
    species: ["mudkip"],
    eligible: (context) => context.flags.training === true,
  };
  const s = fixture({ methods: { ...EMERALD_LEARNING_METHODS, tutor } });
  tutor.move = "fly";
  s.state.flags.training = true;
  assert(s.learning.use(s.state, "tutor", s.mon.uid).ok);
  assert.equal(s.mon.moves.at(-1).id, "toxic");
  assert.equal(inventoryQuantity(s.state.bag, "tm_toxic"), 2);
  for (const eligible of [
    (context) => {
      context.mon.hp = 0;
      return true;
    },
    async () => true,
    () => 1,
  ]) {
    const q = fixture({
      methods: {
        ...EMERALD_LEARNING_METHODS,
        tutor: { move: "toxic", consume: 0, eligible },
      },
    });
    const before = structuredClone(q.state);
    assert.throws(() => q.learning.prepare(q.state, "tutor", q.mon.uid));
    assert.deepEqual(q.state, before);
  }
  assert.throws(
    () =>
      fixture({
        methods: {
          ...EMERALD_LEARNING_METHODS,
          bad: { move: "typo", consume: 0 },
        },
      }),
    /invalid definition/,
  );
  const q = fixture({
      friendship: () => {
        throw Error("Policy failed");
      },
    }),
    before = structuredClone(q.state);
  assert.throws(
    () => q.learning.prepare(q.state, "tm_toxic", q.mon.uid),
    /Policy failed/,
  );
  assert.deepEqual(q.state, before);
});
test("Manual pending level learning uses the same HM protection while declining learning remains available", () => {
  const s = fixture();
  s.mon.moves[0] = { id: "surf", pp: 1 };
  s.mon.pendingMoves = ["toxic"];
  assert.equal(
    learnPendingMove(s.mon, 0, db, {
      protectedMoves: s.learning.protectedMoves,
    }),
    false,
  );
  assert.deepEqual(s.mon.pendingMoves, ["toxic"]);
  assert(
    learnPendingMove(s.mon, null, db, {
      protectedMoves: s.learning.protectedMoves,
    }),
  );
  assert.equal(s.mon.moves[0].id, "surf");
});
function adventure(plugins = []) {
  const errors = [],
    { host, catalog, db } = createEmeraldPlugins(
      structuredClone(base),
      plugins,
      (error) => errors.push(error),
    );
  const timeline = new Timeline({ now: () => 0, wait: async () => {} }),
    records = {};
  const game = new EmeraldAdventure({
    db,
    catalog,
    plugins: host,
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(db.maps)),
    storage: {
      getItem: (key) => records[key] ?? null,
      setItem: (key, value) => {
        records[key] = value;
      },
    },
  });
  game.ui = { dialog: null, updateSide() {}, closeModal() {} };
  const ports = attachEmeraldExtensions(game, host);
  game.state.party.push(createMonster("mudkip", 5, db, game.rng));
  game.state.flags.rescued = true;
  game.state.flags.pokedex = true;
  setQuantity(game.state.bag, "tm_toxic", 2);
  setQuantity(game.state.bag, "hm_surf", 1);
  return { game, host, catalog, db, errors, ...ports };
}
test("Public teaching resolves stable UIDs after party reorder, rejects boxed/busy callers and saves learned slots plus item counts", () => {
  const s = adventure(),
    mon = s.game.state.party[0];
  s.game.state.party.unshift(createMonster("treecko", 5, s.db, s.game.rng));
  const before = mon.friendship;
  assert(
    s.bus.executeSync(
      "core.learning.teach",
      { method: "tm_toxic", uid: mon.uid },
      "ui",
    ).ok,
  );
  assert.equal(mon.friendship, before + 1);
  assert.equal(inventoryQuantity(s.game.state.bag, "tm_toxic"), 1);
  assert.equal(
    s.bus.executeSync(
      "core.learning.teach",
      { method: "hm_surf", uid: "missing" },
      "ui",
    ).ok,
    false,
  );
  assert.throws(() =>
    s.bus.executeSync(
      "core.learning.teach",
      { method: "hm_surf", uid: mon.uid, index: 4 },
      "ui",
    ),
  );
  s.game.storyBusy = true;
  assert.throws(
    () =>
      s.bus.executeSync(
        "core.learning.teach",
        { method: "hm_surf", uid: mon.uid },
        "ui",
      ),
    /busy|available/i,
  );
  s.game.storyBusy = false;
  const save = s.game.exportDocument();
  s.game.loadDocument(save);
  assert.equal(
    s.game.state.party.find((m) => m.uid === mon.uid).moves.at(-1).id,
    "toxic",
  );
  assert.equal(inventoryQuantity(s.game.state.bag, "tm_toxic"), 1);
  assert.equal(s.game.canBuyItem("hm_surf"), false);
  assert.equal(s.game.buyItem("tm_toxic"), false);
  assert.equal(s.game.buyItem("mach_bike"), false);
});
test("A plugin registers a tutor and an item-backed teaching method without modifying the page; permissions and policy read isolation apply", async () => {
  let apiRef, denied;
  const plugin = {
    id: "teacher",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["learnMove"],
    setup(api) {
      apiRef = api;
      const method = api.content.register("learningMethods", "lesson", {
        move: "surf",
        item: "teacher:disc",
        consume: 1,
        eligible: ({ flags }) => flags.training === true,
      });
      api.content.register("items", "disc", {
        name: "Lesson",
        price: 1,
        holdable: false,
        contexts: ["field"],
        target: "party",
        effects: [],
        learningMethod: method,
      });
      api.content.register("learningMethods", "bad", {
        move: "toxic",
        consume: 0,
        eligible: () => {
          api.commands.dispatch("teacher:stamp").catch((error) => {
            denied = error;
          });
          return false;
        },
      });
      api.actions.register("teach", {
        schema: {
          type: "object",
          properties: { uid: { type: "string" } },
          required: ["uid"],
          additionalProperties: false,
        },
        run: (ctx, { uid }) => ctx.intent({ kind: "learnMove", method, uid }),
      });
      api.actions.register("stamp", {
        schema: { type: "object", properties: {}, additionalProperties: false },
        run: (ctx) => ctx.store.set("illegal", 1),
      });
    },
  };
  const s = adventure([plugin]),
    mon = s.game.state.party[0];
  setQuantity(s.game.state.bag, "teacher:disc", 1);
  await assert.rejects(
    s.bus.execute("teacher:teach", { uid: mon.uid }),
    /学习条件/,
  );
  s.game.state.flags.training = true;
  assert((await s.bus.execute("teacher:teach", { uid: mon.uid })).ok);
  assert.equal(inventoryQuantity(s.game.state.bag, "teacher:disc"), 0);
  assert.equal(s.game.learningView("teacher:bad", mon.uid).ok, false);
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(denied.message, /read.only/i);
  assert.equal(apiRef.store.get("illegal"), null);
  assert.throws(() =>
    s.bus.executeSync(
      "core.learning.teach",
      { method: "tm_toxic", uid: mon.uid },
      "plugin:unregistered",
    ),
  );
});
test("Backpack learning uses the selected UID, presents HM-disabled replacement and commits through the UI command proxy", () => {
  const s = adventure(),
    mon = s.game.state.party[0];
  mon.moves = ["surf", "tackle", "growl", "water_gun"].map((id) => ({
    id,
    pp: 1,
  }));
  let html = "",
    options,
    buttons = [],
    lastToast;
  const root = {
    querySelectorAll: (selector) =>
      buttons.filter((b) =>
        Object.hasOwn(b.dataset, selector.match(/data-([\w-]+)/)[1]),
      ),
    querySelector: (selector) => root.querySelectorAll(selector)[0] ?? null,
  };
  const modal = (_title, text, opts) => {
    html = text;
    options = opts;
    buttons = [
      ...text.matchAll(/<button[^>]*data-([\w-]+)(?:="([^"]*)")?[^>]*>/g),
    ].map((m) => ({
      dataset: { [m[1]]: m[2] ?? "" },
      disabled: m[0].includes("disabled"),
    }));
  };
  const ui = createBagInterface(createEmeraldCommandFacade(s.game, s.bus), {
    modal,
    root,
    closeModal() {},
    showMenu() {},
    partyCard: (_mon, index) => `<button data-mon="${index}">Partner</button>`,
    toast: (text) => (lastToast = text),
    updateSide() {},
    sound() {},
    escapeHTML: (text) =>
      String(text)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll('"', "&quot;"),
  });
  ui.showBag();
  root
    .querySelectorAll("[data-item]")
    .find((b) => b.dataset.item === "tm_toxic")
    .onclick();
  root.querySelector("[data-mon]").onclick();
  assert.equal(options.type, "machine-learning");
  assert(html.includes("秘传招式"));
  assert(root.querySelectorAll("[data-replace]")[0].disabled);
  const before = structuredClone(s.game.state);
  options.back();
  assert.deepEqual(s.game.state, before);
  ui.chooseLearningMove("tm_toxic", mon.uid);
  root.querySelectorAll("[data-replace]")[1].onclick();
  assert.equal(mon.moves[1].id, "toxic");
  assert.equal(inventoryQuantity(s.game.state.bag, "tm_toxic"), 1);
  assert(lastToast.includes("学会"));
});

test("A failed later plugin intent restores learned moves, consumed machine, friendship and plugin memory as one transaction", async () => {
  const plugin = {
    id: "teacher",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["learnMove"],
    setup(api) {
      api.actions.register("failed", {
        schema: {
          type: "object",
          properties: { uid: { type: "string" } },
          required: ["uid"],
          additionalProperties: false,
        },
        run(ctx, { uid }) {
          ctx.store.set("learned", true);
          ctx.intent({ kind: "learnMove", method: "tm_toxic", uid });
          ctx.intent({
            kind: "learnMove",
            method: "hm_surf",
            uid: "not-in-party",
          });
        },
      });
    },
  };
  const s = adventure([plugin]),
    mon = s.game.state.party[0],
    before = structuredClone(s.game.state);
  const results = [],
    party = s.game.applications.party,
    original = party.teachMove.bind(party);
  party.teachMove = (...args) => {
    const result = original(...args);
    results.push(result.ok);
    return result;
  };
  await assert.rejects(
    s.bus.execute("teacher:failed", { uid: mon.uid }),
    /学习/,
  );
  assert.deepEqual(results, [true, false]);
  assert.deepEqual(s.game.state, before);
  assert.equal(s.game.state.party[0], mon);
  assert.equal(inventoryQuantity(s.game.state.bag, "tm_toxic"), 2);
});

test("New-visit device activation uses the same plugin read isolation as other mechanism phases", async () => {
  let denied;
  const plugin = {
    id: "activation",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      api.actions.register("stamp", {
        schema: { type: "object", properties: {}, additionalProperties: false },
        run: (ctx) => ctx.store.set("illegal", true),
      });
      const mechanism = api.content.register("fieldMechanisms", "guard", {
        scope: "visit",
        activate: () => {
          api.commands.dispatch("activation:stamp").catch((error) => {
            denied = error;
          });
          return {};
        },
      });
      api.content.register("fieldDevices", "guard", {
        map: "LittlerootTown",
        x: 10,
        y: 10,
        mechanism,
      });
    },
  };
  const s = adventure([plugin]);
  assert(s.game.enter({ map: "LittlerootTown", x: 10, y: 10, dir: "down" }));
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(denied.message, /read.only/);
  assert.equal(s.game.state.extensions.activation.data.illegal, undefined);
});

test("New plugin species can declare machine compatibility; invalid references fail during content compilation", () => {
  let definition = {
    ...structuredClone(base.species.mudkip),
    machineMoves: ["surf"],
    name: "Plugin creature",
  };
  const plugin = {
    id: "species-lesson",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      api.content.register("species", "friend", definition);
    },
  };
  const s = adventure([plugin]),
    mon = createMonster("species-lesson:friend", 5, s.db, s.game.rng);
  s.game.state.party.push(mon);
  assert(s.game.teachMove("hm_surf", mon.uid).ok);
  assert.equal(s.game.teachMove("tm_toxic", mon.uid).ok, false);
  definition = { ...definition, machineMoves: ["misspelled"] };
  assert.throws(() => adventure([plugin]), /machineMoves/);
});
test("Full reference machine compatibility also feeds existing Gen3 paternal TM/HM inheritance", () => {
  const rng = new Random(45),
    father = createMonster("mudkip", 10, db, rng),
    mother = createMonster("mudkip", 10, db, rng);
  father.gender = "♂";
  mother.gender = "♀";
  father.moves = [
    { id: "surf", pp: db.moves.surf.pp },
    { id: "toxic", pp: db.moves.toxic.pp },
  ];
  const egg = new BreedingService({ db, rng }).create(father, mother);
  assert(egg.moves.some((slot) => slot.id === "surf"));
  assert(egg.moves.some((slot) => slot.id === "toxic"));
});
