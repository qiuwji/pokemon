/** Semantic UI control port. Opaque button identities expire when the displayed UI changes. */
export class ControlDOM {
  constructor({ root, document, dialogue, modalType }) {
    Object.assign(this, { root, document, dialogue, modalType });
    this.signature = null;
    this.revision = 0;
  }
  inspect() {
    const dialog = this.dialogue(), line = dialog?.lines[dialog.index];
    const previous = this.buttons || [];
    this.buttons = [...this.root.querySelectorAll("button")].filter(b => !b.hidden && b.getClientRects().length);
    const buttons = this.buttons.map((button, index) => ({
      index, label: (button.textContent || button.getAttribute("aria-label") || "").trim().slice(0, 256),
      disabled: !!button.disabled || button.getAttribute("data-control") === "local",
    }));
    const dialogue = dialog ? {
      name: line.name ?? dialog.name, text: line.text, index: dialog.index, total: dialog.lines.length,
    } : null;
    const next = JSON.stringify({ modal: this.modalType(), dialogue, buttons });
    if (next !== this.signature || previous.length !== this.buttons.length || previous.some((button, i) => button !== this.buttons[i]) || dialog !== this.lastDialog) { this.signature = next; this.revision++; }
    this.lastDialog = dialog;
    return { modal: this.modalType(), dialogue,
      buttons: buttons.map(({ index, ...rest }) => ({ id: `ui-${this.revision}-${index}`, ...rest })) };
  }
  confirm() {
    const state = this.inspect(), index = this.buttons.indexOf(this.document.activeElement);
    if (index < 0) throw new Error("No focused UI control");
    return this.activate(state.buttons[index].id);
  }
  activate(id) {
    const state = this.inspect(), index = state.buttons.findIndex(b => b.id === id);
    if (index < 0 || state.buttons[index].disabled) throw new Error("UI control unavailable or stale");
    this.buttons[index].click();
    return true;
  }
}
