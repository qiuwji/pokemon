import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { SaveSlotRepository } from "../src/game/emerald/assembly/save/slot-repository.js";
import { SaveStore } from "../src/engine/save-store.js";
import { createEmeraldCommandFacade } from "../src/game/emerald/commands/command-facade.js";

function memory() {
  const data = new Map();
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value),
    removeItem: key => data.delete(key), key: index => [...data.keys()][index] ?? null, get length() { return data.size; } };
}
function repository(storage) {
  let number = 0;
  return new SaveSlotRepository(storage, "fixture", key => new SaveStore(storage, key, state => Number.isInteger(state.value)),
    { makeId: () => "save-" + ++number });
}

test("New-game command creates an independent slot; selecting legacy/new slots isolates all later saves", async () => {
  const s = session(), { game } = s, ui = createEmeraldCommandFacade(game, s.bus);
  game.state.playerName = "旧冒险"; assert(game.save());
  const legacyKey = game.saveStore.key, legacyRaw = game.saveStore.raw();
  assert(await ui.reset());
  const newKey = game.saveStore.key;
  assert.notEqual(newKey, legacyKey); assert.equal(s.saved.get(legacyKey), legacyRaw);
  game.state.playerName = "新冒险"; game.state.money = 4242; assert(game.save());
  const newRaw = game.saveStore.raw(), preview = game.saveSlotView();
  assert.equal(preview.slots.length, 2); assert(Object.isFrozen(preview.slots[0].document.state));
  assert.throws(() => { preview.slots[0].document.state.money = 99; }, TypeError);
  const old = preview.slots.find(slot => slot.id === "legacy");
  assert(await ui.loadSaveSlot(old.id, old.raw)); assert.equal(game.state.playerName, "旧冒险");
  game.state.money = 1234; assert(game.save()); assert.equal(s.saved.get(newKey), newRaw);
  const next = game.saveSlotView().slots.find(slot => slot.id !== "legacy");
  assert(await ui.loadSaveSlot(next.id, next.raw)); assert.equal(game.state.money, 4242);
  assert.equal(game.state.playerName, "新冒险");
  const restored = session([], { fresh: true, storage: game.applications.save.storage });
  assert.equal(restored.game.saveStore.key, newKey); assert.equal(restored.game.state.playerName, "新冒险");
});

test("Quota failure while creating a slot preserves the active world, old envelope and catalogue", () => {
  const s = session(), { game } = s;
  assert(game.save());
  const before = new Map(s.saved), state = game.state, key = game.saveStore.key, position = structuredClone(game.world.position);
  const storage = game.applications.save.storage, set = storage.setItem;
  storage.setItem = (id, raw) => { if (id.endsWith(":slots")) throw new Error("Quota exceeded"); set(id, raw); };
  assert.throws(() => game.reset(), /Quota/);
  assert.deepEqual(s.saved, before); assert.equal(game.state, state); assert.equal(game.saveStore.key, key);
  assert.deepEqual(game.world.position, position);
});

test("Slots retain same-slot conflict protection and reject a changed preview without switching", () => {
  const storage = memory(), slots = repository(storage);
  const { store } = slots.create({ value: 1 }), id = slots.view().active, raw = store.raw();
  const other = new SaveStore(storage, store.key, () => true); other.load();
  store.save({ value: 2 });
  assert.throws(() => other.save({ value: 3 }), error => error.code === "save_conflict");
  const { store: next } = slots.create({ value: 4 }), active = slots.view().active;
  assert.throws(() => slots.open(id, raw), error => error.code === "save_conflict");
  assert.equal(slots.view().active, active); assert.equal(next.load().state.value, 4);
});

test("Read-only slot previews keep invalid saves and discover another tab's independent append", () => {
  const storage = memory(), slots = repository(storage);
  slots.create({ value: 1 }); const stale = storage.getItem("fixture:slots");
  const { store } = slots.create({ value: 2 }); storage.setItem("fixture:slots", stale);
  storage.setItem("fixture", "malformed original save");
  const before = new Map(storage.data), view = slots.view();
  assert.equal(view.slots.length, 3); assert.equal(view.slots[0].document, null);
  assert.deepEqual(storage.data, before);
  assert.equal(slots.open(view.slots[2].id, store.raw()).document.state.value, 2);
});

test("Invalid selected saves and failed catalogue activation cannot replace the current slot", () => {
  const storage = memory(), slots = repository(storage);
  const first = slots.create({ value: 1 }), id = slots.view().active;
  slots.create({ value: 2 }); const before = storage.getItem("fixture:slots");
  const validRaw = first.store.raw(); storage.setItem(first.store.key, "bad");
  assert.throws(() => slots.open(id, "bad"), /Invalid save/); assert.equal(storage.getItem("fixture:slots"), before);
  storage.setItem(first.store.key, validRaw);
  const set = storage.setItem; storage.setItem = (key, value) => { if (key.endsWith(":slots")) throw new Error("Unavailable"); set(key, value); };
  assert.throws(() => slots.open(id, validRaw), /Unavailable/); assert.equal(storage.getItem("fixture:slots"), before);
});

test("Corrupt catalogue protects autosave and cannot be reset over existing slot data", () => {
  const storage = memory(); storage.setItem("emerald-web", "irrelevant");
  const s = session([], { storage, fresh: true }); assert(s.game.save());
  const namespace = s.game.saveStore.key;
  storage.setItem(namespace + ":slots", "corrupt catalogue"); const before = new Map(storage.data);
  const restored = session([], { storage, fresh: true });
  assert(restored.game.saveProtected); assert.equal(restored.game.save(), false);
  assert.throws(() => restored.game.reset()); assert.deepEqual(storage.data, before);
});
