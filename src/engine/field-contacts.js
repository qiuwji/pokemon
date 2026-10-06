import { DIRECTIONS } from "./world.js";
import { readOnly } from "./extensions/values.js";
const pairKey = (a, b) => JSON.stringify([a.map, ...[a.id, b.id].sort()]);
const stamp = (a, b) =>
  JSON.stringify(
    [a, b]
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .map((e) => [e.id, e.map, e.x, e.y, e.elevation]),
  );
/** Ephemeral contact edges, not battle rules or persisted entity identities. */
export class FieldContacts {
  constructor(elevation) {
    this.elevation = elevation;
    this.sequence = 0;
    this.active = new Map();
    this.pending = [];
  }
  eligible(a, b, kind, direction) {
    if (
      !a ||
      !b ||
      a.id === b.id ||
      a.map !== b.map ||
      a.moving ||
      b.moving ||
      Math.abs(a.x - b.x) + Math.abs(a.y - b.y) !== 1 ||
      !this.elevation.compatible(a.elevation, b.elevation)
    )
      return false;
    if (kind === "bump") {
      const delta = DIRECTIONS[direction];
      return !!delta && a.x + delta[0] === b.x && a.y + delta[1] === b.y;
    }
    return kind === "request";
  }
  claim(a, b, { kind, direction, interaction = null }) {
    if (
      !["bump", "request"].includes(kind) ||
      (interaction !== null &&
        (typeof interaction !== "string" ||
          !interaction.length ||
          interaction.length > 128))
    )
      throw new Error("Invalid contact request");
    if (!this.eligible(a, b, kind, direction)) return false;
    const key = pairKey(a, b),
      fingerprint = stamp(a, b);
    if (this.active.get(key)?.stamp === fingerprint) return false;
    if (this.sequence >= Number.MAX_SAFE_INTEGER)
      throw new Error("Contact sequence overflow");
    const project = (e) => ({
      id: e.id,
      map: e.map,
      x: e.x,
      y: e.y,
      elevation: e.elevation,
    });
    const fact = readOnly({
      sequence: ++this.sequence,
      kind,
      direction: direction || a.dir,
      interaction,
      subject: project(a),
      target: project(b),
    });
    const entry = { stamp: fingerprint, fact, published: false };
    this.active.set(key, entry);
    this.pending.push({ key, entry });
    return true;
  }
  current(entry, lookup) {
    const f = entry.fact,
      a = lookup(f.subject),
      b = lookup(f.target);
    return (
      this.eligible(a, b, f.kind, f.direction) && stamp(a, b) === entry.stamp
    );
  }
  reconcile(lookup) {
    for (const [key, entry] of this.active)
      if (!this.current(entry, lookup)) this.active.delete(key);
  }
  next(lookup) {
    while (this.pending.length) {
      const { key, entry } = this.pending.shift();
      if (this.active.get(key) !== entry || !this.current(entry, lookup))
        continue;
      entry.published = true;
      return entry.fact;
    }
    return null;
  }
  take(lookup) {
    const facts = [];
    let fact;
    while ((fact = this.next(lookup))) facts.push(fact);
    return facts;
  }
  view(lookup) {
    return readOnly(
      [...this.active.values()]
        .filter((e) => e.published && this.current(e, lookup))
        .map((e) => e.fact),
    );
  }
}
