import { SaveConflict } from "../../../../engine/save-store.js";

const validId = id => typeof id === "string" && /^(legacy|save-[a-z0-9-]{1,80})$/.test(id);

/** Browser save catalogue. Each slot owns a separate, unchanged SaveStore envelope. */
export class SaveSlotRepository {
  constructor(storage, namespace, createStore, { makeId = () => "save-" + globalThis.crypto.randomUUID() } = {}) {
    Object.assign(this, { storage, namespace, createStore, makeId });
    this.catalogueKey = namespace + ":slots";
    this.prefix = namespace + ":slot:";
    this.lastIssue = null;
  }
  key(id) {
    if (!validId(id)) throw new Error("Invalid save slot");
    return id === "legacy" ? this.namespace : this.prefix + id;
  }
  directory() {
    const raw = this.storage.getItem(this.catalogueKey);
    const directory = raw === null ? { version: 1, active: "legacy", slots: ["legacy"] } : JSON.parse(raw);
    if (directory?.version !== 1 || !Array.isArray(directory.slots) ||
        !directory.slots.every(validId) || new Set(directory.slots).size !== directory.slots.length ||
        !validId(directory.active) || !directory.slots.includes(directory.active))
      throw new Error("Invalid save catalogue");
    // Separate tabs can append simultaneously. Stored slot keys remain discoverable
    // even if the catalogue's last writer did not see another tab's append.
    if (typeof this.storage.key === "function") for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i);
      if (key?.startsWith(this.prefix)) {
        const id = key.slice(this.prefix.length);
        if (validId(id) && !directory.slots.includes(id)) directory.slots.push(id);
      }
    }
    return directory;
  }
  initialStore() {
    let id = "legacy";
    try { id = this.directory().active; }
    catch { this.lastIssue = { code: "storage_unavailable" }; }
    return this.createStore(this.key(id));
  }
  view() {
    const directory = this.directory();
    let number = 0;
    return { active: directory.active, slots: directory.slots.flatMap(id => {
      const store = this.createStore(this.key(id)), raw = store.raw();
      if (raw === null) return [];
      // Preview may project content, but must not write a backup or accept a baseline.
      const document = store.decode(raw);
      return [{ id, number: ++number, raw, document, issue: store.lastIssue }];
    }) };
  }
  create(state) {
    const directory = this.directory();
    const id = this.makeId(), key = this.key(id);
    if (id === "legacy" || directory.slots.includes(id) || this.storage.getItem(key) !== null)
      throw new Error("Save slot already exists");
    const store = this.createStore(key);
    try {
      const savedAt = store.save(state);
      this.storage.setItem(this.catalogueKey, JSON.stringify({ ...directory, active: id, slots: [...directory.slots, id] }));
      return { store, savedAt };
    } catch (error) {
      this.storage.removeItem(key);
      throw error;
    }
  }
  open(id, expectedRaw) {
    const directory = this.directory();
    if (!directory.slots.includes(id)) throw new Error("Unknown save slot");
    const store = this.createStore(this.key(id));
    if (store.raw() !== expectedRaw) throw new SaveConflict();
    const document = store.load();
    if (!document) throw new Error("Invalid save");
    if (store.raw() !== expectedRaw) throw new SaveConflict();
    this.storage.setItem(this.catalogueKey, JSON.stringify({ ...directory, active: id }));
    return { store, document };
  }
}
