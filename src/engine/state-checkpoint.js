/** Identity-preserving rollback for a session's JSON state graph. Runtime services are not captured. */
export class StateCheckpoint {
  constructor(root, random = null) {
    this.random = random;
    this.seed = random?.snapshot();
    this.records = new Map();
    const visit = (value) => {
      if (!value || typeof value !== "object" || this.records.has(value))
        return;
      if (
        !Array.isArray(value) &&
        Object.getPrototypeOf(value) !== Object.prototype &&
        Object.getPrototypeOf(value) !== null
      )
        throw new Error("Checkpoint accepts plain session state only");
      const fields = new Map(Object.entries(value));
      this.records.set(value, {
        fields,
        length: Array.isArray(value) ? value.length : null,
      });
      for (const child of fields.values()) visit(child);
    };
    visit(root);
  }
  restore() {
    for (const [object, { fields, length }] of this.records) {
      for (const key of Object.keys(object))
        if (!fields.has(key)) delete object[key];
      for (const [key, value] of fields) object[key] = value;
      if (length !== null) object.length = length;
    }
    if (this.random) this.random.restore(this.seed);
  }
}
