import { TransitionPatterns } from "./transition-patterns.js";
/** Overlay covers Canvas, menus and HUD; drawing never commits scenes. */
export class TransitionDOM {
  constructor(
    element,
    {
      document: doc = element.ownerDocument,
      patterns = new TransitionPatterns(),
      styles = {
        encounter: "shutter",
        door: "fade",
        "battle-exit": "fade",
        fly: "wave",
        menu: "blinds",
      },
      onError = () => {},
    } = {},
  ) {
    Object.assign(this, { element, patterns, styles, onError });
    const canvas = doc.createElement("canvas");
    canvas.width = 320;
    canvas.height = 224;
    canvas.style.cssText =
      "width:100%;height:100%;display:block;image-rendering:pixelated";
    canvas.setAttribute("aria-hidden", "true");
    element.replaceChildren(canvas);
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
  }
  render(frame) {
    const opacity = Math.min(1, Math.max(0, frame.opacity));
    this.element.hidden = opacity <= 0;
    if (this.element.hidden) return;
    this.element.style.background = "transparent";
    this.element.style.opacity = "1";
    const kind = this.styles[frame.kind] || frame.kind;
    this.element.dataset.kind = kind;
    this.ctx.clearRect(0, 0, 320, 224);
    try {
      this.patterns.draw(this.ctx, kind, {
        ...frame,
        opacity,
        width: 320,
        height: 224,
      });
    } catch (error) {
      this.onError(error);
      this.ctx.fillStyle = "#101820";
      this.ctx.fillRect(0, 0, 320, 224);
    }
  }
}
