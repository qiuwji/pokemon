import { resolveLayout } from "../engine/extensions/ui-registry.js";
import { readOnly } from "../engine/extensions/values.js";
import { LayoutDOM } from "./layout-dom.js";
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
    this.mounts = new Set();
    this.reducedMotion = shell.reducedMotion || (() => false);
    const visualDefinitions = new Map(
      [...host.presentation].map(([id, definition]) => [
        id,
        {
          ...definition,
          draw: (ctx, data, assets) =>
            host.runtime.evaluate(definition.draw, ctx, data, assets),
        },
      ]),
    );
    this.layout = new LayoutDOM({
      document: doc,
      resources,
      themes: host.ui.themes,
      visuals: visualDefinitions,
      assets,
      dispatch: (id, input) => host.runtime.bus.execute(id, input, "ui"),
      onResult: (result) => {
        if (result?.message) shell.toast(result.message);
      },
      onError: (error) => {
        onError(error);
        shell.toast(
          error.code === "busy" ? "请先结束当前行动。" : error.message,
        );
      },
    });
    this.visibilityChanged = () => {
      if (doc.hidden || doc.visibilityState === "hidden") this.layout.pause();
    };
    doc.addEventListener("visibilitychange", this.visibilityChanged);
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
    if (!container) return;
    const mount = { slot, container, context: readOnly(context), back };
    const root = this.doc.createElement("div");
    root.className = "extension-slot";
    container.append(root);
    mount.root = root;
    this.mounts.add(mount);
    this.refreshMount(mount);
  }
  resolve(tree, context) {
    return resolveLayout(
      tree,
      {
        actions: this.host.actions,
        resources: this.resources,
        themes: this.host.ui.themes,
        components: this.host.ui.components,
        visuals: this.host.presentation,
      },
      (definition, props) =>
        this.host.runtime.evaluate(
          definition.render,
          props,
          this.view(definition.owner, context),
        ),
    );
  }
  refreshMount(mount) {
    for (const region of this.host.ui.inSlot(mount.slot, "regions"))
      this.layout.disposeScope("region:" + region.id);
    mount.root.replaceChildren();
    for (const entry of this.host.ui.inSlot(mount.slot))
      try {
        const view = this.view(entry.owner, mount.context);
        if (entry.when && !this.invoke(entry.when, view)) continue;
        const button = this.doc.createElement("button");
        button.className = "secondary-button";
        button.textContent =
          typeof entry.label === "function"
            ? this.invoke(entry.label, view)
            : entry.label;
        button.onclick = () =>
          this.showPage(entry.page, mount.context, mount.back);
        mount.root.append(button);
      } catch (error) {
        this.onError(error);
      }
    for (const region of this.host.ui.inSlot(mount.slot, "regions"))
      try {
        const view = this.view(region.owner, mount.context);
        if (region.when && !this.invoke(region.when, view)) continue;
        const tree = this.resolve(
          this.invoke(region.render, view),
          mount.context,
        );
        mount.root.append(
          this.node(tree, mount.context, {
            scope: "region:" + region.id,
            refresh: () => {
              if (this.mounts.has(mount))
                this.withFocus(() => this.refreshMount(mount));
            },
          }),
        );
      } catch (error) {
        this.onError(error);
      }
  }
  unmountSlot(slot) {
    for (const mount of [...this.mounts])
      if (mount.slot === slot) {
        for (const region of this.host.ui.inSlot(slot, "regions"))
          this.layout.clearScope("region:" + region.id);
        this.mounts.delete(mount);
      }
  }
  unmountRegions() {
    if (this.active) this.layout.disposeScope("page:" + this.active.id);
    for (const mount of this.mounts)
      for (const region of this.host.ui.inSlot(mount.slot, "regions"))
        this.layout.clearScope("region:" + region.id);
    this.mounts.clear();
  }
  withFocus(render) {
    const active = this.doc.activeElement,
      key = active?.getAttribute?.("data-extension-key"),
      selection =
        typeof active?.selectionStart === "number"
          ? [active.selectionStart, active.selectionEnd]
          : null;
    render();
    if (!key) return;
    const restore = () => {
      const node = [
        ...this.shell.root.querySelectorAll("[data-extension-key]"),
        ...(this.hud?.querySelectorAll("[data-extension-key]") || []),
      ].find((n) => n.getAttribute("data-extension-key") === key);
      node?.focus();
      if (selection && typeof node?.setSelectionRange === "function")
        node.setSelectionRange(...selection);
    };
    restore();
    this.doc.defaultView?.requestAnimationFrame?.(restore);
  }
  showPage(id, context = {}, back = () => this.shell.closeModal()) {
    const page = this.host.ui.pages.get(id);
    if (!page) throw new Error("Unknown plugin page");
    if (this.active) this.layout.clearScope("page:" + this.active.id);
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
      const tree = this.resolve(this.invoke(page.render, view), context);
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
            this.layout.clearScope("page:" + id);
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
      this.layout.clearScope("page:" + id);
      this.onError(error);
      this.shell.toast("扩展页面暂时无法显示。");
      this.active = null;
      this.rendered = false;
      back();
    }
  }
  node(tree, context, options = {}) {
    const active = this.active;
    return this.layout.create(tree, {
      context,
      scope: active ? "page:" + active.id : "layout",
      refresh: () => {
        if (this.active === active) this.withFocus(() => this.refreshPage());
      },
      ...options,
    });
  }
  refresh() {
    this.refreshHUD();
    if (this.shell.modalType === "extension")
      this.withFocus(() => this.refreshPage());
    else
      for (const mount of this.mounts)
        this.withFocus(() => this.refreshMount(mount));
  }
  refreshHUD() {
    if (!this.hud) return;
    for (const definition of this.host.ui.hud.values())
      this.layout.disposeScope("hud:" + definition.id);
    this.hud.replaceChildren();
    for (const definition of this.host.ui.hud.values())
      try {
        const view = this.view(definition.owner, {});
        if (definition.when && !this.invoke(definition.when, view)) continue;
        const tree = this.resolve(this.invoke(definition.render, view), {});
        this.hud.append(
          this.node(
            tree,
            {},
            {
              scope: "hud:" + definition.id,
              refresh: () => this.withFocus(() => this.refreshHUD()),
            },
          ),
        );
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
    this.layout.render(now, { reducedMotion: this.reducedMotion() });
    const worldCtx = this.worldCanvas.getContext("2d");
    worldCtx.clearRect(0, 0, 320, 224);
    const feedback =
      view.mode === "battle" ? this.battleFeedback : this.fieldFeedback;
    feedback.draw(worldCtx, this.assets, readOnly(view), now, {
      reducedMotion: this.reducedMotion(),
    });
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
      { reducedMotion: this.reducedMotion() },
    );
  }
  dispose() {
    this.doc.removeEventListener?.("visibilitychange", this.visibilityChanged);
    this.layout.clear();
    this.mounts.clear();
    this.active = null;
    for (const feedback of [
      this.feedback,
      this.fieldFeedback,
      this.battleFeedback,
    ])
      feedback.clear();
  }
}
