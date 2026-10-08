/** One input promise and cancellable injected clock, shared by touch and keyboard buttons. */
export class ChoiceDOM {
  constructor({ document, container, clock, onSelect, onError }) {
    Object.assign(this, { document, container, clock, onSelect, onError });
    this.active = true;
    this.handle = null;
  }
  mount(prompt, options, { default: selected, timeoutMs, onHighlight } = {}) {
    const text = this.document.createElement("p");
    text.textContent = prompt;
    const grid = this.document.createElement("div");
    grid.className = "menu-grid";
    for (const option of options) {
      const button = this.document.createElement("button");
      button.className = "menu-tile";
      button.setAttribute("data-choice", option.id);
      button.textContent = option.label;
      button.disabled = !!option.disabled;
      if (option.disabled) button.title = option.disabledReason;
      button.onclick = () => {
        if (this.active && !button.disabled) this.onSelect(option.id);
      };
      button.onfocus = () => {
        if (!this.active || button.disabled || !onHighlight) return;
        try {
          const pending = onHighlight(option.id);
          if (!pending?.then) return;
          const buttons = [...grid.querySelectorAll("button")];
          buttons.forEach(b => { b.disabled = true; });
          Promise.resolve(pending).then(() => {
            if (this.active) {
              buttons.forEach((b, i) => { b.disabled = !!options[i].disabled; });
              button.focus();
            }
          }, error => { if (this.active) this.onError(error); });
        } catch (error) { this.onError(error); }
      };
      grid.append(button);
      if (option.id === selected && !option.disabled)
        this.defaultButton = button;
    }
    this.container.append(text, grid);
    const focus =
      this.defaultButton ||
      [...grid.querySelectorAll("button")].find((b) => !b.disabled);
    focus?.focus();
    if (timeoutMs !== undefined) {
      this.deadline = this.clock.now() + timeoutMs;
      const tick = () => {
        if (!this.active) return;
        try {
          if (this.clock.now() >= this.deadline) this.onSelect(selected);
          else this.handle = this.clock.request(tick);
        } catch (error) {
          this.onError(error);
        }
      };
      this.handle = this.clock.request(tick);
    }
  }
  dispose() {
    this.active = false;
    if (this.handle !== null) this.clock.cancel(this.handle);
    this.handle = null;
  }
}
