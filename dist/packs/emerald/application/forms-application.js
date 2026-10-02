import {
  CreatureFormRegistry,
  CreatureForms,
} from "../../../engine/creatures/forms.js";
import { bindApplicationPorts } from "./ports.js";
export const FORMS_PORTS = Object.freeze([
  "catalog",
  "db",
  "plugins",
  "save",
  "state",
  "ui",
]);
/** forms use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class FormsApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, FORMS_PORTS);
  }
  restoreForm(uid) {
    const mon = this.state.party.find((m) => m.uid === uid);
    if (!mon) throw new Error("Unknown creature");
    const changed = this.forms.restore(mon);
    if (changed) {
      this.plugins?.events.emit("core:creature-form-changed", {
        uid,
        formId: null,
      });
      this.ui?.updateSide();
      this.save();
    }
    return { ok: changed };
  }
  changeForm(uid, id) {
    const mon = this.state.party.find((m) => m.uid === uid);
    if (
      !mon ||
      this.forms.registry.get(id).scope !== "world" ||
      !this.forms.activate(mon, id)
    )
      throw new Error("现在无法改变形态。");
    this.plugins?.events.emit("core:creature-form-changed", {
      uid,
      formId: id,
    });
    this.ui?.updateSide();
    this.save();
    return { ok: true };
  }
  bind() {
    this.state.forms ??= {};
    this.forms = new CreatureForms({
      registry: new CreatureFormRegistry(
        this.catalog.forms,
        this.db,
        this.catalog.abilities,
        this.catalog.heldItems,
      ),
      records: this.state.forms,
      creatures: () => [
        ...this.state.party,
        ...this.state.box,
        ...this.state.daycare.slots.map((s) => s.mon),
        ...(this.state.daycare.egg ? [this.state.daycare.egg] : []),
      ],
    });
  }
}
