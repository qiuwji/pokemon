import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { session } from "./helpers/session.js";
import { inventoryQuantity } from "../src/engine/inventory.js";
import { EMERALD_MARTS, emeraldMartStock } from "../src/packs/emerald/mart-stock.js";
import { createShopInterface } from "../src/ui/emerald/shop-interface.js";

test("Every imported centre nurse heals HP/status/PP through the counter; no cancels without healing, including after reload", async () => {
  for (const town of ["OldaleTown", "PetalburgCity", "RustboroCity", "DewfordTown", "SlateportCity"]) {
    const s = session(), g = s.game, mon = s.mon;
    g.enter({ map: town + "_PokemonCenter_1F", x: 7, y: 4, dir: "up" });
    assert.equal(g.world.interact()?.kind, "heal", town);
    mon.hp = 1; mon.status = "poison"; mon.moves[0].pp = 0;
    let machines = 0;
    g.ui.showHealCenter = async () => {
      machines++;
      assert.equal(mon.hp, 1, "party heals after the machine beat completes");
      assert.equal(g.field.npcs.objects(g.state.position.map).find(n => n.kind === "heal").dir, "left");
    };
    g.interact(); await s.settle();
    assert.equal(machines, 1); assert.equal(mon.hp, mon.stats.hp); assert.equal(mon.status, null);
    assert.equal(mon.moves[0].pp, s.db.moves[mon.moves[0].id].pp);
    mon.hp = 1; mon.status = "poison"; mon.moves[0].pp = 0;
    g.loadDocument(g.exportDocument());
    g.ui.choose = async () => "no";
    const before = structuredClone(g.state.party);
    g.interact(); await s.settle();
    assert.deepEqual(g.state.party, before); assert.equal(machines, 1);
    assert.equal(g.storyBusy, false);
  }
});

test("Native marts open at their real counters and their basic/expanded inventories match the original item lists", async () => {
  for (const [map, definition] of Object.entries(EMERALD_MARTS)) {
    const source = readFileSync(new URL("../work/pokeemerald/data/maps/" + map + "/scripts.inc", import.meta.url), "utf8");
    const lists = [...source.matchAll(/(?:Pokemart(?:_\w+)?):\n([\s\S]*?)\tpokemartlistend/g)].map(match =>
      [...match[1].matchAll(/\.2byte ITEM_(\w+)/g)].map(m => m[1] === "POKE_BALL" ? "pokeball" : m[1].toLowerCase()));
    assert.deepEqual(definition.basic, lists[0], map);
    if (definition.expanded) assert.deepEqual(definition.expanded, lists[1], map);
    const s = session(), g = s.game;
    g.state.flags.pokedex = true; g.state.money = 20000;
    g.enter({ map, x: 3, y: 3, dir: "left" });
    assert.equal(g.world.interact()?.kind, "shop");
    let opened = 0; g.ui.showShop = () => { opened++; };
    g.interact(); await s.settle(); assert.equal(opened, 1);
    const stock = emeraldMartStock(g.state), money = g.state.money;
    assert(g.canBuyItem("paralyze_heal"), "source-approved items need not be in the legacy global stock");
    assert(g.buyItem("paralyze_heal"));
    assert.equal(inventoryQuantity(g.state.bag, "paralyze_heal"), 1);
    assert.equal(g.state.money, money - g.itemDefinitions.paralyze_heal.price);
    assert.equal(g.buyItem("leftovers"), false, "the legacy test shop must not leak into native stock");
    if (map === "RustboroCity_Mart") {
      g.state.flags.petalburgWoodsSaved = true; g.state.flags.devonGoodsReturned = true;
      assert(!emeraldMartStock(g.state).includes("repeat_ball"), "the Route116 meeting is an independent source fact");
    }
    if (definition.expandedFlag) {
      g.state.flags[definition.expandedFlag] = true;
      g.loadDocument(g.exportDocument());
      assert.deepEqual(emeraldMartStock(g.state), definition.expanded);
    } else assert.deepEqual(stock, definition.basic);
    g.state.money = 0; assert.equal(g.buyItem("potion"), false);
  }
});

test("Rustboro shop UI draws the native stock and buying clicks use the real money/inventory/save path", () => {
  const s = session(), g = s.game; g.state.flags.pokedex = true; g.state.money = 5000;
  g.ui.extensions.mountSlot = () => {};
  g.enter({ map: "RustboroCity_Mart", x: 3, y: 3, dir: "left" });
  const nodes = new Map(); let buttons = [], html = "";
  const root = {
    querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, { focus() {} }); return nodes.get(selector); },
    querySelectorAll() { return buttons; },
  };
  const ui = createShopInterface(g, { root, document: {}, closeModal() {}, updateSide() {}, sound() {}, toast() {},
    escapeHTML: text => text,
    modal(_title, value) { html = value; buttons = [...value.matchAll(/data-buy="([^"]+)"/g)].map(m => ({ dataset: { buy: m[1] } })); },
  });
  s.saved.clear();
  ui.showShop();
  assert.deepEqual(buttons.map(b => b.dataset.buy), EMERALD_MARTS.RustboroCity_Mart.basic);
  assert(!html.includes('data-buy="leftovers"')); assert(html.includes("解麻药"));
  buttons.find(b => b.dataset.buy === "potion").onclick();
  assert.equal(g.state.money, 4700); assert.equal(inventoryQuantity(g.state.bag, "potion"), 1);
  assert.equal(s.saved.size, 1); assert([...s.saved.values()].some(value => value.includes('"money":4700')));
});

test("104 west boy grants the registered TM09 once and a full machine stack remains retryable", async () => {
  const s = session(), g = s.game;
  g.enter({ map: "Route104", x: 6, y: 26, dir: "left" });
  const full = g.inventory.prepare(g.state.bag, [{ kind: "add", item: "tm_bullet_seed", count: 99 }]);
  assert(g.inventory.commit(full, g.state.bag));
  g.interact(); await s.settle(); assert(!g.state.flags.route104BulletSeedGift);
  const remove = g.inventory.prepare(g.state.bag, [{ kind: "remove", item: "tm_bullet_seed", count: 99 }]);
  assert(g.inventory.commit(remove, g.state.bag));
  g.loadDocument(g.exportDocument()); g.interact(); await s.settle();
  assert.equal(inventoryQuantity(g.state.bag, "tm_bullet_seed"), 1); assert(g.state.flags.route104BulletSeedGift);
  g.loadDocument(g.exportDocument()); g.interact(); await s.settle();
  assert.equal(inventoryQuantity(g.state.bag, "tm_bullet_seed"), 1);
});
