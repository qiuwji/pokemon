import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { session } from "./helpers/session.js";
import { layoutDocument } from "./helpers/layout-document.js";
import { createEmeraldCommandFacade } from "../src/game/emerald/commands/command-facade.js";
import { createLaunchInterface } from "../src/ui/emerald/launch-interface.js";
import { createLaunchMenuView } from "../src/ui/emerald/launch-menu-view.js";
import { emeraldLaunchMenu } from "../src/packs/emerald/launch-menu.js";
import { emeraldMovieClip, EMERALD_MOVIE_CHAPTERS } from "../src/packs/emerald/launch-movie.js";
import { emeraldTitleClip } from "../src/packs/emerald/title-presentation.js";
import { validateFrameSequence } from "../src/engine/extensions/frame-sequence-contracts.js";

const turn = () => new Promise(resolve => setImmediate(resolve));
function documentPort() {
  const doc = layoutDocument(), create = doc.createElement;
  doc.createElement = tag => {
    const node = create(tag);
    node.remove = () => {};
    node.click = () => node.onclick?.();
    node.focus = () => { doc.activeElement = node; node.onfocus?.(); };
    return node;
  };
  return doc;
}
function fixture({ saved = false, reduced = false } = {}) {
  const s = session([], { fresh: true }), { game } = s;
  game.state.flags = {}; game.state.party = [];
  if (saved) { game.state.playerName = "小秋"; game.state.flags.playerConfigured = true; game.save(); }
  const doc = documentPort(), root = doc.getElementById("root"), resources = new Set(), players = [], music = [];
  let holds = 0, policy, optionsBack, optionCount = 0, now = 0;
  const closeModal = () => { for (const dispose of [...resources]) { resources.delete(dispose); dispose(); } root.replaceChildren(); };
  Object.defineProperties(game.ui, { blocked: { configurable: true, get: () => holds > 0 || root.children.length > 0 }, saveBlocked: { get: () => holds > 0 } });
  const ui = createLaunchInterface(createEmeraldCommandFacade(game, s.bus), {
    document: doc, root, closeModal, sound: () => {}, reducedMotion: () => reduced, titleFrames: 6000,
    frameClock: { now: () => now },
    holdInteraction: () => { holds++; return () => holds--; },
    ownModalResource: dispose => resources.add(dispose),
    modal(_title, _body, p) {
      closeModal(); policy = p;
      const host = doc.createElement("div"); host.setAttribute("data-launch-host", ""); root.append(host);
    },
    frameScene() {
      let pending, disposed = false;
      const player = { canvas: doc.createElement("canvas"),
        play(clip) { assert(!disposed); return new Promise((resolve, reject) => { pending = { resolve, reject, clip }; }); },
        dispose() { disposed = true; pending?.reject(new Error("Scene disposed")); },
        complete: () => { if (pending) { now += pending.clip.frames.length * 1000 / 60; pending.resolve(); } }, get pending() { return pending; },
      };
      players.push(player); return player;
    },
    setLaunchMusic: id => music.push(id),
    showOptions(_selected, back, p) { assert.equal(p.extras, false); optionsBack = back; optionCount++; },
  });
  return { ...s, doc, root, ui, players, music, get policy() { return policy; }, get holds() { return holds; },
    get optionCount() { return optionCount; }, backOptions: () => optionsBack(),
    press: () => doc.activeElement.click(),
    async menu() {
      players.at(-1).complete(); await turn(); // Copyright ends.
      if (!reduced) { this.press(); await turn(); this.press(); await turn(); } // Movie and logo arrival.
      this.press(); await turn(); // Title idle -> fade -> menu.
      players.at(-1).complete(); await turn();
      assert.equal(this.policy.type, "launch-menu");
    },
  };
}

test("Launch preserves the saved single slot, blocks auto-save/story, then Continue commits through the bus", async () => {
  const s = fixture({ saved: true }), raw = s.game.saveStore.raw(), playing = s.ui.showLaunch();
  assert.equal(s.holds, 1); assert.equal(s.game.save(), false);
  await s.game.flushStoryQueue(); assert.equal(s.game.storyBusy, false);
  assert.equal(s.game.saveStore.raw(), raw);
  await s.menu();
  const buttons = s.root.querySelectorAll("button");
  assert.deepEqual(buttons.map(b => b.getAttribute("data-launch-action")), ["continue", "new", "options"]);
  s.policy.navigate("up"); assert.equal(s.doc.activeElement, buttons[0]);
  s.press(); s.press(); await turn(); // Repeated input cannot submit the old screen twice.
  assert.equal(s.holds, 1); s.players.at(-1).complete();
  assert.equal(await playing, "continue"); assert.equal(s.holds, 0);
  assert.equal(s.game.state.playerName, "小秋"); assert.equal(s.game.saveStore.raw(), raw);
});

test("No-save startup offers native New/Options, returns from Options, and resets only after black fade", async () => {
  const s = fixture({ reduced: true }), playing = s.ui.showLaunch();
  await s.menu();
  assert.deepEqual(s.root.querySelectorAll("button").map(b => b.getAttribute("data-launch-action")), ["new", "options"]);
  s.policy.navigate("down"); s.press(); await turn(); assert.equal(s.optionCount, 1);
  s.backOptions(); await turn(); assert.equal(s.doc.activeElement.getAttribute("data-launch-action"), "options");
  s.policy.navigate("up"); s.press(); await turn();
  assert.equal(s.game.saveStore.raw(), null); assert.equal(s.holds, 1);
  s.players.at(-1).complete(); assert.equal(await playing, "new");
  assert.equal(s.game.state.flags.playerConfigured, undefined); assert.equal(s.holds, 0);
});

test("Back returns to the title; disposing startup rejects its wait and releases all temporary input ownership", async () => {
  const s = fixture(), playing = s.ui.showLaunch();
  await s.menu(); s.policy.back(); await turn();
  assert.equal(s.policy.type, "launch-animation");
  s.ui.disposeLaunch(); await assert.rejects(playing, /Launch disposed/);
  assert.equal(s.holds, 0); assert.equal(s.root.children.length, 0);
  assert.equal(s.game.saveStore.raw(), null);
});

test("Continue projects original conditional regional dex, badge and time fields, with bounded navigation", () => {
  const s = session(), state = s.game.state;
  state.playerName = "字".repeat(16); state.playSeconds = 3723; state.flags.pokedex = true; state.flags.badgeStone = true;
  state.caught = ["mudkip", "mudkip", "dragonite"];
  const saved = { state }, entries = emeraldLaunchMenu(saved, s.db.species);
  assert.deepEqual(entries.map(e => [e.top, e.height]), [[0,64],[64,32],[96,32]]);
  assert.equal(entries[0].summary.dex, 1); assert.equal(entries[0].summary.badges, 1); assert.equal(entries[0].summary.time, "1:02");
  state.flags.pokedex = false; assert.equal(emeraldLaunchMenu(saved, s.db.species)[0].summary.dex, null);
  const doc = documentPort(), root = doc.getElementById("root"), view = createLaunchMenuView({ document: doc, container: root, saved, species: s.db.species, onSelect() {} });
  for (let i=0;i<5;i++) view.navigate("down");
  assert.equal(doc.activeElement.getAttribute("data-launch-action"), "options"); view.dispose();
});

test("Every title/movie frame references a real bounded sheet; arbitrary chunks retain the same source frame", () => {
  const s = session(), sizes = new Map();
  const check = clip => {
    validateFrameSequence(clip, { resources: s.db.resources, event: { combatants: [] } });
    for (const frame of clip.frames) for (const sprite of frame.sprites) {
      if (!sizes.has(sprite.resource)) { const png = readFileSync(s.db.resources[sprite.resource]); sizes.set(sprite.resource,[png.readUInt32BE(16),png.readUInt32BE(20)]); }
      const [width,height] = sizes.get(sprite.resource);
      assert(sprite.width<=width && ((sprite.tileFrame||0)+1)*sprite.height<=height,sprite.resource);
    }
  };
  for (const id of ["copyright","arrival","idle","exit","fade-white","fade-black"]) check(emeraldTitleClip(id));
  for (const gender of ["male","female"]) for (const part of EMERALD_MOVIE_CHAPTERS) {
    for (let i=0;i<part.frames;i+=240) check(emeraldMovieClip(part.id,i,240,{gender}));
    assert.deepEqual(emeraldMovieClip(part.id,16,1,{gender}).frames[0],emeraldMovieClip(part.id,0,17,{gender}).frames[16]);
  }
});

test("Startup selects an older independent slot through the command bus and preserves the newer envelope", async () => {
  const s = fixture({ saved: true, reduced: true }), legacyRaw = s.game.saveStore.raw();
  assert(s.game.reset()); s.game.state.playerName = "新冒险"; assert(s.game.save());
  const newKey = s.game.saveStore.key, newRaw = s.game.saveStore.raw(), playing = s.ui.showLaunch();
  await s.menu();
  assert.deepEqual(s.root.querySelectorAll("button").map(b => b.getAttribute("data-launch-action")), ["continue", "continue", "new", "options"]);
  const cards = s.root.querySelectorAll("[data-save-slot]");
  assert.equal(cards.length, 2);
  assert.equal(s.doc.activeElement, cards[1]); // Last active save, directly on the main menu.
  assert.equal(cards[0].querySelector(".launch-save-value").textContent, "小秋");
  assert.equal(cards[1].querySelector(".launch-save-value").textContent, "新冒险");
  cards[0].click(); await turn();
  assert.equal(s.policy.type, "launch-menu"); // No child page is opened before the fade.
  assert.equal(s.game.saveStore.key, newKey);
  s.players.at(-1).complete(); assert.equal(await playing, "continue");
  assert.equal(s.game.state.playerName, "小秋"); assert.equal(s.game.saveStore.raw(), legacyRaw);
  assert.equal(s.saved.get(newKey), newRaw); assert.equal(s.holds, 0);
});

test("Browsing main-menu saves and returning from Options changes no saved data; New starts a third adventure", async () => {
  const s = fixture({ saved: true, reduced: true }); assert(s.game.reset());
  const before = new Map(s.saved), playing = s.ui.showLaunch(); await s.menu();
  s.policy.navigate("up"); assert.equal(s.doc.activeElement.getAttribute("data-save-slot"), "legacy");
  assert.deepEqual(s.saved, before);
  for (let i = 0; i < 3; i++) s.policy.navigate("down"); s.press(); await turn();
  s.backOptions(); await turn(); assert.equal(s.policy.type, "launch-menu"); assert.deepEqual(s.saved, before);
  s.policy.navigate("up"); s.press(); await turn();
  s.players.at(-1).complete(); assert.equal(await playing, "new");
  for (const [key, raw] of before) if (!key.endsWith(":slots")) assert.equal(s.saved.get(key), raw);
  assert.equal(s.game.saveSlotView().slots.length, 3);
});

test("All save summaries belong to the main menu; navigation is bounded and invalid saves cannot load", () => {
  const s = session(), doc = documentPort(), root = doc.getElementById("root"), picked = [], scrolled = [];
  const create = doc.createElement;
  doc.createElement = tag => { const node = create(tag); node.scrollIntoView = () => scrolled.push(node); return node; };
  const slots = Array.from({ length: 5 }, (_, i) => ({ id: "save-" + i, number: i + 1,
    document: i === 0 ? null : { ...s.game.exportDocument(), state: { ...s.game.state, playerName: `玩家${i}`, playSeconds: i * 3600 } } }));
  const view = createLaunchMenuView({ document: doc, container: root, slots, selected: "continue:save-4", species: s.db.species,
    onSelect: (id, slot) => picked.push(slot?.id ?? id) });
  const cards = root.querySelectorAll("[data-save-slot]");
  assert.equal(cards.length, 5);
  assert.equal(doc.activeElement, cards[4]); assert.equal(scrolled.at(-1), cards[4]);
  for (const [i, card] of cards.entries()) {
    if (i === 0) { assert.equal(card.getAttribute("aria-disabled"), "true"); continue; }
    assert.deepEqual(card.querySelectorAll(".launch-save-value").map(node => node.textContent), [`玩家${i}`, `${i}:00`, "0"]);
  }
  for (let i = 0; i < 10; i++) view.navigate("up");
  assert.equal(doc.activeElement, cards[0]); doc.activeElement.click(); assert.deepEqual(picked, []);
  view.navigate("down"); const button = doc.activeElement; button.click(); assert.deepEqual(picked, ["save-1"]);
  for (let i = 0; i < 10; i++) view.navigate("down");
  assert.equal(doc.activeElement.getAttribute("data-launch-action"), "options");
  view.dispose(); button.click(); assert.deepEqual(picked, ["save-1"]); assert.equal(view.navigate("up"), false);
});

test("A save changed after its main-menu preview is rejected and the refreshed card requires a new selection", async () => {
  const s = fixture({ saved: true, reduced: true }), playing = s.ui.showLaunch();
  await s.menu(); const oldRaw = s.game.saveStore.raw(); s.press(); await turn();
  const external = JSON.parse(oldRaw); external.state.playerName = "另页保存";
  s.game.applications.save.storage.setItem(s.game.saveStore.key, JSON.stringify(external));
  s.players.at(-1).complete(); await turn();
  assert.equal(s.policy.type, "launch-menu"); assert.equal(s.game.state.playerName, "小秋"); assert.equal(s.holds, 1);
  assert.equal(s.root.querySelector(".launch-save-value").textContent, "另页保存");
  s.press(); await turn(); s.players.at(-1).complete(); assert.equal(await playing, "continue");
  assert.equal(s.game.state.playerName, "另页保存"); assert.equal(s.holds, 0);
});

test("Failed startup slot creation returns to the menu with old progress and input ownership intact", async () => {
  const s = fixture({ saved: true, reduced: true }), before = new Map(s.saved), playing = s.ui.showLaunch();
  const storage = s.game.applications.save.storage, set = storage.setItem;
  storage.setItem = (key, raw) => { if (key.endsWith(":slots")) throw new Error("Quota"); set(key, raw); };
  await s.menu(); s.policy.navigate("down"); s.press(); await turn(); s.players.at(-1).complete(); await turn();
  assert.equal(s.policy.type, "launch-menu"); assert.deepEqual(s.saved, before); assert.equal(s.game.state.playerName, "小秋");
  assert.equal(s.holds, 1); s.ui.disposeLaunch(); await assert.rejects(playing, /Launch disposed/); assert.equal(s.holds, 0);
});
