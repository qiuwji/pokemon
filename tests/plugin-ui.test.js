import test from "node:test";
import assert from "node:assert/strict";
import {
  session,
  manifest,
  objectSchema,
} from "./helpers/session.js";
import { formFixture } from "./fixtures/extensions/form.js";
import {
  validateLayout,
  resolveLayout,
} from "../src/engine/extensions/ui-registry.js";
import { LAYOUT_NODES } from "../src/engine/extensions/layout-contracts.js";
import { ExtensionDOM } from "../src/adapters/extension-dom.js";
import { LayoutDOM } from "../src/adapters/layout-dom.js";
import { layoutDocument } from "./helpers/layout-document.js";

function adapter(s) {
  const doc = layoutDocument(),
    errors = [],
    messages = [],
    root = doc.getElementById("modal-root");
  const shell = {
    root,
    modalType: "bag",
    toast: (m) => messages.push(m),
    closeModal() {
      this.modalType = null;
      root.replaceChildren();
    },
    modal(title, body, options) {
      this.modalType = options.type;
      root.replaceChildren();
      const node = doc.createElement("div");
      node.className = "extension-page";
      root.append(node);
      this.back = options.back;
    },
  };
  const ext = new ExtensionDOM({
    host: s.host,
    shell,
    document: doc,
    resources: s.db.resources,
    assets: {},
    now: () => 0,
    onError: (e) => errors.push(e),
  });
  return { doc, root, shell, ext, errors, messages };
}
const contract = (s) => ({
  actions: s.host.actions,
  resources: s.db.resources,
  themes: s.host.ui.themes,
  components: s.host.ui.components,
});

test("Declarative layouts reject bad field types, duplicate names, nested forms and unbounded style before any command", () => {
  const s = session([formFixture]);
  const form = (children) => ({
    kind: "form",
    action: "fixture-form:save",
    children,
  });
  for (const tree of [
    form([{ kind: "checkbox", name: "pin", value: "true" }]),
    form([
      { kind: "input", name: "title", value: "a" },
      { kind: "input", name: "title", value: "b" },
    ]),
    form([form([])]),
    { kind: "slider", action: "fixture-form:save", value: -1, max: 10 },
    { kind: "panel", style: { color: "red" }, children: [] },
    { kind: "table", columns: ["a"], rows: [[1, 2]] },
    {
      kind: "select",
      action: "fixture-form:save",
      options: [
        { label: "A", value: "a" },
        { label: "B", value: "a" },
      ],
    },
    {
      kind: "component",
      component: "fixture-form:inventory-summary",
      props: { category: "invalid" },
    },
  ])
    assert.throws(() => validateLayout(tree, contract(s)));
  const validated = validateLayout(
    form([
      { kind: "input", name: "title", value: "a" },
      { kind: "button", submit: true, text: "Save" },
    ]),
    contract(s),
  );
  assert.throws(
    () => validated.children.push({ kind: "text", text: "bad" }),
    TypeError,
  );
});
test("Component schemas and recursive expansion are bounded; primitive factories cover every resolved kind", () => {
  const s = session([
    manifest("loop", (api) =>
      api.ui.component("recursive", {
        schema: objectSchema(),
        render: () => ({ kind: "component", component: "loop:recursive" }),
      }),
    ),
  ]);
  assert.throws(
    () =>
      resolveLayout(
        { kind: "component", component: "loop:recursive" },
        contract(s),
        (d) => d.render(),
      ),
    /budget/,
  );
  const dom = new LayoutDOM({
    document: layoutDocument(),
    resources: {},
    themes: new Map(),
  });
  assert.deepEqual(
    Object.keys(dom.factories).sort(),
    Object.keys(LAYOUT_NODES)
      .filter((k) => k !== "component")
      .sort(),
  );
});
test("Bad region slots, component schemas and theme values fail during production plugin assembly", () => {
  for (const setup of [
    (api) =>
      api.ui.region("x", {
        slot: "missing",
        render: () => ({ kind: "text", text: "x" }),
      }),
    (api) =>
      api.ui.component("x", {
        schema: { type: "invalid" },
        render: () => ({ kind: "text", text: "x" }),
      }),
    (api) => api.ui.theme("x", { fontSize: 200 }),
    (api) => api.ui.theme("x", { background: "url(bad)" }),
  ])
    assert.throws(() => session([manifest("bad", setup)]));
});
test("Real bag page mounts a plugin form; typed submit saves plugin memory without changing inventory and reloads", async () => {
  const s = session([formFixture]),
    a = adapter(s),
    before = structuredClone(s.game.state.bag),
    slots = [];
  const { createBagInterface } = await import(
    "../src/packs/emerald/bag-interface.js"
  );
  s.game.ui = { ...s.game.ui, extensions: a.ext };
  const ui = createBagInterface(s.game, {
    root: a.root,
    modal(title, body) {
      a.root.replaceChildren();
      const close = a.doc.createElement("button");
      close.setAttribute("data-bag-close", "");
      a.root.append(close);
      for (const match of body.matchAll(/data-extension-slot="([^"]+)"/g)) {
        const node = a.doc.createElement("div");
        node.setAttribute("data-extension-slot", match[1]);
        a.root.append(node);
        slots.push(match[1]);
      }
    },
    closeModal: () => {},
    showMenu: () => {},
    partyCard: () => "",
    toast: a.shell.toast,
    updateSide: () => {},
    sound: () => {},
    escapeHTML: String,
  });
  ui.showBag();
  assert.deepEqual(slots, ["bag.actions", "bag.content"]);
  assert.equal(a.errors.length, 0);
  const form = a.root.querySelector("form"),
    fields = form.querySelectorAll("input");
  fields.find((n) => n.type === "text").value = "出发准备";
  fields.find((n) => n.type === "checkbox").checked = true;
  fields.find((n) => n.type === "range").value = "7";
  for (const input of fields.filter((n) => n.type === "radio"))
    input.checked = input.value === "items";
  await form.onsubmit({ preventDefault() {} });
  assert.deepEqual(s.game.state.extensions["fixture-form"].data.note, {
    title: "出发准备",
    pinned: true,
    goal: 7,
    category: "items",
  });
  assert.deepEqual(s.game.state.bag, before);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.host.runtime.view("fixture-form").store.get("note").goal, 7);
  assert.equal(a.errors.length, 0);
});
test("Region refresh preserves unsaved text, focus and tab choice, while unmount removes its drafts", () => {
  const s = session([formFixture]),
    a = adapter(s);
  a.ext.mountSlot("bag.content", a.root, { inBattle: false });
  let input = a.root.querySelectorAll("input").find((n) => n.type === "text");
  input.value = "未提交";
  input.oninput();
  input.focus();
  input.setSelectionRange(1, 2);
  a.ext.refresh();
  input = a.root.querySelectorAll("input").find((n) => n.type === "text");
  assert.equal(input.value, "未提交");
  assert.equal(a.doc.activeElement, input);
  assert.equal(input.selectionStart, 1);
  const tabs = a.root
    .querySelectorAll("button")
    .filter((n) => n.getAttribute("role") === "tab");
  tabs[1].onclick();
  a.ext.refresh();
  assert.equal(
    a.root
      .querySelectorAll("button")
      .filter((n) => n.getAttribute("role") === "tab")[1]
      .getAttribute("aria-selected"),
    "true",
  );
  a.ext.unmountRegions();
  assert.equal(a.ext.mounts.size, 0);
  assert.equal(a.ext.layout.drafts.size, 0);
});
test("Form duplicate submission is locked; closing before completion cannot remount a removed region", async () => {
  const s = session([formFixture]),
    a = adapter(s);
  a.ext.mountSlot("bag.content", a.root, { inBattle: false });
  let resolve,
    calls = 0;
  a.ext.layout.dispatch = () => {
    calls++;
    return new Promise((r) => (resolve = r));
  };
  const form = a.root.querySelector("form"),
    one = form.onsubmit({ preventDefault() {} });
  await form.onsubmit({ preventDefault() {} });
  assert.equal(calls, 1);
  a.ext.unmountRegions();
  a.root.replaceChildren();
  resolve({ message: "done" });
  await one;
  assert.equal(a.root.children.length, 0);
});
test("Native editable controls retain game keys, Escape returns, and widget-handled arrows do not navigate the game", async () => {
  const { BrowserInput } = await import("../src/adapters/browser-input.js");
  let back = 0,
    move = 0;
  const input = Object.create(BrowserInput.prototype);
  input.externalBlocked = () => false;
  input.ui = {
    modalType: "extension",
    back: () => back++,
    navigateMenu: () => move++,
    focusTrap: () => {},
  };
  input.game = { handleFieldInput: () => move++ };
  const event = (key) => ({
    key,
    target: { closest: () => ({}) },
    preventDefault() {
      this.defaultPrevented = true;
    },
  });
  input.keydown(event("w"));
  input.keydown(event("Enter"));
  assert.equal(move, 0);
  input.keydown(event("Escape"));
  assert.equal(back, 1);
  const arrow = event("ArrowRight");
  arrow.defaultPrevented = true;
  input.keydown(arrow);
  assert.equal(move, 0);
});
test("A late old-page submission cannot refresh a different page, and component callbacks receive frozen props and queries", async () => {
  const s = session([
      formFixture,
      manifest("freeze", (api) => {
        api.ui.component("mutation", {
          schema: objectSchema({ value: { type: "integer" } }, ["value"]),
          render: (props) => {
            props.value++;
            return { kind: "text", text: "bad" };
          },
        });
        api.ui.page("one", {
          title: "One",
          render: () => ({
            kind: "button",
            text: "Save",
            action: "fixture-form:save",
          }),
        });
        api.ui.page("two", {
          title: "Two",
          render: () => ({ kind: "text", text: "Two" }),
        });
      }),
    ]),
    a = adapter(s);
  assert.throws(
    () =>
      a.ext.resolve(
        {
          kind: "component",
          component: "freeze:mutation",
          props: { value: 1 },
        },
        {},
      ),
    TypeError,
  );
  a.ext.showPage("freeze:one");
  let resolve;
  a.ext.layout.dispatch = () => new Promise((r) => (resolve = r));
  const pending = a.root.querySelector("button").onclick();
  a.ext.showPage("freeze:two");
  const tree = a.root.children[0];
  resolve({});
  await pending;
  assert.equal(a.root.children[0], tree);
});
test("Disabled forms block submission and a rejected command retains editable drafts", async () => {
  const doc = layoutDocument(),
    errors = [],
    scope = "disabled";
  let calls = 0;
  const dom = new LayoutDOM({
    document: doc,
    resources: {},
    themes: new Map(),
    dispatch: async () => {
      calls++;
      return { ok: false, reason: "denied" };
    },
    onError: (error) => errors.push(error),
  });
  const tree = {
    kind: "form",
    action: "demo:save",
    disabled: true,
    children: [
      { kind: "input", name: "title", value: "old" },
      { kind: "button", submit: true, text: "Save" },
    ],
  };
  const locked = dom.create(tree, { scope });
  assert(locked.querySelector("input").disabled);
  await locked.onsubmit({ preventDefault() {} });
  assert.equal(calls, 0);
  const editable = dom.create({ ...tree, disabled: false }, { scope }),
    input = editable.querySelector("input");
  input.value = "draft";
  input.oninput();
  await editable.onsubmit({ preventDefault() {} });
  assert.equal(calls, 1);
  assert.equal(errors[0].message, "denied");
  assert.equal(
    dom.create({ ...tree, disabled: false }, { scope }).querySelector("input")
      .value,
    "draft",
  );
});
test("Successful standalone input refreshes the normalized committed value rather than an old local draft", async () => {
  const s = session([
      manifest("normalized", (api) => {
        const action = api.actions.register("save", {
          schema: objectSchema({ value: { type: "string" } }, ["value"]),
          run(ctx, { value }) {
            ctx.store.set("title", value.trim());
          },
        });
        api.ui.page("editor", {
          title: "Editor",
          render: (view) => ({
            kind: "input",
            key: "title",
            action,
            value: view.store.get("title") || "old",
          }),
        });
      }),
    ]),
    a = adapter(s);
  a.ext.showPage("normalized:editor");
  const input = a.root.querySelector("input");
  input.value = "  saved  ";
  input.oninput();
  await input.onchange();
  assert.equal(a.root.querySelector("input").value, "saved");
  assert.equal(s.game.state.extensions.normalized.data.title, "saved");
});
