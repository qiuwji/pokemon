import { callSync, readOnly } from "../engine/extensions/values.js";
/** Draws registered scene definitions on a separate overlay above menus. */
export class SceneDOM {
  constructor(
    element,
    {
      definitions,
      assets,
      document: doc = element.ownerDocument,
      onError = () => {},
    },
  ) {
    Object.assign(this, { element, definitions, assets, onError });
    const canvas = doc.createElement("canvas");
    canvas.width = 320;
    canvas.height = 224;
    canvas.style.cssText = "width:100%;height:100%;image-rendering:pixelated";
    element.replaceChildren(canvas);
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
  }
  render(frame) {
    const definition = frame && this.definitions.get(frame.id);
    this.element.hidden = !definition?.draw;
    if (!definition?.draw) return;
    this.ctx.clearRect(0, 0, 320, 224);
    this.ctx.save();
    try {
      callSync(
        definition.draw,
        [this.ctx, readOnly(frame), this.assets],
        this.onError,
      );
    } catch (error) {
      this.onError(error);
    } finally {
      this.ctx.restore();
    }
  }
}
