import { readOnly, jsonValue, validateValue, freeze } from "./values.js";
import { presentationPayload } from "./presentation-contracts.js";
const exact = (v, keys) =>
  v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.keys(v).every((k) => keys.includes(k));
const bounded = (v, min, max) => Number.isInteger(v) && v >= min && v <= max;
const identifier = (v) =>
  typeof v === "string" &&
  /^[a-zA-Z][\w-]{0,63}$/.test(v) &&
  !["constructor", "prototype"].includes(v);
const text = (v) => typeof v === "string" && v.length <= 4096;
const options = (v) =>
  Array.isArray(v) &&
  v.length > 0 &&
  v.length <= 32 &&
  v.every(
    (o) =>
      exact(o, ["label", "value"]) &&
      text(o.label) &&
      typeof o.value === "string",
  ) &&
  new Set(v.map((o) => o.value)).size === v.length;
const range = (t) =>
  Number.isFinite(t.min ?? 0) &&
  Number.isFinite(t.max) &&
  t.max > (t.min ?? 0) &&
  Number.isFinite(t.value) &&
  t.value >= (t.min ?? 0) &&
  t.value <= t.max &&
  (t.step === undefined || (Number.isFinite(t.step) && t.step > 0));
const containers = new Set(["row", "grid", "panel", "list", "tabs", "form"]);
export const LAYOUT_FIELDS = Object.freeze([
  "input",
  "checkbox",
  "radio",
  "slider",
  "select",
]);
/** Primitive contracts and adapter factories share these names. Components expand into these primitives. */
export const LAYOUT_NODES = freeze({
  text: { keys: [] },
  heading: { keys: [] },
  image: {
    keys: ["src", "alt", "action", "input", "disabled"],
    valid: (t, c) => Object.hasOwn(c.resources, t.src),
    error: "Unknown layout resource",
  },
  canvas: {
    keys: [
      "width",
      "height",
      "visual",
      "payload",
      "alt",
      "action",
      "input",
      "disabled",
    ],
    valid: (t) =>
      bounded(t.width, 1, 512) &&
      bounded(t.height, 1, 512) &&
      typeof t.alt === "string" &&
      t.alt.trim().length > 0,
    error: "Invalid layout Canvas dimensions or accessible name",
  },
  button: {
    keys: ["action", "input", "disabled", "submit"],
    valid: (t) => t.submit === undefined || typeof t.submit === "boolean",
  },
  row: { keys: ["children"] },
  grid: { keys: ["children"] },
  panel: { keys: ["children"] },
  list: { keys: ["children"] },
  divider: { keys: [] },
  meter: {
    keys: ["value", "max"],
    valid: (t) =>
      Number.isFinite(t.value) &&
      Number.isFinite(t.max) &&
      t.max > 0 &&
      t.value >= 0 &&
      t.value <= t.max,
    error: "Invalid layout meter",
  },
  input: {
    keys: [
      "name",
      "value",
      "placeholder",
      "maxLength",
      "action",
      "input",
      "disabled",
    ],
    valid: (t) =>
      typeof t.value === "string" &&
      t.value.length <= (t.maxLength ?? 256) &&
      (t.maxLength === undefined || bounded(t.maxLength, 1, 1024)) &&
      (t.placeholder === undefined || text(t.placeholder)),
  },
  checkbox: {
    keys: ["name", "value", "action", "input", "disabled"],
    valid: (t) => typeof t.value === "boolean",
  },
  radio: {
    keys: ["name", "value", "options", "action", "input", "disabled"],
    valid: (t) =>
      options(t.options) && t.options.some((o) => o.value === t.value),
  },
  select: {
    keys: ["name", "value", "options", "action", "input", "disabled"],
    valid: (t) =>
      options(t.options) &&
      (t.value === undefined || t.options.some((o) => o.value === t.value)),
    error: "Invalid select options",
  },
  slider: {
    keys: [
      "name",
      "value",
      "min",
      "max",
      "step",
      "action",
      "input",
      "disabled",
    ],
    valid: range,
  },
  tabs: {
    keys: ["value", "children"],
    valid: (t) =>
      Array.isArray(t.children) &&
      t.children.length > 0 &&
      t.children.length <= 16 &&
      t.children.every(
        (n) => identifier(n.key) && typeof n.label === "string",
      ) &&
      new Set(t.children.map((n) => n.key)).size === t.children.length &&
      t.children.some((n) => n.key === t.value),
  },
  table: {
    keys: ["columns", "rows"],
    valid: (t) =>
      Array.isArray(t.columns) &&
      t.columns.length > 0 &&
      t.columns.length <= 8 &&
      t.columns.every(text) &&
      Array.isArray(t.rows) &&
      t.rows.length <= 64 &&
      t.rows.every(
        (r) =>
          Array.isArray(r) &&
          r.length === t.columns.length &&
          r.every(
            (v) => text(v) || (typeof v === "number" && Number.isFinite(v)),
          ),
      ),
  },
  form: { keys: ["action", "input", "children", "disabled"] },
  component: {
    keys: ["component", "props"],
    valid: (t, c) => c.components?.has(t.component),
    error: "Unknown layout component",
  },
});
const COMMON = ["kind", "key", "text", "label", "theme", "style"];
export function validateLayoutStyle(style) {
  if (
    !exact(style, [
      "gap",
      "padding",
      "columns",
      "align",
      "justify",
      "width",
      "fontSize",
    ]) ||
    Object.entries(style).some(
      ([k, v]) =>
        ({
          gap: () => bounded(v, 0, 32),
          padding: () => bounded(v, 0, 32),
          columns: () => bounded(v, 1, 8),
          align: () => ["start", "center", "end", "stretch"].includes(v),
          justify: () => ["start", "center", "end", "between"].includes(v),
          width: () => ["auto", "full"].includes(v),
          fontSize: () => bounded(v, 8, 32),
        })[k]() === false,
    )
  )
    throw new Error("Invalid layout style");
}
/** Pure validation, including form boundaries and total expanded-tree budgets. No browser dependency. */
export function validateLayout(
  tree,
  contract,
  depth = 0,
  count = { value: 0 },
  form = null,
) {
  const descriptor = LAYOUT_NODES[tree?.kind];
  if (
    !descriptor ||
    !exact(tree, [...COMMON, ...descriptor.keys]) ||
    ++count.value > 128 ||
    depth > 12
  )
    throw new Error("Invalid plugin layout or unknown layout property");
  for (const key of ["text", "label", "alt"])
    if (tree[key] !== undefined && !text(tree[key]))
      throw new Error("Invalid layout text");
  if (tree.key !== undefined) {
    if (!identifier(tree.key) || (count.keys ||= new Set()).has(tree.key))
      throw new Error("Invalid or duplicate layout key");
    count.keys.add(tree.key);
  }
  if (tree.name !== undefined && !identifier(tree.name))
    throw new Error("Invalid layout field name");
  if (tree.disabled !== undefined && typeof tree.disabled !== "boolean")
    throw new Error("Invalid layout availability");
  if (tree.theme !== undefined && !contract.themes?.has(tree.theme))
    throw new Error("Unknown layout theme");
  if (tree.style !== undefined) validateLayoutStyle(tree.style);
  if (tree.input !== undefined) {
    if (
      !tree.input ||
      typeof tree.input !== "object" ||
      Array.isArray(tree.input)
    )
      throw new Error("Invalid layout input");
    jsonValue(tree.input);
  }
  if (tree.action !== undefined && !contract.actions.has(tree.action))
    throw new Error("Unknown layout action");
  if (descriptor.valid && !descriptor.valid(tree, contract))
    throw new Error(descriptor.error || `Invalid layout ${tree.kind}`);
  if (tree.kind === "canvas") {
    if ((count.canvases = (count.canvases || 0) + 1) > 16)
      throw new Error("Layout Canvas budget exceeded");
    presentationPayload(contract.visuals?.get(tree.visual), tree.payload);
  }
  if (tree.kind === "form") {
    if (form || !tree.action) throw new Error("Invalid layout form boundary");
    form = new Set();
  }
  if (LAYOUT_FIELDS.includes(tree.kind)) {
    if (form) {
      if (!tree.name || tree.action || form.has(tree.name))
        throw new Error("Invalid or duplicate layout form field");
      form.add(tree.name);
    } else if (!tree.action) throw new Error("Unknown layout action");
  }
  if (
    tree.kind === "button" &&
    (tree.submit ? !form || !!tree.action : !tree.action)
  )
    throw new Error("Invalid layout button action");
  if (tree.kind === "component")
    validateValue(
      contract.components.get(tree.component).schema,
      tree.props ?? {},
    );
  if (containers.has(tree.kind)) {
    if (!Array.isArray(tree.children))
      throw new Error("Invalid layout children");
    for (const child of tree.children)
      validateLayout(child, contract, depth + 1, count, form);
  }
  return readOnly(tree);
}
/** Expand named, schema-checked component compositions before checking final form semantics. */
export function resolveLayout(tree, contract, render) {
  let count = 0;
  function expand(node, depth) {
    if (!node || ++count > 128 || depth > 12)
      throw new Error("Invalid plugin layout expansion budget");
    if (node.kind === "component") {
      const definition = contract.components?.get(node.component);
      if (!definition) throw new Error("Unknown layout component");
      if (!exact(node, [...COMMON, "component", "props"]))
        throw new Error("Unknown layout property");
      validateValue(definition.schema, node.props ?? {});
      jsonValue(node.props ?? {});
      const expanded = expand(
        render(definition, readOnly(node.props ?? {})),
        depth + 1,
      );
      return {
        ...expanded,
        ...Object.fromEntries(
          COMMON.filter((k) => k !== "kind" && node[k] !== undefined).map(
            (k) => [k, node[k]],
          ),
        ),
      };
    }
    if (node.children !== undefined && !Array.isArray(node.children))
      throw new Error("Invalid layout children");
    return {
      ...node,
      ...(node.children
        ? { children: node.children.map((child) => expand(child, depth + 1)) }
        : {}),
    };
  }
  return validateLayout(expand(tree, 0), contract);
}
