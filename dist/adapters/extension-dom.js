import { validateLayout } from "../engine/extensions/ui-registry.js";
import { readOnly } from "../engine/extensions/values.js";
import { ExtensionFeedback } from "../presentation/extension-feedback.js";
/** Declarative extension pages. No plugin receives DOM nodes, modal internals or the application object. */
export class ExtensionDOM {
  constructor({
    host,
    shell,
    document: doc = document,
    resources,
    assets,
    now,
    onError = console.error,
  }) {
    Object.assign(this, { host, shell, doc, resources, assets, onError });
    this.active = null;
    const visualDefinitions = new Map(
      [...host.presentation].map(([id, definition]) => [
        id,
        {
          ...definition,
          draw: (ctx, data) =>
            host.runtime.evaluate(definition.draw, ctx, data),
        },
      ]),
    );
    this.feedback = new ExtensionFeedback(
      new Map(
        [...visualDefinitions].filter(
          ([, d]) => !d.scope || d.scope === "page",
        ),
      ),
      { now, onError },
    );
    this.fieldFeedback = new ExtensionFeedback(
      new Map([...visualDefinitions].filter(([, d]) => d.scope === "field")),
      { now, onError },
    );
    this.battleFeedback = new ExtensionFeedback(
      new Map([...visualDefinitions].filter(([, d]) => d.scope === "battle")),
      { now, onError },
    );
    this.worldCanvas = doc.createElement("canvas");
    this.worldCanvas.width = 320;
    this.worldCanvas.height = 224;
    this.worldCanvas.className = "extension-world-feedback";
    this.worldCanvas.setAttribute("aria-hidden", "true");
    doc.querySelector(".screen")?.append(this.worldCanvas);
    this.hud = doc.getElementById("extension-hud");
  }
  view(owner, context) {
    return this.host.runtime.view(owner, context);
  }
  invoke(fn, view) {
    return this.host.runtime.evaluate(fn, view);
  }
  mountSlot(
    slot,
    container,
    context = {},
    back = () => this.shell.closeModal(),
  ) {
    for (const entry of this.host.ui.inSlot(slot)) {
      try {
        const view = this.view(entry.owner, context);
        if (entry.when && !this.invoke(entry.when, view)) continue;
        const button = this.doc.createElement("button");
        button.className = "secondary-button";
        button.textContent =
          typeof entry.label === "function"
            ? this.invoke(entry.label, view)
            : entry.label;
        button.onclick = () => this.showPage(entry.page, context, back);
        container.append(button);
      } catch (error) {
        this.onError(error);
      }
    }
  }
  showPage(id, context = {}, back = () => this.shell.closeModal()) {
    const page = this.host.ui.pages.get(id);
    if (!page) throw new Error("Unknown plugin page");
    this.active = { id, context: readOnly(context), back };
    this.rendered = false;
    this.feedback.clear();
    this.refreshPage();
  }
  refreshPage() {
    if (!this.active || (this.shell.modalType !== "extension" && this.rendered))
      return;
    const { id, context, back } = this.active,
      page = this.host.ui.pages.get(id),
      view = this.view(page.owner, context);
    try {
      const tree = validateLayout(this.invoke(page.render, view), {
        actions: this.host.actions,
        resources: this.resources,
        themes: this.host.ui.themes,
      });
      this.shell.modal(
        typeof page.title === "function"
          ? this.invoke(page.title, view)
          : page.title,
        '<div class="extension-page"></div>',
        {
          type: "extension",
          back: () => {
            this.active = null;
            this.rendered = false;
            this.feedback.clear();
            back();
          },
        },
      );
      const root = this.shell.root.querySelector(".extension-page");
      root.append(this.node(tree, context));
      const overlay = this.doc.createElement("canvas");
      overlay.width = 320;
      overlay.height = 112;
      overlay.className = "extension-feedback";
      overlay.setAttribute("aria-hidden", "true");
      root.append(overlay);
      this.canvas = overlay;
      this.rendered = true;
    } catch (error) {
      this.onError(error);
      this.shell.toast("扩展页面暂时无法显示。");
      this.active = null;
      this.rendered = false;
      back();
    }
  }
  node(tree, context) {
    const tag = {
      text: "p",
      heading: "h3",
      image: "img",
      button: "button",
      row: "div",
      grid: "div",
      panel: "section",
      meter: "progress",
      select: "select",
    }[tree.kind];
    let element = this.doc.createElement(tag);
    element.className = `extension-${tree.kind}`;
    if (tree.theme)
      for (const [key, value] of Object.entries(
        this.host.ui.themes.get(tree.theme),
      ))
        if (["background", "foreground", "border", "accent"].includes(key))
          element.style.setProperty("--extension-" + key, value);
    if (tree.text) element.textContent = tree.text;
    if (tree.kind === "image") {
      element.src = this.resources[tree.src];
      element.alt = tree.alt || "";
    }
    if (tree.kind === "meter") {
      element.value = tree.value;
      element.max = tree.max;
      element.setAttribute("aria-label", tree.label || "");
    }
    if (tree.kind === "select")
      for (const option of tree.options || []) {
        const child = this.doc.createElement("option");
        child.value = option.value;
        child.textContent = option.label;
        element.append(child);
      }
    for (const child of tree.children || [])
      element.append(this.node(child, context));
    if (tree.action) {
      if (tree.kind === "image") {
        const button = this.doc.createElement("button");
        button.className = "extension-sprite";
        button.setAttribute("aria-label", tree.alt || "互动");
        button.append(element);
        element = button;
      }
      element.disabled = !!tree.disabled;
      const act = async () => {
        element.disabled = true;
        try {
          const input = {
            ...context,
            ...(tree.input || {}),
            ...(tree.kind === "select" ? { value: element.value } : {}),
          };
          const result = await this.host.runtime.bus.execute(
            tree.action,
            input,
            "ui",
          );
          if (result?.message) this.shell.toast(result.message);
        } catch (error) {
          this.shell.toast(
            error.code === "busy" ? "请先结束当前行动。" : error.message,
          );
        } finally {
          if (this.shell.modalType === "extension") this.refreshPage();
        }
      };
      if (tree.kind === "select") element.onchange = act;
      else element.onclick = act;
    }
    return element;
  }
  refresh() {
    this.refreshHUD();
    if (this.shell.modalType === "extension") this.refreshPage();
  }
  refreshHUD() {
    if (!this.hud) return;
    this.hud.replaceChildren();
    for (const definition of this.host.ui.hud.values())
      try {
        const view = this.view(definition.owner, {});
        if (definition.when && !this.invoke(definition.when, view)) continue;
        const tree = validateLayout(this.invoke(definition.render, view), {
          actions: this.host.actions,
          resources: this.resources,
          themes: this.host.ui.themes,
        });
        this.hud.append(this.node(tree, {}));
      } catch (error) {
        this.onError(error);
      }
  }
  present(id, payload) {
    const scope = this.host.presentation.get(id)?.scope;
    (scope === "field"
      ? this.fieldFeedback
      : scope === "battle"
        ? this.battleFeedback
        : this.feedback
    ).play(id, readOnly(payload));
  }
  render(now, view = {}) {
    const worldCtx = this.worldCanvas.getContext("2d");
    worldCtx.clearRect(0, 0, 320, 224);
    const feedback =
      view.mode === "battle" ? this.battleFeedback : this.fieldFeedback;
    feedback.draw(worldCtx, this.assets, readOnly(view), now);
    if (this.shell.modalType !== "extension" || !this.canvas) {
      this.feedback.clear();
      return;
    }
    const ctx = this.canvas.getContext("2d");
    ctx.clearRect(0, 0, 320, 112);
    ctx.imageSmoothingEnabled = false;
    this.feedback.draw(
      ctx,
      this.assets,
      readOnly(this.active?.context || {}),
      now,
    );
  }
}
