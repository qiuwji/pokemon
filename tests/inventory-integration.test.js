import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { createEmeraldCommandFacade } from "../dist/packs/emerald/command-facade.js";
import { createBagInterface } from "../dist/packs/emerald/bag-interface.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { PACK } from "../dist/packs/emerald/pack.js";
import { createMonster } from "../dist/engine/model.js";
import { Battle } from "../dist/engine/battle.js";
import { BattleRoster, teamRoster } from "../dist/engine/battle/roster.js";
import { createTrainerEncounter } from "../dist/engine/trainer-encounters.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
function session(plugins = [], records = new Map()) {
  let now = 0;
  const compiled = createEmeraldPlugins(structuredClone(base), plugins);
  const timeline = new Timeline({
    now: () => now,
    wait: async (ms) => {
      now += ms;
    },
  });
  const game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(compiled.db.maps)),
    storage: {
      getItem: (id) => records.get(id) || null,
      setItem: (id, value) => records.set(id, value),
    },
    wallNow: () => 100000,
  });
  game.attachUI({
    blocked: false,
    dialog: null,
    updateSide() {},
    updateTime() {},
    updateWeather() {},
    closeModal() {},
    resetBattleMenu() {},
    drawBattleHUD() {},
    announce() {},
    checkGrowth() {},
    toast() {},
    say: async () => {},
    extensions: { refresh() {}, mountSlot() {} },
  });
  const ports = attachEmeraldExtensions(game, compiled.host);
  return { ...compiled, ...ports, game, records };
}
const add = (item, count) => ({ kind: "add", item, count });
const remove = (item, count) => ({ kind: "remove", item, count });
function partner(g) {
  const mon = createMonster("mudkip", 10, g.db, g.rng);
  g.state.party.push(mon);
  g.seen(mon.species, true);
  return mon;
}
function fullNormal(g) {
  g.state.bag = g.inventory.create({ potion: 30 * 99 });
}

test("Inventory current save persists only slots, keeps fragments across reload, rejects old counts and preserves live query ports", () => {
  const s = session(),
    g = s.game;
  assert.equal(PACK.version, 14);
  assert.deepEqual(g.state.bag, { pockets: {} });
  partner(g);
  assert(g.inventory.apply(g.state.bag, [add("potion", 150)]).ok);
  assert(
    g.inventory.apply(g.state.bag, [
      {
        ...remove("potion", 2),
        slot: { pocket: "items", index: 1, item: "potion" },
      },
    ]).ok,
  );
  g.save();
  const document = g.exportDocument();
  assert.equal(document.version, 14);
  assert.deepEqual(document.state.bag.pockets.items.slice(0, 2), [
    { item: "potion", count: 99 },
    { item: "potion", count: 49 },
  ]);
  assert(validateSave(document.state, g.db, g.catalog, s.host));
  assert(
    !validateSave(
      { ...document.state, bag: { potion: 148 } },
      g.db,
      g.catalog,
      s.host,
    ),
  );
  assert.throws(
    () => g.loadDocument({ ...document, version: 9 }),
    /Invalid save/,
  );
  const restored = session([], s.records).game;
  assert.deepEqual(restored.state.bag, document.state.bag);
  const previous = g.state.bag;
  g.loadDocument(document);
  assert.notEqual(g.state.bag, previous);
  assert(g.inventory.apply(g.state.bag, [add("potion", 1)]).ok);
  assert.equal(g.itemQuantity("potion"), 149);
  assert.equal(s.query().bag.potion, 149);
  assert.equal(previous.pockets.items[1].count, 49);
});

test("A full shop cannot deduct money; a partial stack accepts the purchase without requiring an empty slot", async () => {
  const { game: g, bus } = session();
  fullNormal(g);
  const before = structuredClone(g.state),
    money = g.state.money;
  assert.equal(g.canBuyItem("potion"), false);
  assert.equal(await bus.execute("core.item.buy", { item: "potion" }), false);
  assert.deepEqual(g.state, before);
  assert(g.inventory.apply(g.state.bag, [remove("potion", 1)]).ok);
  assert(g.canBuyItem("potion"));
  assert.equal(await bus.execute("core.item.buy", { item: "potion" }), true);
  assert.equal(g.state.money, money - g.itemDefinitions.potion.price);
  assert.equal(g.itemQuantity("potion"), 2970);
});

test("Story rewards preflight the whole bundle; full bags never commit money, flags or ledgers and old grant is rejected", async () => {
  const { game: g } = session();
  fullNormal(g);
  const before = structuredClone(g.state);
  const reward = {
    type: "reward",
    id: "capacity.gift",
    money: 50,
    flags: { gifted: true },
    items: { pokeball: 2, potion: 1 },
  };
  await assert.rejects(g.runStory([reward]), /口袋/);
  assert.deepEqual(g.state, before);
  await assert.rejects(
    g.runStory([{ type: "grant", flag: "old", item: "potion", amount: 1 }]),
    /Unknown story command/,
  );
  assert.deepEqual(g.state, before);
  assert(g.inventory.apply(g.state.bag, [remove("potion", 1)]).ok);
  await g.runStory([reward]);
  assert.equal(g.itemQuantity("pokeball"), 2);
  assert.equal(g.state.money, before.money + 50);
  assert(g.state.flags.gifted);
  await g.runStory([reward]);
  assert.equal(g.itemQuantity("pokeball"), 2);
  assert.deepEqual(g.state.story.rewards, ["capacity.gift"]);
});

test("Removing or swapping held items respects return capacity; a same-pocket swap can reuse the freed slot", () => {
  const { game: g } = session(),
    mon = partner(g);
  fullNormal(g);
  mon.heldItem = "leftovers";
  assert(g.inventory.apply(g.state.bag, [add("oran_berry", 1)]).ok);
  const before = structuredClone(g.state);
  assert.equal(g.equipItem(mon.uid, null).ok, false);
  assert.equal(g.equipItem(mon.uid, "oran_berry").ok, false);
  assert.deepEqual(g.state, before);
  g.state.bag.pockets.items[0] = { item: "quick_claw", count: 1 };
  assert(g.equipItem(mon.uid, "quick_claw").ok);
  assert.equal(mon.heldItem, "quick_claw");
  assert.equal(g.itemQuantity("leftovers"), 1);
  assert.equal(g.itemQuantity("quick_claw"), 0);
  assert.equal(g.bagView().pockets.items.used, 30);
});

function soilPlugin() {
  return {
    id: "farm",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["crops"],
    setup(api) {
      const map = api.content.register("maps", "field", {
        ...base.maps.Route101,
        width: 4,
        height: 4,
        blocks: Array(16).fill(3 << 12),
        behavior: Array(16).fill(0),
        npcs: [],
        signs: [],
        warps: [],
        connections: [],
        elements: [
          {
            id: "soil",
            x: 2,
            y: 1,
            actor: "Boy1",
            kind: "berryPlot",
            plotId: "farm:soil",
          },
        ],
      });
      api.content.register("berryPlots", "soil", { map, objectId: "soil" });
    },
  };
}
test("Harvesting rejects the entire yield before clearing a ripe tree and can succeed later when stack space is available", async () => {
  const { game: g, bus } = session([soilPlugin()]);
  g.state.position = {
    map: "farm:field",
    x: 1,
    y: 1,
    dir: "right",
    elevation: 3,
    previousElevation: 3,
  };
  g.bindField();
  g.startClock(12, 0);
  assert(g.inventory.apply(g.state.bag, [add("oran_berry", 1)]).ok);
  assert(
    (
      await bus.execute("core.crop.action", {
        id: "farm:soil",
        action: "plant",
        kind: "oran_berry",
      })
    ).ok,
  );
  g.advanceCrops(720);
  const tree = structuredClone(g.state.crops),
    yieldCount = g.cropView("farm:soil").yield;
  assert(yieldCount >= 2);
  assert(g.inventory.apply(g.state.bag, [add("oran_berry", 999)]).ok);
  const bag = structuredClone(g.state.bag);
  assert.equal(
    (
      await bus.execute("core.crop.action", {
        id: "farm:soil",
        action: "harvest",
      })
    ).ok,
    false,
  );
  assert.deepEqual(g.state.crops, tree);
  assert.deepEqual(g.state.bag, bag);
  assert(g.inventory.apply(g.state.bag, [remove("oran_berry", yieldCount)]).ok);
  assert(
    (
      await bus.execute("core.crop.action", {
        id: "farm:soil",
        action: "harvest",
      })
    ).ok,
  );
  assert.equal(g.itemQuantity("oran_berry"), 999);
  assert.equal(g.cropView("farm:soil").stage, "empty");
});

test("Item plans use the selected stack, refuse moved or replaced containers, and never heal on stale costs", () => {
  const { game: g } = session(),
    mon = partner(g);
  mon.hp = 1;
  assert(g.inventory.apply(g.state.bag, [add("potion", 150)]).ok);
  const slot = { pocket: "items", index: 1, item: "potion" };
  const first = g.itemPlan("potion", 0, false, slot);
  g.state.bag.pockets.items[1] = null;
  assert.equal(g.items.commit(first, g.state.bag, "potion"), false);
  assert.equal(mon.hp, 1);
  assert.equal(g.useItem("potion", 0, slot).ok, false);
  assert.equal(mon.hp, 1);
  g.state.bag = g.inventory.create({ potion: 150 });
  const replacement = g.itemPlan("potion", 0, false, slot);
  g.state.bag = structuredClone(g.state.bag);
  assert.equal(g.items.commit(replacement, g.state.bag, "potion"), false);
  assert(g.useItem("potion", 0, slot).ok);
  assert.equal(g.state.bag.pockets.items[0].count, 99);
  assert.equal(g.state.bag.pockets.items[1].count, 50);
  assert.equal(mon.hp, 21);
});

function page(g) {
  let buttons = [],
    body = "";
  const root = {
    querySelectorAll(selector) {
      const field = selector
        .slice(6, -1)
        .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      return buttons.filter((button) => field in button.dataset);
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
  };
  const ui = createBagInterface(g, {
    root,
    modal(_name, html) {
      body = html;
      buttons = [
        ...html.matchAll(/<button[^>]*data-([\w-]+)="([^"]*)"[^>]*>/g),
      ].map((match) => ({
        dataset: {
          [match[1].replace(/-([a-z])/g, (_, c) => c.toUpperCase())]: match[2],
        },
        disabled: match[0].includes("disabled"),
      }));
    },
    closeModal() {},
    showMenu() {},
    partyCard: (_mon, i) => `<button data-mon="${i}">伙伴</button>`,
    toast() {},
    updateSide() {},
    sound() {},
    escapeHTML: String,
  });
  return { ui, root, body: () => body };
}
test("The real bag page renders distinct stacks and its command facade consumes the clicked second stack", () => {
  const s = session(),
    g = s.game,
    mon = partner(g);
  mon.hp = 1;
  assert(g.inventory.apply(g.state.bag, [add("potion", 150)]).ok);
  const p = page(createEmeraldCommandFacade(g, s.bus));
  p.ui.showBag();
  assert.match(p.body(), /道具 · 2\/30/);
  assert.match(p.body(), /伤药 × 99/);
  assert.match(p.body(), /伤药 × 51/);
  p.root.querySelectorAll("[data-item]")[1].onclick();
  p.root.querySelectorAll("[data-mon]")[0].onclick();
  assert.equal(g.state.bag.pockets.items[0].count, 99);
  assert.equal(g.state.bag.pockets.items[1].count, 50);
  assert.equal(mon.hp, 21);
});

test("Public teaching checks the selected machine slot before modifying moves, friendship or inventory", () => {
  const { game: g, bus } = session(),
    mon = partner(g);
  mon.moves = [{ id: "tackle", pp: g.db.moves.tackle.pp }];
  assert(g.inventory.apply(g.state.bag, [add("tm_toxic", 2)]).ok);
  const before = structuredClone(g.state),
    seed = g.rng.snapshot();
  const input = {
    method: "tm_toxic",
    uid: mon.uid,
    slot: { pocket: "machines", index: 1, item: "tm_toxic" },
  };
  assert.equal(bus.executeSync("core.learning.teach", input, "ui").ok, false);
  assert.deepEqual(g.state, before);
  assert.equal(g.rng.snapshot(), seed);
  const result = bus.executeSync(
    "core.learning.teach",
    { ...input, slot: { ...input.slot, index: 0 } },
    "ui",
  );
  assert(result.ok);
  assert(mon.moves.some((m) => m.id === "toxic"));
  assert.equal(mon.friendship, before.party[0].friendship + 1);
  assert.equal(g.itemQuantity("tm_toxic"), 1);
});

test("Independent allied battle controllers can each spend their own one-item container in the same round", () => {
  const { game: g } = session(),
    a = partner(g),
    ally = partner(g);
  a.hp = ally.hp = 1;
  const enemy = createMonster("zigzagoon", 10, g.db, g.rng);
  const bag = g.inventory.create({ potion: 1 }),
    allyBag = g.inventory.create({ potion: 1 });
  const topology = teamRoster([a], [enemy], bag);
  topology.sides[0].controllers.push({
    id: "ally",
    kind: "human",
    party: [ally],
    bag: allyBag,
  });
  topology.sides[0].seats.push({ id: "ally:0", controllerId: "ally" });
  const b = new Battle({
    db: g.db,
    rng: g.rng,
    items: g.items,
    topology,
    trainer: true,
    rules: { damage: () => ({ amount: 1, type: 1, critical: false }) },
  });
  b.act({ kind: "item", item: "potion", seat: "home:0" });
  assert.equal(g.inventory.quantity(bag, "potion"), 1);
  b.act({ kind: "item", item: "potion", seat: "ally:0" });
  assert.equal(b.turn, 1);
  assert.equal(g.inventory.quantity(bag, "potion"), 0);
  assert.equal(g.inventory.quantity(allyBag, "potion"), 0);
  assert(a.hp > 1 && ally.hp > 1);
});

test("Battle rejects old or unvalidated inventories before play and rejects slot references on non-item actions", () => {
  const { game: g } = session(),
    mon = partner(g);
  const enemy = createMonster("zigzagoon", 10, g.db, g.rng);
  assert.throws(
    () => new BattleRoster(teamRoster([mon], [enemy], { potion: 1 })),
    /Invalid controller inventory/,
  );
  for (const bag of [
    g.inventory.create({ potion: 1 }),
    { pockets: { missing: [] } },
  ])
    assert.throws(
      () =>
        new Battle({
          db: g.db,
          rng: g.rng,
          topology: teamRoster([mon], [enemy], bag),
          trainer: true,
        }),
      /requires an injected item service/,
    );
  assert.throws(
    () =>
      new Battle({
        db: g.db,
        rng: g.rng,
        items: g.items,
        topology: teamRoster([mon], [enemy], { pockets: { missing: [] } }),
        trainer: true,
      }),
    /Unknown inventory pocket/,
  );
  const b = new Battle({
    db: g.db,
    rng: g.rng,
    items: g.items,
    topology: teamRoster([mon], [enemy], g.state.bag),
    trainer: true,
  });
  const before = structuredClone(g.state),
    seed = g.rng.snapshot();
  assert.match(
    b.actions.prepare({
      kind: "move",
      index: 0,
      slot: { pocket: "items", index: 0, item: "potion" },
    }).error,
    /道具位置/,
  );
  assert.deepEqual(g.state, before);
  assert.equal(g.rng.snapshot(), seed);
  assert.equal(b.turn, 0);
});

function inventoryPlugin(reference) {
  return {
    id: "garden",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["reward", "useItem"],
    setup(api) {
      reference.api = api;
      const pocket = api.content.register("inventoryPockets", "materials", {
        label: "园圃材料",
        capacity: 2,
        stackLimit: 3,
        allowDuplicates: true,
      });
      const item = api.content.register("items", "tonic", {
        name: "园圃补剂",
        pocket,
        price: 0,
        target: "party",
        contexts: ["field"],
        effects: [{ op: "restoreHP", amount: 2 }],
      });
      const empty = {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      };
      api.actions.register("receive", {
        schema: empty,
        run(ctx) {
          ctx.intent({
            kind: "reward",
            reward: { id: "garden:gift", items: { [item]: 3 } },
          });
        },
      });
      api.actions.register("rollback", {
        schema: {
          type: "object",
          properties: { uid: { type: "string" } },
          required: ["uid"],
          additionalProperties: false,
        },
        run(ctx, input) {
          ctx.store.set("used", true);
          ctx.intent({ kind: "useItem", item, uid: input.uid });
          ctx.intent({
            kind: "reward",
            reward: {
              id: "garden:overfull",
              items: { potion: 1 },
              flags: { bad: true },
            },
          });
        },
      });
    },
  };
}
test("Plugin pockets flow through reward, page, use and save; failed transactions restore slots, target and memory", async () => {
  const ref = {},
    plugin = inventoryPlugin(ref),
    s = session([plugin]),
    g = s.game,
    mon = partner(g);
  mon.hp = 1;
  assert((await s.bus.execute("garden:receive", {})).ok);
  assert.equal(g.itemQuantity("garden:tonic"), 3);
  const p = page(g);
  p.ui.showBag();
  assert.match(p.body(), /园圃材料 · 1\/2/);
  assert.match(p.body(), /园圃补剂 × 3/);
  assert(g.inventory.apply(g.state.bag, [add("potion", 2970)]).ok);
  const before = structuredClone(g.state);
  await assert.rejects(
    s.bus.execute("garden:rollback", { uid: mon.uid }),
    /口袋/,
  );
  assert.deepEqual(g.state, before);
  assert.equal(ref.api.store.get("used"), null);
  assert(
    (
      await ref.api.commands.dispatch("core.item.use", {
        item: "garden:tonic",
        uid: mon.uid,
      })
    ).ok,
  );
  assert.equal(g.itemQuantity("garden:tonic"), 2);
  assert.equal(g.state.party[0].hp, 3);
  const view = ref.api.query();
  assert(Object.isFrozen(view.bag));
  assert(Object.isFrozen(view.inventory.pockets["garden:materials"].slots[0]));
  assert.throws(
    () => (view.inventory.pockets["garden:materials"].slots[0].count = 99),
    TypeError,
  );
  g.save();
  assert(g.state.contentDependencies.includes("garden"));
  const restored = session([inventoryPlugin({})], s.records).game;
  assert.equal(restored.itemQuantity("garden:tonic"), 2);
  const bytes = [...s.records];
  const missing = session([], s.records).game;
  assert(missing.saveProtected);
  missing.save();
  assert.deepEqual([...s.records], bytes);
});

test("Capacity preview and story itemSpace queries use registered policies without mutating state or permitting a commit", async () => {
  const { game: g, bus } = session();
  fullNormal(g);
  const before = structuredClone(g.state),
    seed = g.rng.snapshot();
  const plan = await bus.execute(
    "core.inventory.preview",
    { additions: [{ item: "pokeball", count: 1 }] },
    "network",
  );
  assert(plan.ok);
  assert.equal(g.inventory.commit(plan, g.state.bag), false);
  assert.equal(
    (
      await bus.execute("core.inventory.preview", {
        additions: [
          { item: "pokeball", count: 1 },
          { item: "potion", count: 1 },
        ],
      })
    ).ok,
    false,
  );
  const query = { id: "itemSpace", input: { item: "potion", count: 1 } };
  assert.equal(g.conditionQueries.read(query, g.state), false);
  assert.equal(
    g.conditionQueries.read(
      { id: "itemCount", input: { item: "potion" } },
      g.state,
    ),
    2970,
  );
  assert.deepEqual(g.state, before);
  assert.equal(g.rng.snapshot(), seed);
  await g.runStory([
    {
      type: "if",
      condition: { compare: { query, op: "eq", value: false } },
      then: [{ type: "flag", key: "bagFull", value: true }],
    },
  ]);
  assert(g.state.flags.bagFull);
});

test("Trainer stocks are compiled into slots and oversized custom-pocket stocks fail startup before any battle", () => {
  const plugin = {
    id: "stock",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      const pocket = api.content.register("inventoryPockets", "limited", {
        label: "限量",
        capacity: 1,
        stackLimit: 1,
        allowDuplicates: false,
      });
      const item = api.content.register("items", "remedy", {
        name: "药",
        pocket,
        price: 0,
        target: "party",
        contexts: ["battle"],
        effects: [{ op: "restoreHP", amount: 2 }],
      });
      api.content.register("trainers", "medic", {
        name: "医师",
        script: "medic",
        prize: 0,
        party: [{ species: "zigzagoon", level: 5 }],
        bag: { [item]: 2 },
      });
    },
  };
  assert.throws(() => createEmeraldPlugins(base, [plugin]), /口袋/);
  const ordinary = {
    ...plugin,
    setup(api) {
      api.content.register("trainers", "medic", {
        name: "医师",
        script: "medic",
        prize: 0,
        party: [{ species: "zigzagoon", level: 5 }],
        bag: { potion: 1500 },
      });
    },
  };
  const { game: g } = session([ordinary]),
    mon = partner(g);
  const encounter = createTrainerEncounter(g.catalog.trainers["stock:medic"], {
    party: [mon],
    bag: g.state.bag,
    db: g.db,
    rng: g.rng,
    inventory: g.inventory,
  });
  const roster = new BattleRoster(encounter.topology);
  assert.equal(
    g.inventory.quantity(roster.owner("away:0").bag, "potion"),
    1500,
  );
  let draws = 0;
  const next = g.rng.next.bind(g.rng);
  g.rng.next = () => {
    draws++;
    return next();
  };
  const input = {
    party: [mon],
    bag: g.state.bag,
    db: g.db,
    rng: g.rng,
    inventory: g.inventory,
  };
  assert.throws(
    () =>
      createTrainerEncounter(
        { ...g.catalog.trainers["stock:medic"], bag: { potion: 2971 } },
        input,
      ),
    /口袋/,
  );
  assert.throws(
    () =>
      createTrainerEncounter(g.catalog.trainers["stock:medic"], {
        ...input,
        inventory: undefined,
      }),
    /require an inventory service/,
  );
  assert.equal(draws, 0);
});
