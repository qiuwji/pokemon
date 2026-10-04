import { LAYOUT_FIELDS } from "../engine/extensions/layout-contracts.js";
import { presentationPayload } from "../engine/extensions/presentation-contracts.js";
import { VisualCanvas, canvasPointer } from "./visual-canvas.js";

const SIMPLE_TAGS = {
  text: "p",
  heading: "h3",
  row: "div",
  grid: "div",
  panel: "section",
  divider: "hr",
};
/** Browser primitive rendering and local drafts. Receives a command port, never game state. */
export class LayoutDOM {
  constructor({
    document,
    resources,
    themes,
    dispatch,
    onResult,
    onError,
    visuals = new Map(),
    assets = {},
  }) {
    Object.assign(this, {
      doc: document,
      resources,
      themes,
      dispatch,
      onResult,
      onError,
      visuals,
      assets,
    });
    this.drafts = new Map();
    this.canvases = new Map();
    this.sequence = 0;
    this.factories = {
      ...Object.fromEntries(
        Object.entries(SIMPLE_TAGS).map(([kind, tag]) => [
          kind,
          () => this.doc.createElement(tag),
        ]),
      ),
      image: (t, s) => this.image(t, s),
      canvas: (t, s) => this.canvas(t, s),
      meter: (t) => this.meter(t),
      button: (t) => {
        const n = this.doc.createElement("button");
        n.type = t.submit ? "submit" : "button";
        return n;
      },
      input: (t) => this.field(t),
      checkbox: (t) => this.field(t),
      slider: (t) => this.field(t),
      select: (t) => this.field(t),
      radio: (t) => this.field(t),
      list: () => this.doc.createElement("ul"),
      table: (t) => this.table(t),
      form: () => this.doc.createElement("form"),
      tabs: (t, s) => this.tabs(t, s),
    };
  }
  create(tree, { context = {}, scope = "layout", refresh = () => {} } = {}) {
    this.disposeScope(scope);
    try {
      return this.node(tree, {
        context,
        scope,
        refresh,
        path: "root",
        form: null,
      });
    } catch (error) {
      this.disposeScope(scope);
      throw error;
    }
  }
  node(t, s) {
    const key = s.scope + ":" + (t.key || s.path),
      element = this.factories[t.kind](t, { ...s, key });
    element.classList.add(`extension-${t.kind}`);
    if (t.text && t.kind !== "canvas") element.textContent = t.text;
    if (t.disabled || s.form?.disabled) element.disabled = true;
    this.style(element, t);
    if (
      ["button", "image", "canvas"].includes(t.kind) ||
      LAYOUT_FIELDS.includes(t.kind)
    )
      element.setAttribute("data-extension-key", key);
    let form = s.form;
    if (t.kind === "form") form = { fields: new Map(), disabled: !!t.disabled };
    if (LAYOUT_FIELDS.includes(t.kind)) {
      const control = element._extensionControl || element;
      if (this.drafts.has(key)) this.write(control, t, this.drafts.get(key));
      if (t.kind === "radio")
        for (const input of element.querySelectorAll("input"))
          input.setAttribute("data-extension-key", key + ":" + input.value);
      const read = () => this.read(control, t);
      element.oninput = () => this.drafts.set(key, read());
      if (form) form.fields.set(t.name, read);
      else
        element.onchange = () =>
          this.act(
            element,
            t,
            s,
            { [t.name || "value"]: read() },
            { draftKey: key },
          );
      if (t.label && t.kind !== "radio") {
        const wrapper = this.doc.createElement("label");
        wrapper.className = "extension-field";
        const label = this.doc.createElement("span");
        label.textContent = t.label;
        wrapper.append(label, element);
        element._extensionWrapper = wrapper;
      }
    }
    if (t.kind !== "tabs")
      for (const [index, child] of (t.children || []).entries()) {
        const node = this.node(child, {
          ...s,
          form,
          path: s.path + "." + index,
        });
        if (t.kind === "list") {
          const li = this.doc.createElement("li");
          li.append(node);
          element.append(li);
        } else element.append(node);
      }
    if (t.kind === "form")
      element.onsubmit = (event) => {
        event.preventDefault();
        return this.act(
          element,
          t,
          s,
          Object.fromEntries(
            [...form.fields].map(([name, read]) => [name, read()]),
          ),
          { resetScope: true },
        );
      };
    else if (t.action && !LAYOUT_FIELDS.includes(t.kind))
      element.onclick = (event) => {
        const pointer =
          t.kind === "canvas"
            ? canvasPointer(element._visualCanvas, event)
            : undefined;
        if (t.kind === "canvas" && !pointer) return;
        return this.act(element, t, s, pointer ? { pointer } : {});
      };
    return element._extensionWrapper || element;
  }
  async act(element, tree, scope, fields = {}, reset = {}) {
    if (tree.disabled || element.disabled || element._extensionPending) return;
    element._extensionPending = true;
    const controls =
        tree.kind === "form"
          ? [...element.querySelectorAll("button,input,select")]
          : [element],
      disabled = controls.map((n) => n.disabled);
    controls.forEach((n) => (n.disabled = true));
    element.setAttribute("aria-busy", "true");
    try {
      const result = await this.dispatch(tree.action, {
        ...scope.context,
        ...(tree.input || {}),
        ...fields,
      });
      if (result?.ok === false)
        throw new Error(result.reason || "操作未完成。");
      if (reset.resetScope) this.clearScope(scope.scope);
      else if (reset.draftKey) this.drafts.delete(reset.draftKey);
      this.onResult?.(result);
    } catch (error) {
      this.onError?.(error);
    } finally {
      controls.forEach((n, i) => (n.disabled = disabled[i]));
      element._extensionPending = false;
      element.removeAttribute("aria-busy");
      scope.refresh();
    }
  }
  clearScope(scope) {
    this.disposeScope(scope);
    for (const key of this.drafts.keys())
      if (key.startsWith(scope + ":")) this.drafts.delete(key);
  }
  clear() {
    for (const scope of [...this.canvases.keys()]) this.disposeScope(scope);
    this.drafts.clear();
  }
  disposeScope(scope) {
    for (const player of this.canvases.get(scope) || []) player.dispose();
    this.canvases.delete(scope);
  }
  pause() {
    for (const players of this.canvases.values())
      for (const player of players) player.pause();
  }
  render(now, { reducedMotion = false } = {}) {
    for (const players of this.canvases.values())
      for (const player of players)
        player.render(now, {
          reducedMotion,
          visible:
            this.doc.visibilityState !== "hidden" &&
            player.canvas.isConnected &&
            player.canvas.getClientRects().length > 0,
        });
  }
  canvas(t, s) {
    const canvas = this.doc.createElement("canvas");
    canvas.width = t.width;
    canvas.height = t.height;
    canvas.className = "extension-canvas-surface";
    canvas.setAttribute("role", "img");
    canvas.setAttribute("aria-label", t.alt);
    canvas.textContent = t.alt;
    const definition = this.visuals.get(t.visual),
      player = new VisualCanvas({
        canvas,
        definition,
        payload: presentationPayload(definition, t.payload),
        context: s.context,
        assets: this.assets,
        onError: (error) => this.onError?.(error),
      });
    if (!this.canvases.has(s.scope)) this.canvases.set(s.scope, new Set());
    this.canvases.get(s.scope).add(player);
    if (!t.action) return canvas;
    const button = this.doc.createElement("button");
    button.type = "button";
    button.setAttribute("aria-label", t.alt);
    canvas.setAttribute("aria-hidden", "true");
    button.append(canvas);
    button._visualCanvas = canvas;
    return button;
  }
  style(element, tree) {
    const theme = this.themes.get(tree.theme);
    for (const [key, value] of Object.entries(theme || {}))
      if (!["id", "owner"].includes(key))
        element.style.setProperty(
          "--extension-" + key,
          typeof value === "number"
            ? value + (key === "duration" ? "ms" : "px")
            : value,
        );
    for (const [key, value] of Object.entries(tree.style || {})) {
      const css = {
        gap: "gap",
        padding: "padding",
        columns: "grid-template-columns",
        align: "align-items",
        justify: "justify-content",
        width: "width",
        fontSize: "font-size",
      }[key];
      const rendered =
        key === "columns"
          ? `repeat(${value},minmax(0,1fr))`
          : ["gap", "padding", "fontSize"].includes(key)
            ? value + "px"
            : key === "width"
              ? value === "full"
                ? "100%"
                : "auto"
              : value === "between"
                ? "space-between"
                : value;
      element.style.setProperty(css, rendered);
    }
  }
  image(t) {
    const image = this.doc.createElement("img");
    image.src = this.resources[t.src];
    image.alt = t.alt || "";
    if (!t.action) return image;
    const button = this.doc.createElement("button");
    button.type = "button";
    button.className = "extension-sprite";
    button.setAttribute("aria-label", t.alt || "互动");
    button.append(image);
    return button;
  }
  meter(t) {
    const n = this.doc.createElement("progress");
    n.value = t.value;
    n.max = t.max;
    n.setAttribute("aria-label", t.label || "");
    return n;
  }
  field(t) {
    if (t.kind === "radio") {
      const field = this.doc.createElement("fieldset"),
        legend = this.doc.createElement("legend");
      legend.textContent = t.label || "选择";
      field.append(legend);
      const name = "extension-radio-" + ++this.sequence;
      for (const option of t.options) {
        const label = this.doc.createElement("label"),
          input = this.doc.createElement("input");
        input.type = "radio";
        input.name = name;
        input.value = option.value;
        input.checked = t.value === option.value;
        input.disabled = !!t.disabled;
        label.append(input, this.doc.createTextNode(option.label));
        field.append(label);
      }
      return field;
    }
    const n = this.doc.createElement(t.kind === "select" ? "select" : "input");
    if (t.kind === "select")
      for (const option of t.options) {
        const o = this.doc.createElement("option");
        o.value = option.value;
        o.textContent = option.label;
        n.append(o);
      }
    else
      n.type = { input: "text", checkbox: "checkbox", slider: "range" }[t.kind];
    if (t.kind === "slider") {
      n.min = t.min ?? 0;
      n.max = t.max;
      n.step = t.step ?? 1;
    }
    if (t.kind === "input") {
      n.maxLength = t.maxLength ?? 256;
      n.placeholder = t.placeholder || "";
    }
    this.write(n, t, t.value ?? t.options?.[0]?.value);
    return n;
  }
  read(node, t) {
    if (t.kind === "checkbox") return node.checked;
    if (t.kind === "slider") return Number(node.value);
    if (t.kind === "radio")
      return [...node.querySelectorAll("input")].find((n) => n.checked)?.value;
    return node.value;
  }
  write(node, t, value) {
    if (t.kind === "checkbox") node.checked = value;
    else if (t.kind === "radio")
      for (const input of node.querySelectorAll("input"))
        input.checked = input.value === value;
    else node.value = value;
  }
  table(t) {
    const table = this.doc.createElement("table"),
      head = this.doc.createElement("thead"),
      row = this.doc.createElement("tr"),
      body = this.doc.createElement("tbody");
    for (const column of t.columns) {
      const th = this.doc.createElement("th");
      th.scope = "col";
      th.textContent = column;
      row.append(th);
    }
    head.append(row);
    table.append(head, body);
    for (const values of t.rows) {
      const row = this.doc.createElement("tr");
      for (const value of values) {
        const td = this.doc.createElement("td");
        td.textContent = String(value);
        row.append(td);
      }
      body.append(row);
    }
    return table;
  }
  tabs(t, s) {
    const root = this.doc.createElement("div"),
      list = this.doc.createElement("div");
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-label", t.label || "页面页签");
    root.append(list);
    let selected = this.drafts.get(s.key) || t.value;
    if (!t.children.some((c) => c.key === selected)) selected = t.value;
    const buttons = [],
      panels = [];
    const select = (index) => {
      selected = t.children[index].key;
      this.drafts.set(s.key, selected);
      buttons.forEach((b, i) => {
        b.setAttribute("aria-selected", String(i === index));
        b.tabIndex = i === index ? 0 : -1;
        panels[i].hidden = i !== index;
      });
    };
    for (const [i, child] of t.children.entries()) {
      const button = this.doc.createElement("button"),
        panel = this.doc.createElement("div"),
        id = "extension-tab-" + ++this.sequence;
      button.type = "button";
      button.textContent = child.label;
      button.id = id;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-controls", id + "-panel");
      button.setAttribute("data-extension-key", s.key + ":" + child.key);
      panel.id = id + "-panel";
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", id);
      panel.append(this.node(child, { ...s, path: s.path + "." + i }));
      button.onclick = () => select(i);
      button.onkeydown = (event) => {
        const direction = {
          ArrowLeft: -1,
          ArrowRight: 1,
          Home: -i,
          End: buttons.length - 1 - i,
        }[event.key];
        if (direction === undefined) return;
        event.preventDefault();
        event.stopPropagation();
        const next = (i + direction + buttons.length) % buttons.length;
        select(next);
        buttons[next].focus();
      };
      buttons.push(button);
      panels.push(panel);
      list.append(button);
      root.append(panel);
    }
    select(t.children.findIndex((child) => child.key === selected));
    return root;
  }
}
