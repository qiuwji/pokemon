import { qualified, validateSchema } from "./values.js";
export { validateLayout, resolveLayout } from "./layout-contracts.js";
export const UI_SLOTS = Object.freeze([
  "menu",
  "monster.detail",
  "monster.content",
  "bag.actions",
  "bag.content",
  "party.list",
  "party.actions",
  "party.content",
  "shop.actions",
  "shop.content",
  "battle.actions",
  "battle.moves",
  "battle.targets",
  "facility.actions",
  "facility.content",
]);
export const NATIVE_UI_SLOTS = Object.freeze(["party.list", "battle.actions", "battle.moves", "battle.targets"]);
export const THEME_TOKENS = Object.freeze({
  background: (v) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v),
  foreground: (v) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v),
  border: (v) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v),
  accent: (v) => typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v),
  fontSize: (v) => Number.isInteger(v) && v >= 8 && v <= 32,
  spacing: (v) => Number.isInteger(v) && v >= 0 && v <= 24,
  borderWidth: (v) => Number.isInteger(v) && v >= 1 && v <= 4,
  duration: (v) => Number.isInteger(v) && v >= 0 && v <= 1000,
});
/** Definitions are registered at startup; adapters own navigation, focus and rendering. */
export class PluginUIRegistry {
  constructor() {
    this.pages = new Map();
    this.entries = new Map();
    this.hud = new Map();
    this.themes = new Map();
    this.regions = new Map();
    this.components = new Map();
  }
  register(owner, kind, id, definition) {
    const key = qualified(owner, id),
      registry = this[kind];
    if (!registry || registry.has(key))
      throw new Error("Duplicate or unknown UI registration");
    if (kind === "themes") {
      if (
        !definition ||
        Object.keys(definition).some((k) => !THEME_TOKENS[k]?.(definition[k]))
      )
        throw new Error("Invalid theme tokens");
      registry.set(key, Object.freeze({ ...definition, id: key, owner }));
      return key;
    }
    if (kind === "components") {
      if (typeof definition.render !== "function")
        throw new Error("Invalid UI component");
      registry.set(
        key,
        Object.freeze({
          ...definition,
          schema: validateSchema(definition.schema),
          id: key,
          owner,
        }),
      );
      return key;
    }
    if (kind === "regions" && !UI_SLOTS.includes(definition.slot))
      throw new Error("Invalid UI definition: unknown region slot");
    if (kind === "regions" && (
      (definition.mode !== undefined && !["append", "replace", "hide"].includes(definition.mode)) ||
      ((definition.mode === "replace" || definition.mode === "hide") && !NATIVE_UI_SLOTS.includes(definition.slot))
    )) throw new Error("Invalid native UI region mode or slot");
    if (
      definition.priority !== undefined &&
      (!Number.isSafeInteger(definition.priority) ||
        Math.abs(definition.priority) > 1000)
    )
      throw new Error("Invalid UI priority");
    if (
      kind === "pages"
        ? typeof definition.render !== "function" || !definition.title
        : kind === "entries"
          ? !UI_SLOTS.includes(definition.slot) ||
            !definition.label ||
            !definition.page
          : !(kind === "regions" && definition.mode === "hide") && typeof definition.render !== "function"
    )
      throw new Error("Invalid UI definition");
    if (definition.when !== undefined && typeof definition.when !== "function")
      throw new Error("Invalid UI condition");
    registry.set(key, Object.freeze({ ...definition, id: key, owner }));
    return key;
  }
  validate() {
    for (const entry of this.entries.values())
      if (!this.pages.has(entry.page))
        throw new Error(`Missing plugin page ${entry.page}`);
  }
  inSlot(slot, kind = "entries") {
    if (!UI_SLOTS.includes(slot)) throw new Error("Unknown UI slot");
    return [...this[kind].values()]
      .filter((entry) => entry.slot === slot)
      .sort(
        (a, b) =>
          (a.priority || 0) - (b.priority || 0) ||
          (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
      );
  }
}
