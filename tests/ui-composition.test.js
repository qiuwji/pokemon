import { loadContentSync } from "../tools/content-io.mjs";
import { createEmeraldSpriteClips } from "../src/game/emerald/assembly/sprite-clips.js";
import { emeraldAppearanceResources } from "../src/packs/emerald/appearance-definitions.js";
import { layoutDocument } from "./helpers/layout-document.js";
import {
  createBag,
  fixtureInventory,
  inventoryQuantity,
} from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { createEmeraldInterface } from "../src/ui/emerald/interface.js";
import { createUIShell } from "../src/ui/emerald/ui-shell.js";
import { createMonster, Random } from "../src/engine/model.js";
import { ITEMS } from "../src/packs/emerald/items.js";
import { readOnly } from "../src/engine/extensions/values.js";
/** Minimal DOM port double, intentionally without gameplay globals. Browser tests cover layout and clicks. */
function documentPort() {
  const elements = new Map(),
    doc = {
      activeElement: null,
      defaultView: { requestAnimationFrame: (callback) => callback() },
    };
  doc.createElement = layoutDocument().createElement;
  doc.getElementById = (id) => {
    if (!elements.has(id)) {
      let html = "";
      elements.set(id, {
        id,
        children: [],
        replaceChildren(...nodes) {
          this.children = nodes;
        },
        getContext: () => ({ clearRect() {}, drawImage() {}, fillRect() {} }),
        setAttribute() {},
        addEventListener(type, fn) {
          this[`on${type}`] = fn;
        },
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
  const db = loadContentSync(),
    doc = documentPort(),
    calls = [];
  const state = readOnly({
    flags: { rescued: true, pokedex: true },
    story: { completed: [], rewards: [], history: [] },
    party: [createMonster("mudkip", 6, db, new Random(123))],
    box: [],
    seen: ["mudkip"],
    caught: ["mudkip"],
    bag: createBag({ potion: 2 }),
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
    spriteClips: createEmeraldSpriteClips({
      ...db,
      resources: emeraldAppearanceResources(db),
    }),
    world: { map: { title: "未白镇" } },
    itemDefinitions: ITEMS,
    bagView: () => fixtureInventory().view(state.bag),
    itemQuantity: (item) => inventoryQuantity(state.bag, item),
    saveStore: { load: () => null },
    clearInput() {},
    save: () => calls.push("save"),
    interact: () => calls.push("interact"),
    canUseDaycare: () => true,
    canBuyItem: () => true,
    itemPlan: () => ({ ok: false }),
    itemActionOptions: () => [],
    registeredItemView: () => ({
      selection: null,
      owned: false,
      usable: false,
    }),
    evolutionPlan: () => null,
    daycareView: () => ({ slots: [], compatibility: 0, egg: false }),
    weatherView: () => ({
      map: "LittlerootTown",
      kind: "clear",
      label: "晴朗",
    }),
    timeView: () => ({
      initialized: false,
      day: 0,
      hour: 0,
      minute: 0,
      playSeconds: 0,
      tide: "high",
    }),
    facilityView: () => ({
      active: null,
      results: [],
      definitions: {
        demo: { name: "设施示例", activity: "demo", parameters: {} },
      },
    }),
    enterFacility: (id, team) => {
      calls.push([id, team]);
      return { ok: true };
    },
    facilityAction: (id) => {
      calls.push(id);
      return { ok: true };
    },
    claimFacility: () => ({ ok: true }),
    quitFacility: () => ({ ok: true }),
    movementOptions: () => [],
    movementTechniqueOptions: () => [{ id: "normal", name: "普通" }],
    fieldActionOptions: () => [],
    reelFishing: (input = {}) =>
      calls.push(input.cancel ? "cancel fishing" : "reel fishing"),
    travel: { list: () => [] },
    fieldCapabilities: () => ({ surf: true }),
  };
  const ui = createEmeraldInterface(game, {
    document: doc,
    sound: (id) => calls.push(id),
    extensionAssets: { "mudkip-detail": { width: 64, height: 128 } },
  });
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
  const complete = ui.say("博士", ["第一句", "第二句"], null, {
    mode: "instant",
  });
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

test("Clock page submits setup through a command and renders live saved time", () => {
  const { game, doc, ui, calls } = fixture();
  game.startClock = (hour, minute) => {
    calls.push([hour, minute]);
    return { ok: true };
  };
  ui.showTime();
  assert.equal(ui.modalType, "clock");
  assert.match(doc.getElementById("modal-root").innerHTML, /data-start-clock/);
  const dial = doc.getElementById("[data-clock-dial]");
  const key = (key) =>
    dial.onkeydown({ key, preventDefault() {}, stopPropagation() {} });
  for (let i = 0; i < 14; i++) key("ArrowUp");
  key("ArrowLeft");
  doc.getElementById("[data-start-clock]").onclick();
  assert.deepEqual(calls[0], [23, 59]);
  assert(calls.includes("save"));
  assert.equal(ui.blocked, false);
  ui.updateTime({
    initialized: true,
    day: 3,
    hour: 9,
    minute: 4,
    playSeconds: 3661,
    tide: "high",
  });
  assert.equal(
    doc.getElementById("[data-clock-time]").textContent,
    "第 4 天 · 09:04",
  );
  assert.doesNotMatch(
    doc.getElementById("modal-root").innerHTML,
    /data-play-time|data-tide/,
  );
  assert.match(doc.getElementById("weather").textContent, /09:04/);
});

test("Loaded clock-before-TV state renders the real sidebar and continues through later opening tasks", () => {
  const { game, doc, ui } = fixture();
  game.state = readOnly({
    ...game.state,
    flags: {},
    clock: { initialized: true },
  });
  ui.updateSide();
  assert.equal(doc.getElementById("quest-title").textContent, "回到妈妈身边");
  // Content packs may legitimately have no eligible task; it cannot prevent boot.
  game.state = readOnly({
    ...game.state,
    flags: { rescued: true },
    clock: { initialized: false },
  });
  ui.updateSide();
  assert.equal(doc.getElementById("quest-title").textContent, "与小遥初次交手");
  game.state = readOnly({
    ...game.state,
    flags: { rescued: true, rivalWon: true, pokedex: false },
  });
  ui.updateSide();
  assert.equal(
    doc.getElementById("quest-title").textContent,
    "属于你的宝可梦图鉴",
  );
  game.state = readOnly({
    ...game.state,
    flags: { tvWatched: true, neighborMet: true },
    clock: { initialized: true },
  });
  ui.updateSide();
  assert.equal(doc.getElementById("quest-title").textContent, "草丛里的求救声");
});

test("Facility page renders frozen plugin data and submits entry/action through application commands", async () => {
  const { game, doc, ui, calls } = fixture();
  ui.showFacility();
  assert.equal(ui.modalType, "facility");
  assert.match(doc.getElementById("modal-root").innerHTML, /设施示例/);
  ui.showFacility("demo");
  doc.getElementById("[data-enter-facility]").onclick();
  assert.deepEqual(calls[0], ["demo", []]);
  game.facilityView = () =>
    readOnly({
      active: { facility: "demo", phase: "ready", data: { score: 12 } },
      actions: [{ id: "appeal", label: "表演" }],
      definitions: { demo: { name: "设施示例" } },
      results: [],
    });
  const actionButton = { dataset: { facilityAction: "appeal" } };
  const root = doc.getElementById("modal-root");
  root.querySelectorAll = (selector) =>
    selector === "[data-facility-action]" ? [actionButton] : [];
  ui.showFacility();
  await actionButton.onclick();
  await new Promise(setImmediate);
  assert(calls.includes("appeal"));
  assert.match(root.innerHTML, /score：12/);
});

/** Narrow HTML/event port: retain the detached backdrop in a click's bubbling path.
 * It intentionally models the regression that a container and buttons shared data-page.
 */
function menuEventPort(doc) {
  const root = doc.getElementById("modal-root"),
    descriptor = Object.getOwnPropertyDescriptor(root, "innerHTML");
  let nodes = [];
  const matches = (node, selector) => {
    const tag = selector.match(/^[a-z]+/)?.[0];
    if (tag && node.tagName !== tag.toUpperCase()) return false;
    const attribute = selector.match(/\[([^=\]]+)(?:="([^"]*)")?\]/);
    if (
      attribute &&
      (!node.attrs.has(attribute[1]) ||
        (attribute[2] !== undefined &&
          node.attrs.get(attribute[1]) !== attribute[2]))
    )
      return false;
    if (selector.includes(":not(:disabled)") && node.disabled) return false;
    return !!tag || !!attribute;
  };
  Object.defineProperty(root, "innerHTML", {
    get: () => descriptor.get.call(root),
    set(html) {
      descriptor.set.call(root, html);
      nodes = [];
      const backdrop = { tagName: "DIV", attrs: new Map(), dataset: {} };
      const first =
        html.match(/<div class="modal-backdrop"([^>]*)>/)?.[1] || "";
      const populate = (node, attrs) => {
        for (const m of attrs.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) {
          node.attrs.set(m[1], m[2] || "");
          if (m[1].startsWith("data-"))
            node.dataset[
              m[1].slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase())
            ] = m[2];
        }
        node.disabled = node.attrs.has("disabled");
        node.focus = () => (doc.activeElement = node);
      };
      populate(backdrop, first);
      nodes.push(backdrop);
      for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
        const node = {
          tagName: "BUTTON",
          attrs: new Map(),
          dataset: {},
          textContent: m[2],
        };
        populate(node, m[1]);
        node.click = () => {
          if (node.disabled) return;
          node.onclick?.();
          backdrop.onclick?.();
        };
        nodes.push(node);
      }
    },
  });
  root.querySelectorAll = (selector) =>
    nodes.filter((node) => matches(node, selector));
  root.querySelector = (selector) => root.querySelectorAll(selector)[0] || null;
  return root;
}
test("Settings navigation survives click bubbling and Travel opens its own modal instead of silently reopening settings", () => {
  const { ui, doc } = fixture(),
    root = menuEventPort(doc);
  ui.showMenu();
  root.querySelector('button[data-page="settings"]').click();
  assert.equal(ui.modalType, "options");
  root.querySelector("button[data-open-extras]").click();
  assert.equal(ui.modalType, "extensions");
  root.querySelector('button[data-page="movement"]').click();
  assert.equal(ui.modalType, "movement");
  assert.match(root.innerHTML, /data-modal-page="movement"/);
  assert(!root.querySelector("div[data-page]"));
});
test("Selecting a party member opens native actions before Summary and preserves the party/list plugin region", () => {
  const { ui, doc, game } = fixture(),
    root = menuEventPort(doc);
  game.partyFieldMoveOptions = () => [
    {
      move: "fly",
      name: "飞空术",
      route: "fly",
      ok: false,
      reason: "徽章不足",
    },
  ];
  ui.showParty();
  root.querySelector('button[data-mon="0"]').click();
  assert.equal(ui.modalType, "party");
  assert.match(root.innerHTML, /data-party-action="summary"/);
  assert.match(root.innerHTML, /data-party-action="field:0"/);
  assert.match(root.innerHTML, /data-extension-slot="party.list"/);
  root.querySelector('button[data-party-action="summary"]').click();
  assert.equal(ui.modalType, "detail");
});

test("First field confirm and every menu confirm sound once; dialogue confirmation never doubles its cue", async () => {
  const { game, doc, ui, calls } = fixture();
  ui.confirm();
  assert.deepEqual(calls.slice(-2), ["emerald:confirm", "interact"]);
  const pending = ui.say("博士", ["你好。"], null, { mode: "instant" });
  const before = calls.filter((id) => id === "emerald:confirm").length;
  ui.confirm();
  await pending;
  assert.equal(
    calls.filter((id) => id === "emerald:confirm").length,
    before + 1,
  );
  const root = doc.getElementById("modal-root"),
    button = {
      disabled: false,
      click() {
        calls.push("activated");
      },
    };
  root.children = [{}];
  root.querySelector = () => button;
  ui.confirm();
  assert.deepEqual(calls.slice(-2), ["emerald:confirm", "activated"]);
  const target = { closest: () => button };
  root.onclick({ isTrusted: false, target });
  assert.equal(calls.at(-1), "activated");
  root.onclick({ isTrusted: true, target });
  assert.equal(calls.at(-1), "emerald:confirm");
  root.children = [];
  game.busy = true;
  const count = calls.length;
  ui.confirm();
  assert.equal(calls.length, count);
});
