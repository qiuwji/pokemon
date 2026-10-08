import { isSourceInvisible } from "../../../packs/emerald/native-object-bindings.js";
import {
  AppearanceRegistry,
  AppearanceSelections,
} from "../../../engine/appearances.js";
import {
  emeraldAppearances,
  emeraldAppearanceResources,
  emeraldDefaultAppearance,
} from "../../../packs/emerald/appearance-definitions.js";
import { bindApplicationPorts } from "./ports.js";
import { readOnly } from "../../../engine/extensions/values.js";
export const APPEARANCE_PORTS = Object.freeze([
  "catalog",
  "db",
  "state",
  "worldState",
  "baseWorldObjects",
  "plugins",
  "save",
]);
/** Owns visual choices only; collision/motion and creatures remain in their respective domains. */
export class AppearanceApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, APPEARANCE_PORTS);
    this.appearanceRegistry = new AppearanceRegistry(
      this.catalog.appearances || emeraldAppearances(this.db),
      {
        actors: this.db.actors,
        resources: emeraldAppearanceResources(this.db),
      },
    );
  }
  validTarget(target) {
    return (
      target.kind === "player" ||
      (target.kind === "actor"
        ? Object.hasOwn(this.state.actors.records, target.uid)
        : Object.hasOwn(this.db.maps, target.map))
    );
  }
  known(target) {
    if (!this.validTarget(target)) return false;
    if (target.kind !== "object") return true;
    return (
      this.baseWorldObjects(target.map).some((n) => n.id === target.id) ||
      this.worldState.record(target.map).objects[target.id]?.spawn === true
    );
  }
  bind() {
    const sequence = this.selections?.sequence || 0;
    this.selections = new AppearanceSelections({
      registry: this.appearanceRegistry,
      state: this.state.appearances,
      validTarget: (t) => this.validTarget(t),
    });
    this.selections.sequence = sequence;
  }
  set({ target, appearance, data }) {
    if (!this.known(target))
      return { ok: false, reason: "找不到这个外观目标。" };
    const selection = this.selections.set(target, appearance, data);
    this.plugins?.events.emit("core:appearance-changed", selection);
    this.save();
    return readOnly({ ok: true, selection });
  }
  clear(target) {
    const cleared = this.selections.clear(target);
    if (cleared) {
      this.plugins?.events.emit("core:appearance-cleared", { target });
      this.save();
    }
    return cleared;
  }
  override({ target, appearance, data, priority = 0, scope = "visit" }) {
    if (!this.known(target))
      return { ok: false, reason: "找不到这个外观目标。" };
    const token = this.selections.override(target, appearance, data, {
      priority,
      scope,
      map: this.state.position.map,
    });
    this.plugins?.events.emit("core:appearance-overridden", { token, target });
    return { ok: true, token };
  }
  release(token) {
    const released = this.selections.release(token);
    if (released)
      this.plugins?.events.emit("core:appearance-released", { token });
    return released;
  }
  removedActor(uid) {
    this.selections?.forget({ kind: "actor", uid });
  }
  visit(map) {
    this.selections?.visit(map);
  }
  view() {
    return this.selections.view();
  }
  preview(appearance, data, context = {}) {
    return this.appearanceRegistry.resolve(
      this.appearanceRegistry.selection(appearance, data),
      context,
    );
  }
  frame(target, context) {
    let fallback;
    if (target.kind === "player")
      fallback = { appearance: this.catalog.movement?.[this.state.movement?.mode]?.presentation?.appearance || "emerald-player", data: {} };
    else if (target.kind === "actor") {
      const r = this.state.actors.records[target.uid],
        definition = r && this.catalog.actorTemplates[r.template];
      if (definition?.appearance)
        fallback = this.appearanceRegistry.selection(
          definition.appearance.id,
          definition.appearance.data,
        );
    }
    if (target.kind === "object") {
      if (isSourceInvisible(this.db,target.map,target.id)) context = { ...context,nativeInvisible:true };
    }
    const plot = target.kind === "object" && this.catalog.maps[target.map]?.elements?.find(o => o.id === target.id && o.kind === "berryPlot");
    if (plot) context = { ...context, berry: this.state.crops.trees[plot.plotId] || { stage:"empty" } };
    if (!fallback) fallback = emeraldDefaultAppearance(target, context);
    return this.selections.resolve(target, target.kind === "player" ? { ...context, gender: this.state.playerGender } : context, fallback);
  }
}
