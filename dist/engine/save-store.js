/** Storage is a port, not global localStorage. Migration runs before validation. */
export class SaveStore {
  constructor(storage, key, validate, version = 1, { migrations = {} } = {}) {
    Object.assign(this, { storage, key, validate, version, migrations });
  }
  save(state) {
    const envelope = { version: this.version, savedAt: Date.now(), state };
    this.storage.setItem(this.key, JSON.stringify(envelope));
    return envelope.savedAt;
  }
  decode(input) {
    try {
      const envelope = structuredClone(
        typeof input === "string" ? JSON.parse(input) : input,
      );
      if (
        !Number.isInteger(envelope.version) ||
        envelope.version > this.version
      )
        return null;
      while (envelope.version < this.version) {
        const migrate = this.migrations[envelope.version];
        if (!migrate) return null;
        envelope.state = migrate(envelope.state);
        envelope.version++;
      }
      return this.validate(envelope.state) ? envelope : null;
    } catch {
      return null;
    }
  }
  load() {
    try {
      const raw = this.storage.getItem(this.key);
      return raw ? this.decode(raw) : null;
    } catch {
      return null;
    }
  }
}
