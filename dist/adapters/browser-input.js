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
/** Input mapping is replaceable; field and battle services don't inspect keys. */
export class BrowserInput {
  constructor({ document: doc = document, window: win = window, game, ui }) {
    Object.assign(this, { doc, win, game, ui });
    this.keys = new Set();
    this.held = null;
    this.running = false;
    this.abort = new AbortController();
    const options = { signal: this.abort.signal };
    doc.addEventListener("keydown", (e) => this.keydown(e), options);
    doc.addEventListener(
      "keyup",
      (e) => {
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
      button.addEventListener(
        "pointerdown",
        (e) => {
          e.preventDefault();
          button.setPointerCapture(e.pointerId);
          const dir = button.dataset.dir;
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
        button.addEventListener(type, () => (this.held = null), options);
    });
  }
  clear() {
    this.keys.clear();
    this.held = null;
    this.running = false;
    this.game.resetFieldInput();
  }
  tick() {
    this.game.handleFieldInput({
      direction: this.held,
      secondary: this.running,
      running: this.running,
    });
  }
  async useRegisteredItem() {
    if (this.ui.blocked || this.game.busy || this.game.battle) return;
    this.clear();
    const result = await this.game.useRegisteredItem();
    if (!result.ok) this.ui.toast(result.reason);
  }
  keydown(e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
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
      this.running = true;
      this.tick();
      return;
    }
    if (dir) {
      if (this.ui.modalType) this.ui.navigateMenu(dir);
      else if (this.game.battle) this.ui.navigateBattle(dir);
      else {
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
