let nextFilter = 0;
/** Generic sRGB channel offsets for scene surfaces, including DOM text. No game palette policy. */
export class ColorOffsetDOM {
  constructor(document, targets) {
    this.document = document;
    this.targets = targets;
    this.previous = new Map();
    this.functions = null;
  }
  render(offset) {
    if (!offset || offset.every(n => n === 0)) {
      for (const [target, filter] of this.previous) target.style.filter = filter;
      this.previous.clear();
      return;
    }
    if (!this.functions) {
      const doc = this.document, ns = "http://www.w3.org/2000/svg", svg = doc.createElementNS(ns, "svg"),
        defs = doc.createElementNS(ns, "defs"), filter = doc.createElementNS(ns, "filter"),
        transfer = doc.createElementNS(ns, "feComponentTransfer");
      this.id = "scene-color-offset-" + ++nextFilter;
      svg.setAttribute("width", "0"); svg.setAttribute("height", "0");
      svg.style.position = "absolute"; svg.setAttribute("aria-hidden", "true");
      filter.setAttribute("id", this.id); filter.setAttribute("color-interpolation-filters", "sRGB");
      this.functions = ["R", "G", "B"].map(channel => {
        const fn = doc.createElementNS(ns, "feFunc" + channel);
        fn.setAttribute("type", "linear"); fn.setAttribute("slope", "1"); transfer.append(fn); return fn;
      });
      filter.append(transfer); defs.append(filter); svg.append(defs); doc.body.append(svg);
    }
    this.functions.forEach((fn, i) => fn.setAttribute("intercept", String(offset[i] / 255)));
    for (const target of this.targets()) {
      if (!target?.style) continue;
      if (!this.previous.has(target)) this.previous.set(target, target.style.filter || "");
      target.style.filter = `${this.previous.get(target)} url(#${this.id})`.trim();
    }
  }
}
