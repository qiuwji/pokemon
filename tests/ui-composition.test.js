import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createEmeraldInterface } from "../dist/packs/emerald/interface.js";
import { createUIShell } from "../dist/packs/emerald/ui-shell.js";
import { createMonster, Random } from "../dist/engine/model.js";
import { ITEMS } from "../dist/packs/emerald/items.js";
import { readOnly } from "../dist/engine/extensions/values.js";
/** Minimal DOM port double, intentionally without gameplay globals. Browser tests cover layout and clicks. */
function documentPort() {
  const elements = new Map(),
    doc = {
      activeElement: null,
      defaultView: { requestAnimationFrame: (callback) => callback() },
    };
  doc.getElementById = (id) => {
    if (!elements.has(id)) {
      let html = "";
      elements.set(id, {
        id,
        children: [],
        classList: { add() {}, remove() {} },
        focus() {
          doc.activeElement = this;
        },
        set innerHTML(value) {
          html = value;
          this.children = value ? [{}] : [];
        },
        get innerHTML() {
          return html;
        },
        querySelector(selector) {
          return selector.startsWith("[data-")
            ? doc.getElementById(selector)
            : null;
        },
        querySelectorAll() {
          return [];
        },
        getClientRects: () => [{}],
      });
    }
    return elements.get(id);
  };
  return doc;
}
function fixture() {
  const db = JSON.parse(
      fs.readFileSync(new URL("../dist/content.json", import.meta.url)),
    ),
    doc = documentPort(),
    calls = [];
  const state = readOnly({
    flags: { rescued: true, pokedex: true },
    party: [createMonster("mudkip", 6, db, new Random(123))],
    box: [],
    seen: ["mudkip"],
    caught: ["mudkip"],
    bag: { potion: 2 },
    money: 3000,
    playSeconds: 0,
    movement: { mode: "walk", visited: [] },
  });
  const game = {
    db,
    state,
    busy: false,
    battle: null,
    plugins: null,
    world: { map: { title: "未白镇" } },
    itemDefinitions: ITEMS,
    saveStore: { load: () => null },
    clearInput() {},
    save: () => calls.push("save"),
    interact: () => calls.push("interact"),
    canUseDaycare: () => true,
    canBuyItem: () => true,
    itemPlan: () => ({ ok: false }),
    evolutionPlan: () => null,
    daycareView: () => ({ slots: [], compatibility: 0, egg: false }),
    movementOptions: () => [],
    fieldActionOptions: () => [],
    reelFishing: (input = {}) =>
      calls.push(input.cancel ? "cancel fishing" : "reel fishing"),
    travel: { list: () => [] },
    fieldCapabilities: () => ({ surf: true }),
  };
  const ui = createEmeraldInterface(game, { document: doc });
  game.ui = ui;
  return { game, doc, ui, calls };
}
test("The assembler preserves dynamic shell getters and existing application interface while all pages render against frozen state", () => {
  const { ui, doc } = fixture();
  for (const method of [
    "showMenu",
    "showParty",
    "showMonster",
    "showBag",
    "showDex",
    "showSave",
    "showBox",
    "showShop",
    "showHelp",
    "showDaycare",
    "showMovement",
    "showSurf",
    "starterPicker",
  ])
    assert.equal(typeof ui[method], "function", method);
  assert.equal(ui.dialog, null);
  assert.equal(ui.blocked, false);
  for (const method of [
    "showMenu",
    "showParty",
    "showBag",
    "showDex",
    "showBox",
    "showShop",
    "showHelp",
    "showDaycare",
    "showMovement",
    "showSurf",
    "starterPicker",
  ]) {
    ui[method]();
    assert(ui.blocked, method);
    ui.closeModal();
  }
  // Save and detail wire named controls; the document port supplies those controls.
  ui.showSave();
  ui.closeModal();
  ui.showMonster(0);
  assert.equal(ui.modalType, "detail");
  ui.closeModal();
  assert.equal(ui.modalType, null);
  ui.showShop();
  assert(
    doc.getElementById("modal-root").innerHTML.includes('data-buy="potion"'),
  );
});
test("Fishing remains controllable while the world is locked and displays bite feedback through the shared shell", () => {
  const { game, doc, ui, calls } = fixture();
  game.busy = true;
  ui.showFishing();
  ui.updateFishing({ phase: "bite", dots: 4, round: 1, result: null });
  assert.match(doc.getElementById("[data-fishing-text]").textContent, /咬钩/);
  doc.getElementById("[data-reel]").onclick();
  assert(calls.includes("reel fishing"));
  ui.back();
  assert(calls.includes("cancel fishing"));
  ui.closeFishing();
  assert.equal(ui.modalType, null);
});
test("Shared shell owns dialogue completion, return navigation and command confirmation without global document", async () => {
  const { ui, calls } = fixture();
  const complete = ui.say("博士", ["第一句", "第二句"]);
  assert(ui.dialog);
  assert(ui.blocked);
  ui.nextDialogue();
  assert.equal(ui.dialog.index, 1);
  ui.nextDialogue();
  await complete;
  assert.equal(ui.dialog, null);
  assert.equal(ui.blocked, false);
  ui.confirm();
  assert(calls.includes("interact"));
  assert(calls.includes("save"));
  ui.showSave();
  ui.back();
  assert.equal(ui.modalType, "menu");
  ui.back();
  assert.equal(ui.blocked, false);
});
test("Focus trap covers visible text/select/link controls and excludes hidden controls", () => {
  const { game, doc } = fixture(),
    shell = createUIShell(game, { document: doc }),
    root = doc.getElementById("modal-root");
  const first = doc.getElementById("first"),
    last = doc.getElementById("textarea"),
    hidden = doc.getElementById("hidden");
  hidden.hidden = true;
  root.children = [{}];
  root.querySelectorAll = () => [first, last, hidden];
  let prevented = 0;
  last.focus();
  shell.focusTrap({
    shiftKey: false,
    preventDefault() {
      prevented++;
    },
  });
  assert.equal(doc.activeElement, first);
  shell.focusTrap({
    shiftKey: true,
    preventDefault() {
      prevented++;
    },
  });
  assert.equal(doc.activeElement, last);
  assert.equal(prevented, 2);
});
