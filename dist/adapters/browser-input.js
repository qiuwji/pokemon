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
  constructor({ document: doc = document, game, ui }) {
    Object.assign(this, { doc, game, ui });
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
    window.addEventListener("blur", () => this.clear(), options);
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
            game.move(dir);
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
  }
  tick() {
    if (this.held) this.game.move(this.held, { running: this.running });
  }
  keydown(e) {
    if (e.key.toLowerCase() === "tab") {
      this.ui.focusTrap(e);
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
    if (key === "shift") {
      this.running = true;
      return;
    }
    if (dir) {
      if (this.ui.modalType) this.ui.navigateMenu(dir);
      else if (this.game.battle) this.ui.navigateBattle(dir);
      else {
        this.keys.add(key);
        this.held = dir;
        this.game.move(dir, { running: this.running });
      }
      return;
    }
    if (["z", "enter", " "].includes(key)) this.ui.confirm();
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
