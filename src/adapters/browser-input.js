const DIRECTIONS = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
};
const SEMANTIC = {
  arrowup: "up",
  w: "up",
  arrowdown: "down",
  s: "down",
  arrowleft: "left",
  a: "left",
  arrowright: "right",
  d: "right",
  z: "confirm",
  enter: "confirm",
  " ": "confirm",
  x: "back",
  escape: "back",
};
/** Input mapping is replaceable; field and battle services don't inspect keys. */
export class BrowserInput {
  constructor({
    document: doc = document,
    window: win = window,
    game,
    ui,
    externalBlocked = () => false,
    interactionInput = null,
  }) {
    Object.assign(this, { doc, win, game, ui, externalBlocked, interactionInput });
    this.keys = new Set();
    // action -> set of physical sources (keys/pointers) currently holding it.
    this.semanticSources = new Map();
    this.held = null;
    this.running = false;
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    doc.addEventListener("keydown", (e) => this.keydown(e), options);
    doc.addEventListener(
      "keyup",
      (e) => {
        if (this.semantic(e, false)) return;
        this.keys.delete(e.key.toLowerCase());
        if (e.key === "Shift") this.running = false;
        this.held = DIRECTIONS[[...this.keys].at(-1)] || null;
      },
      options,
    );
    win.addEventListener("blur", () => this.clear(), options);
    doc.addEventListener(
      "visibilitychange",
      () => {
        if (doc.hidden) {
          this.clear();
          game.save();
        }
      },
      options,
    );
    doc.querySelector("[data-item-shortcut]")?.addEventListener(
      "click",
      () => {
        void this.useRegisteredItem();
      },
      options,
    );
    doc.querySelectorAll("[data-dir]").forEach((button) => {
      const dir = button.dataset.dir;
      button.addEventListener(
        "pointerdown",
        (e) => {
          if (this.externalBlocked()) return;
          e.preventDefault();
          if (this.route(dir, `touch:${dir}`, true)) {
            button.setPointerCapture(e.pointerId);
            return;
          }
          if (!ui.modalType && !game.battle && this.fieldBlocked()) {
            this.clear();
            return;
          }
          button.setPointerCapture(e.pointerId);
          if (ui.modalType) ui.navigateMenu(dir);
          else if (game.battle) ui.navigateBattle(dir);
          else {
            this.held = dir;
            this.tick();
          }
        },
        options,
      );
      for (const type of ["pointerup", "pointercancel", "lostpointercapture"])
        button.addEventListener(
          type,
          () => {
            if (this.route(dir, `touch:${dir}`, false)) return;
            this.held = null;
          },
          options,
        );
    });
  }
  /** Merge one physical source into a semantic action; release only when the last source lets go. */
  route(action, source, active) {
    const bridge = this.interactionInput;
    if (!bridge?.active() || !bridge.declares(action)) return false;
    let sources = this.semanticSources.get(action);
    if (!sources) {
      sources = new Set();
      this.semanticSources.set(action, sources);
    }
    if (active) {
      sources.add(source);
      if (sources.size === 1) bridge.set(action, true);
    } else {
      sources.delete(source);
      if (sources.size === 0) {
        this.semanticSources.delete(action);
        bridge.set(action, false);
      }
    }
    return true;
  }
  semantic(event, pressed) {
    const bridge = this.interactionInput;
    if (!bridge?.active()) return false;
    const key = (event.key || "").toLowerCase();
    const action = SEMANTIC[key];
    if (!action || !bridge.declares(action)) return false;
    if (pressed) event.preventDefault();
    if (action === "back") {
      if (pressed) bridge.cancel?.();
      return true;
    }
    this.route(action, `key:${key}`, pressed);
    return true;
  }
  clear() {
    this.keys.clear();
    this.held = null;
    this.running = false;
    if (this.semanticSources.size) {
      this.semanticSources.clear();
      this.interactionInput?.clear?.();
    }
    // Input cancellation must not cancel the director-owned scripted pose/motion.
    if (!this.game.storyBusy) this.game.resetFieldInput();
  }
  fieldBlocked() {
    return this.game.storyBusy || this.ui.blocked;
  }
  tick() {
    if (this.externalBlocked()) return;
    if (this.interactionInput?.active()) return;
    if (this.fieldBlocked()) {
      this.clear();
      return;
    }
    this.game.handleFieldInput({
      direction: this.held,
      secondary: this.running,
      running: this.running,
    });
  }
  async useRegisteredItem() {
    if (this.externalBlocked() || this.ui.blocked || this.game.busy || this.game.battle) return;
    this.clear();
    const result = await this.game.useRegisteredItem();
    if (!result.ok) this.ui.toast(result.reason);
  }
  keydown(e) {
    if (this.externalBlocked()) return;
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    if (this.semantic(e, true)) return;
    if (e.key.toLowerCase() === "tab") {
      this.ui.focusTrap(e);
      return;
    }
    if (e.key === "Escape" && this.ui.modalType) {
      e.preventDefault();
      this.ui.back();
      return;
    }
    if (e.target.closest("input,select,textarea")) return;
    const key = e.key.toLowerCase(),
      dir = DIRECTIONS[key];
    if (
      [
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        " ",
        "enter",
      ].includes(key)
    )
      e.preventDefault();
    if (e.repeat) return;
    if (key === "c") {
      e.preventDefault();
      void this.useRegisteredItem();
      return;
    }
    if (key === "shift") {
      if (this.fieldBlocked()) { this.clear(); return; }
      this.running = true;
      this.tick();
      return;
    }
    if (dir) {
      if (this.ui.modalType) this.ui.navigateMenu(dir);
      else if (this.game.battle) this.ui.navigateBattle(dir);
      else {
        if (this.fieldBlocked()) { this.clear(); return; }
        this.keys.add(key);
        this.held = dir;
        this.tick();
      }
      return;
    }
    if (["z", "enter", " "].includes(key)) {
      if (this.game.battle && !this.ui.blocked) this.ui.confirmBattle();
      else this.ui.confirm();
    }
    if (["x", "escape"].includes(key)) {
      e.preventDefault();
      this.ui.back();
    }
    if (key === "m") {
      this.ui.modalType ? this.ui.back() : this.ui.showMenu();
    }
  }
  destroy() {
    this.abort.abort();
    this.clear();
  }
}
