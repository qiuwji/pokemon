/** DOM overlay must cover HUD as well as Canvas before a scene commit. */
export class TransitionDOM {
  constructor(element) {
    this.element = element;
    element.replaceChildren(
      ...Array.from({ length: 8 }, () => document.createElement("i")),
    );
    this.bars = [...element.children];
  }
  render(frame) {
    const { opacity, kind } = frame;
    this.element.hidden = opacity <= 0;
    this.element.dataset.kind = kind === "encounter" ? "shutter" : "fade";
    if (kind === "encounter") {
      this.element.style.opacity = "1";
      this.bars.forEach((bar, i) => {
        bar.style.width = `${Math.min(100, Math.max(0, opacity * 125 - (i % 2) * 25))}%`;
      });
    } else this.element.style.opacity = String(opacity);
  }
}
