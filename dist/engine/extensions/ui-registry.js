import { qualified, readOnly } from "./values.js";
export const UI_SLOTS = Object.freeze(["menu", "monster.detail"]);
/** Definitions are registered at startup; adapters own navigation, focus and rendering. */
export class PluginUIRegistry {
  constructor() {
    this.pages = new Map();
    this.entries = new Map();
    this.hud = new Map();
    this.themes = new Map();
  }
  register(owner, kind, id, definition) {
    const key = qualified(owner, id),
      registry = this[kind];
    if (!registry || registry.has(key))
      throw new Error("Duplicate or unknown UI registration");
    if (kind === "themes") {
      const keys = ["background", "foreground", "border", "accent"];
      if (
        Object.keys(definition).some((key) => !keys.includes(key)) ||
        Object.values(definition).some(
          (value) =>
            typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value),
        )
      )
        throw new Error("Invalid theme tokens");
      registry.set(key, Object.freeze({ ...definition, id: key, owner }));
      return key;
    }
    if (
      kind === "pages"
        ? typeof definition.render !== "function" || !definition.title
        : kind === "entries"
          ? !UI_SLOTS.includes(definition.slot) ||
            !definition.label ||
            !definition.page
          : typeof definition.render !== "function"
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
  inSlot(slot) {
    return [...this.entries.values()].filter((entry) => entry.slot === slot);
  }
}
const NODE_KINDS = [
  "text",
  "heading",
  "image",
  "button",
  "row",
  "grid",
  "panel",
  "meter",
  "select",
];
export function validateLayout(
  tree,
  { actions, resources, themes },
  depth = 0,
  count = { value: 0 },
) {
  if (
    !tree ||
    !NODE_KINDS.includes(tree.kind) ||
    ++count.value > 128 ||
    depth > 12
  )
    throw new Error("Invalid plugin layout");
  const allowed = [
    "kind",
    "text",
    "src",
    "alt",
    "action",
    "input",
    "disabled",
    "children",
    "value",
    "max",
    "options",
    "theme",
    "label",
  ];
  if (Object.keys(tree).some((key) => !allowed.includes(key)))
    throw new Error("Unknown layout property");
  for (const key of ["text", "alt", "label"])
    if (
      tree[key] !== undefined &&
      (typeof tree[key] !== "string" || tree[key].length > 4096)
    )
      throw new Error("Invalid layout text");
  if (
    (tree.action !== undefined || ["button", "select"].includes(tree.kind)) &&
    !actions.has(tree.action)
  )
    throw new Error("Unknown layout action");
  if (tree.kind === "image" && !Object.hasOwn(resources, tree.src))
    throw new Error("Unknown layout resource");
  if (
    tree.kind === "meter" &&
    (!Number.isFinite(tree.value) ||
      !Number.isFinite(tree.max) ||
      tree.max <= 0 ||
      tree.value < 0 ||
      tree.value > tree.max)
  )
    throw new Error("Invalid layout meter");
  if (tree.theme && !themes?.has(tree.theme))
    throw new Error("Unknown layout theme");
  if (tree.disabled !== undefined && typeof tree.disabled !== "boolean")
    throw new Error("Invalid layout availability");
  if (
    tree.options &&
    (!Array.isArray(tree.options) ||
      tree.options.length > 32 ||
      tree.options.some(
        (o) => typeof o.label !== "string" || typeof o.value !== "string",
      ))
  )
    throw new Error("Invalid select options");
  if (tree.children) {
    if (!Array.isArray(tree.children))
      throw new Error("Invalid layout children");
    for (const child of tree.children)
      validateLayout(child, { actions, resources, themes }, depth + 1, count);
  }
  return readOnly(tree);
}
