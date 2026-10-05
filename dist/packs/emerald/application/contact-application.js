import { FieldContacts } from "../../../engine/field-contacts.js";
import { bindApplicationPorts } from "./ports.js";
export const CONTACT_PORTS = Object.freeze([
  "state",
  "field",
  "timeline",
  "plugins",
  "contactReady",
  "movement",
]);
/** Resolves authoritative entities; publishes only after an input or frame boundary. */
export class ContactApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, CONTACT_PORTS);
  }
  bind() {
    const sequence = this.contacts?.sequence || 0;
    this.contacts = new FieldContacts(this.field.world.elevation);
    this.contacts.sequence = sequence;
  }
  lookup({ id, map }) {
    if (id === 'player' && this.movement.registry.get(this.state.movement.mode).navigation.suppressInteractions)
      return null;
    const p = this.state.position,
      m = this.field.world.maps[map];
    if (!m) return null;
    if (id === "player")
      return p.map === map
        ? {
            ...p,
            id,
            moving: this.field.busy,
            elevation: this.field.world.elevation.level(p, m),
          }
        : null;
    const n = this.field.npcs.objects(map).find((n) => n.id === id);
    return n
      ? {
          id,
          map,
          x: n.x,
          y: n.y,
          dir: n.dir,
          elevation: this.field.world.elevation.level(n, m),
          moving: this.field.npcs.moving(n, this.timeline.now()),
        }
      : null;
  }
  bump(id) {
    const p = this.state.position,
      a = this.lookup({ id: "player", map: p.map }),
      b = this.lookup({ id, map: p.map });
    if (!b) return false;
    const map = this.field.world.map,
      cell = this.field.world.cell(b.x, b.y);
    if (
      !cell ||
      map.warps.some((w) => w.x === b.x && w.y === b.y) ||
      !this.field.traversal(this.state.movement.mode, {
        map,
        cell,
        warp: null,
        from: p,
        dir: p.dir,
      })
    )
      return false;
    return this.contacts.claim(a, b, { kind: "bump", direction: p.dir });
  }
  request(actor, target, interaction) {
    const a = this.lookup({ id: actor.uid, map: actor.map }),
      b = this.lookup({ id: target.uid, map: target.map });
    return this.contacts.claim(a, b, {
      kind: "request",
      direction: a?.dir,
      interaction,
    });
  }
  flush() {
    if (!this.contacts) return;
    const lookup = (e) => this.lookup(e);
    this.contacts.reconcile(lookup);
    if (!this.contactReady()) return;
    let fact;
    while (this.contactReady() && (fact = this.contacts.next(lookup)))
      this.plugins?.events.emit("core:field-contact", fact);
  }
  view() {
    return this.contacts ? this.contacts.view((e) => this.lookup(e)) : [];
  }
}
