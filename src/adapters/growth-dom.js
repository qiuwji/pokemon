/** A pixel presentation adapter driven by the shared animation clock. No domain mutations. */
export class GrowthDOM {
  constructor(element, { asset = (id) => `generated/assets/${id}-front.png` } = {}) {
    Object.assign(this, { element, asset });
    element.className = "growth-overlay";
    element.innerHTML =
      '<div class="growth-stars"></div><img class="growth-before" alt=""><img class="growth-after" alt=""><div class="growth-flash"></div><p class="growth-caption"></p>';
    this.before = element.querySelector(".growth-before");
    this.after = element.querySelector(".growth-after");
    this.flash = element.querySelector(".growth-flash");
    this.caption = element.querySelector(".growth-caption");
  }
  render(frame) {
    this.element.hidden = !frame;
    if (!frame) return;
    const { phase, progress: t, from, to, kind } = frame;
    for (const [image, id] of [
      [this.before, from],
      [this.after, to],
    ])
      if (image.dataset.asset !== id) {
        image.src = this.asset(id);
        image.dataset.asset = id;
      }
    const revealed = phase === "reveal",
      transforming = phase === "transform";
    this.element.dataset.kind = kind;
    this.before.hidden = revealed;
    this.after.hidden = !revealed;
    this.before.style.transform = `translate(${transforming && kind === "hatch" ? Math.round(Math.sin(t * Math.PI * 26) * (1 + t * 6)) : 0}px, 0) scale(${transforming && kind === "evolution" ? 1 + Math.sin(t * Math.PI * 10) * 0.15 : 1})`;
    this.before.style.filter =
      transforming && kind === "evolution" ? "brightness(0) invert(1)" : "";
    this.flash.style.opacity =
      phase === "covered"
        ? "1"
        : transforming
          ? String(Math.max(0, (t - 0.7) / 0.3))
          : revealed
            ? String(1 - t)
            : "0";
    this.caption.textContent =
      kind === "hatch"
        ? "咦……蛋开始动了！"
        : kind === "evolution"
          ? "伙伴身上出现了光芒！"
          : kind === "trade"
            ? "两位伙伴正在交换……"
            : "收到了宝可梦的蛋！";
  }
}
