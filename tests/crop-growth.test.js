import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { CropRegistry, CropService } from "../dist/engine/crop-growth.js";
import {
  EMERALD_CROP_POLICY,
  EMERALD_CROPS,
  emeraldBerryYield,
} from "../dist/packs/emerald/berries.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { createEmeraldPlugins } from "../dist/packs/emerald/extensions.js";
import { EmeraldAdventure } from "../dist/packs/emerald/adventure.js";
import { attachEmeraldExtensions } from "../dist/packs/emerald/extension-ports.js";
import { validateSave } from "../dist/packs/emerald/save-contract.js";
import { Timeline, TransitionController } from "../dist/engine/timeline.js";
import { BattleDirector } from "../dist/presentation/battle-director.js";
import { GridMotion, SceneGraph } from "../dist/engine/motion.js";
const registry = new CropRegistry(EMERALD_CROPS, { items: ITEMS });
function crops(state) {
  return new CropService({
    registry,
    state,
    policy: EMERALD_CROP_POLICY,
    calculateYield: emeraldBerryYield,
  });
}
test("Four separately watered stages mature with the source yield formula and four-duration ripe interval", () => {
  const s = crops();
  s.plant("plot", "oran_berry");
  for (const stage of ["planted", "sprouted", "taller", "flowering"]) {
    assert.equal(s.view("plot").stage, stage);
    assert(s.water("plot"));
    assert.equal(s.water("plot"), false);
    s.advance(180, () => 65535);
  }
  assert.equal(s.view("plot").stage, "ripe");
  assert.equal(s.view("plot").yield, 3);
  assert.equal(s.view("plot").remainingMinutes, 720);
  assert.equal(s.water("plot"), false);
  s.advance(719, () => 0);
  assert.equal(s.view("plot").stage, "ripe");
  s.advance(1, () => 0);
  assert.equal(s.view("plot").stage, "sprouted");
  assert.equal(s.view("plot").cycles, 1);
  assert.deepEqual(s.view("plot").watered, []);
  assert.equal(s.view("plot").yield, 0);
});
test("Minute catch-up equals individual updates, stopped source trees wait until seen, and state restores halfway", () => {
  const a = crops(),
    b = crops();
  a.plant("plot", "cheri_berry");
  b.plant("plot", "cheri_berry");
  a.advance(1000, () => 0);
  for (let i = 0; i < 1000; i++) b.advance(1, () => 0);
  assert.deepEqual(a.state, b.state);
  const restored = crops(JSON.parse(JSON.stringify(a.state)));
  restored.advance(440, () => 0);
  assert.equal(restored.view("plot").stage, "sprouted");
  restored.plant("wild", "oran_berry", { stage: "ripe", stopped: true });
  restored.advance(50000, () => 0);
  assert.equal(restored.view("wild").yield, 2);
  assert(restored.release("wild"));
  restored.advance(720, () => 0);
  assert.equal(restored.view("wild").stage, "sprouted");
});
test("The tenth regrowth removes a tree and the source 71-duration offline shortcut consumes no random samples", () => {
  const s = crops();
  s.plant("plot", "oran_berry");
  s.advance(180 * 8, () => 0);
  assert.equal(s.view("plot").cycles, 1);
  for (let i = 0; i < 9; i++) s.advance(180 * 7, () => 0);
  assert.equal(s.view("plot").stage, "empty");
  s.plant("plot", "oran_berry");
  s.advance(180 * 71, () => {
    throw new Error("must not roll");
  });
  assert.equal(s.view("plot").stage, "empty");
});
test("Yield uses original modulo and nearest-quarter rounding for every water count", () => {
  const definition = { minYield: 2, maxYield: 6 };
  assert.equal(
    emeraldBerryYield({ definition, watered: 0 }, () => {
      throw new Error("no roll");
    }),
    2,
  );
  for (let watered = 1; watered <= 4; watered++)
    for (let sample = 0; sample <= 4; sample++) {
      const n = 4 * (watered - 1) + sample;
      assert.equal(
        emeraldBerryYield({ definition, watered }, () => sample),
        2 + Math.floor(n / 4) + (n % 4 >= 2 ? 1 : 0),
      );
    }
});
test("Bad saves, unknown crops, invalid durations and failed yields cannot partially advance other trees", () => {
  const s = crops();
  s.plant("a", "oran_berry");
  s.plant("b", "oran_berry");
  s.water("b");
  const before = structuredClone(s.state);
  assert.throws(() => s.advance(720, () => -1));
  assert.deepEqual(s.state, before);
  assert.throws(() => s.plant("__proto__", "oran_berry"));
  assert.throws(() => s.plant("c", "typo"));
  assert.throws(() =>
    crops({ trees: { a: { ...s.state.trees.a, remainingMinutes: 0 } } }),
  );
  assert.throws(() =>
    crops({ trees: { a: { ...s.state.trees.a, watered: ["ripe"] } } }),
  );
  assert.throws(
    () =>
      new CropRegistry(
        { bad: { ...EMERALD_CROPS.oran_berry, item: "missing" } },
        { items: ITEMS },
      ),
  );
  assert.throws(() => s.advance(-1));
});
test("Stage graphs are replaceable without changes to the growth driver", () => {
  const s = new CropService({
    registry,
    policy: {
      stages: [
        { id: "seed", duration: 1, next: "ready", water: true },
        { id: "ready", duration: 2, next: "seed", harvest: true, cycle: true },
      ],
      maxCycles: 2,
      expireAfterDurations: 10,
    },
    calculateYield: () => 2,
  });
  s.plant("plot", "oran_berry");
  s.advance(180);
  assert.equal(s.view("plot").stage, "ready");
  s.advance(360);
  assert.equal(s.view("plot").stage, "seed");
});
const base = JSON.parse(
  fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
);
function gardenPlugin() {
  return {
    id: "garden",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: ["crops"],
    setup(api) {
      api.content.register("maps", "field", {
        id: "garden:field",
        title: "Test orchard",
        width: 5,
        height: 4,
        tileset: base.maps.LittlerootTown.tileset,
        blocks: Array(20).fill(1),
        behavior: Array(20).fill(0),
        border: [1, 1, 1, 1],
        connections: [],
        warps: [],
        npcs: [],
        signs: [],
        elements: [
          {
            id: "soil",
            plotId: "garden:soil",
            kind: "berryPlot",
            actor: "ProfBirch",
            x: 2,
            y: 1,
            dir: "down",
            movement: { mode: "still" },
          },
        ],
      });
      api.content.register("berryPlots", "soil", {
        map: "garden:field",
        objectId: "soil",
      });
    },
  };
}
function gameFixture() {
  const compiled = createEmeraldPlugins(base, [gardenPlugin()]);
  let wall = 100000,
    frame = 0;
  const timeline = new Timeline({
    now: () => frame,
    wait: async (ms) => {
      frame += ms;
    },
  });
  const game = new EmeraldAdventure({
    ...compiled,
    plugins: compiled.host,
    wallNow: () => wall,
    storage: { getItem: () => null, setItem() {} },
    timeline,
    transitions: new TransitionController(timeline),
    director: new BattleDirector(timeline),
    motion: new GridMotion(new SceneGraph(compiled.db.maps)),
  });
  game.attachUI({
    blocked: false,
    dialog: null,
    updateSide() {},
    updateTime() {},
    toast() {},
    checkGrowth() {},
    showBerryPlot(id) {
      this.plot = id;
    },
  });
  Object.assign(game.state.position, {
    map: "garden:field",
    x: 1,
    y: 1,
    dir: "right",
  });
  game.bindField();
  game.startClock(12, 0);
  const { bus } = attachEmeraldExtensions(game, compiled.host);
  return {
    game,
    bus,
    ...compiled,
    tick(minutes) {
      wall += minutes * 60000;
      frame += 1000;
      game.tick(frame, [game.state.position.map]);
    },
  };
}
test("A plugin declares its plot and uses public planting, watering and harvesting commands with saved time", async () => {
  const s = gameFixture(),
    changes = [];
  s.host.events.on("core:crop-changed", (e) => changes.push(e.payload));
  s.game.state.bag.oran_berry = 1;
  assert(
    (
      await s.bus.execute("core.crop.action", {
        id: "garden:soil",
        action: "plant",
        kind: "oran_berry",
      })
    ).ok,
  );
  assert.equal(s.game.state.bag.oran_berry, 0);
  assert.equal(
    (
      await s.bus.execute("core.crop.action", {
        id: "garden:soil",
        action: "water",
      })
    ).ok,
    false,
  );
  s.game.state.flags.wailmerPail = true;
  assert(
    (
      await s.bus.execute("core.crop.action", {
        id: "garden:soil",
        action: "water",
      })
    ).ok,
  );
  s.tick(720);
  assert.equal(s.game.cropView("garden:soil").stage, "ripe");
  assert.equal(changes.length, 1);
  const restored = JSON.parse(JSON.stringify(s.game.state));
  assert(validateSave(restored, s.db, s.catalog, s.host));
  assert.equal(
    (await s.bus.execute("core.query", {})).crops["garden:soil"].harvestable,
    true,
  );
  assert(
    (
      await s.bus.execute("core.crop.action", {
        id: "garden:soil",
        action: "harvest",
      })
    ).ok,
  );
  assert(s.game.state.bag.oran_berry >= 2);
  assert.equal(s.game.cropView("garden:soil").stage, "empty");
  assert(s.host.catalog.dependencies(restored).includes("garden"));
});
test("Off-map and unripe operations do not consume inventory and plot interactions route to the crop page", async () => {
  const s = gameFixture();
  s.game.state.bag.oran_berry = 2;
  s.game.state.position.dir = "left";
  const before = structuredClone(s.game.state);
  assert.equal(
    (
      await s.bus.execute("core.crop.action", {
        id: "garden:soil",
        action: "plant",
        kind: "oran_berry",
      })
    ).ok,
    false,
  );
  assert.deepEqual(s.game.state, before);
  s.game.state.position.dir = "right";
  await s.game.interact();
  assert.equal(s.game.ui.plot, "garden:soil");
  assert(
    (
      await s.bus.execute("core.crop.action", {
        id: "garden:soil",
        action: "plant",
        kind: "oran_berry",
      })
    ).ok,
  );
  assert.equal(
    (
      await s.bus.execute("core.crop.action", {
        id: "garden:soil",
        action: "harvest",
      })
    ).ok,
    false,
  );
  assert.equal(s.game.state.bag.oran_berry, 1);
});
test("Missing plot/object references fail during plugin content assembly", () => {
  const p = gardenPlugin(),
    setup = p.setup;
  p.setup = (api) => {
    setup(api);
    api.content.register("berryPlots", "typo", {
      map: "garden:field",
      objectId: "missing",
    });
  };
  assert.throws(() => createEmeraldPlugins(base, [p]), /plot/);
});

test("Pending offline growth survives save validation and resumes only after field locks release", () => {
  const s = gameFixture();
  s.game.state.bag.oran_berry = 1;
  assert(s.game.cropAction("garden:soil", "plant", "oran_berry").ok);
  s.game.ui.blocked = true;
  s.tick(720);
  assert.equal(s.game.cropView("garden:soil").stage, "planted");
  const saved = JSON.parse(JSON.stringify(s.game.state));
  assert(validateSave(saved, s.db, s.catalog, s.host));
  s.game.state = saved;
  s.game.bindField();
  s.game.ui.blocked = false;
  s.tick(0);
  assert.equal(s.game.cropView("garden:soil").stage, "ripe");
  s.tick(0);
  assert.equal(s.game.cropView("garden:soil").yield, 2);
  const invalid = structuredClone(saved);
  invalid.crops.trees["garden:typo"] = invalid.crops.trees["garden:soil"];
  assert.equal(validateSave(invalid, s.db, s.catalog, s.host), false);
});
