export class SaveConflict extends Error {
  constructor() {
    super("Save changed in another session");
    this.code = "save_conflict";
  }
}
/** Storage is a port. Only the current envelope version is accepted. */
export class SaveStore {
  constructor(
    storage,
    key,
    validate,
    version = 1,
    { diagnose = () => null } = {},
  ) {
    Object.assign(this, {
      storage,
      key,
      validate,
      version,
      diagnose,
    });
  }
  acceptCurrent() {
    this.expectedRaw = this.storage.getItem(this.key) ?? null;
    this.baselineKnown = true;
  }
  raw() {
    return this.storage.getItem(this.key) ?? null;
  }
  save(state) {
    const current = this.raw();
    if (this.baselineKnown && current !== this.expectedRaw)
      throw new SaveConflict();
    const draft = structuredClone(state);
    if (!this.validate(draft)) {
      const error = new Error("Invalid state cannot be saved");
      error.code = "invalid_state";
      throw error;
    }
    const envelope = {
      version: this.version,
      savedAt: Date.now(),
      state: draft,
    };
    this.storage.setItem(this.key, JSON.stringify(envelope));
    this.acceptCurrent();
    return envelope.savedAt;
  }
  decode(input) {
    this.lastIssue = null;
    try {
      const envelope = structuredClone(
        typeof input === "string" ? JSON.parse(input) : input,
      );
      if (
        !Number.isInteger(envelope.version) ||
        envelope.version !== this.version
      ) {
        this.lastIssue = {
          code: "unsupported_version",
          version: envelope.version,
        };
        return null;
      }
      if (this.validate(envelope.state)) return envelope;
      this.lastIssue = this.diagnose(envelope.state) || {
        code: "invalid_state",
      };
      return null;
    } catch {
      this.lastIssue = { code: "invalid_state" };
      return null;
    }
  }
  load() {
    try {
      const raw = this.storage.getItem(this.key);
      if (!this.baselineKnown) {
        this.expectedRaw = raw ?? null;
        this.baselineKnown = true;
      }
      return raw ? this.decode(raw) : null;
    } catch {
      this.lastIssue = { code: "storage_unavailable" };
      return null;
    }
  }
}
