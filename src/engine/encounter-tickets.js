import { readOnly } from "./extensions/values.js";
import { validCreatureValues } from "./creature-contract.js";
export const emptyEncounterTickets = () => ({ sequence: 0, records: {} });
const exact = (o, keys) =>
  o &&
  typeof o === "object" &&
  !Array.isArray(o) &&
  Object.keys(o).every((k) => keys.includes(k));
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
/** Single custody for prepared wild individuals. Claims are session-local; saves contain ready records only. */
export class EncounterTickets {
  constructor({ state = emptyEncounterTickets(), maps, actors, owned }) {
    Object.assign(this, { state, maps, actors, owned });
    this.claims = new Set();
    this.validate();
  }
  validate() {
    const s = readOnly(this.state),
      identities = new Set(this.owned().map((m) => m.uid)),
      actors = new Set();
    if (
      !exact(s, ["sequence", "records"]) ||
      !integer(s.sequence) ||
      !exact(s.records, Object.keys(s.records || {})) ||
      Object.keys(s.records).length > 256
    )
      throw new Error("Invalid encounter tickets");
    for (const [id, t] of Object.entries(s.records)) {
      const serial = /^core:encounter\.([1-9]\d*)$/.exec(id);
      if (
        !serial ||
        !integer(Number(serial[1])) ||
        Number(serial[1]) > s.sequence ||
        !exact(t, ["actor", "map", "area", "table", "monster"]) ||
        !this.maps[t.map] ||
        !this.actors()[t.actor] ||
        actors.has(t.actor) ||
        !["land", "water", "fishing", "rock"].includes(t.area) ||
        (t.table !== null && typeof t.table !== "string") ||
        !validCreatureValues(t.monster) ||
        identities.has(t.monster.uid) ||
        t.monster.egg
      )
        throw new Error("Invalid encounter ticket record");
      identities.add(t.monster.uid);
      actors.add(t.actor);
    }
  }
  forActor(uid) {
    return (
      Object.keys(this.state.records).find(
        (id) => this.state.records[id].actor === uid,
      ) || null
    );
  }
  issue(record) {
    if (
      Object.keys(this.state.records).length >= 256 ||
      !integer(this.state.sequence + 1)
    )
      throw new Error("Encounter ticket capacity exceeded");
    if (this.forActor(record.actor))
      throw new Error("Actor already has an encounter ticket");
    const id = `core:encounter.${this.state.sequence + 1}`,
      draft = {
        sequence: this.state.sequence + 1,
        records: { ...this.state.records, [id]: record },
      };
    new EncounterTickets({ ...this, state: draft });
    this.state.sequence++;
    this.state.records[id] = record;
    return this.view(id);
  }
  record(id) {
    const t = this.state.records[id];
    if (!t) throw new Error("Unknown encounter ticket");
    return t;
  }
  view(id) {
    const t = this.record(id);
    return readOnly({
      id,
      actor: t.actor,
      map: t.map,
      area: t.area,
      table: t.table,
      species: t.monster.species,
      level: t.monster.level,
      claimed: this.claims.has(id),
    });
  }
  list() {
    return readOnly(Object.keys(this.state.records).map((id) => this.view(id)));
  }
  claim(id) {
    this.record(id);
    if (this.claims.has(id)) return false;
    this.claims.add(id);
    return true;
  }
  unclaim(id) {
    this.claims.delete(id);
  }
  release(id) {
    if (!Object.hasOwn(this.state.records, id)) return false;
    delete this.state.records[id];
    this.claims.delete(id);
    return true;
  }
}
