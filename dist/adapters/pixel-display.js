/** Size the raster to screen pixels, so CSS never enlarges a low-resolution buffer. */
export class PixelDisplay {
  constructor(canvas, resize, { window: win = canvas.ownerDocument.defaultView } = {}) {
    this.canvas = canvas;
    this.resize = resize;
    this.win = win;
    this.measure = () => {
      const { width, height } = canvas.getBoundingClientRect();
      this.update(width, height);
    };
    this.observer = new win.ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      this.update(width, height);
    });
    this.observer.observe(canvas);
    win.addEventListener('resize', this.measure);
    this.measure();
  }
  update(width, height) {
    if (!(width > 0 && height > 0)) return;
    const ratio = this.win.devicePixelRatio || 1;
    this.resize(Math.max(1, Math.round(width * ratio)), Math.max(1, Math.round(height * ratio)));
  }
  dispose() {
    this.observer.disconnect();
    this.win.removeEventListener('resize', this.measure);
  }
}
