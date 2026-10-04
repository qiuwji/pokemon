/** Pure editing and original clock-sprite geometry; no saved state, timers or DOM. */
export class WallClockDial {
  constructor(hour = 10, minute = 0) { this.minutes = hour * 60 + minute; }
  adjust(delta) {
    this.minutes = ((this.minutes + delta) % 1440 + 1440) % 1440;
    return this.value();
  }
  point(x, y) {
    const angle = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2);
    this.minutes = Math.floor(this.minutes / 60) * 60 + Math.round(angle / (Math.PI * 2) * 60) % 60;
    return this.value();
  }
  value() { return { hour: Math.floor(this.minutes / 60), minute: this.minutes % 60 }; }
}
export function clockHands({ hour, minute, second = 0 }) {
  return { hour: ((hour % 12) + minute / 60 + second / 3600) * Math.PI / 6,
    minute: (minute + second / 60) * Math.PI / 30, second: second * Math.PI / 30 };
}
/** Assets are supplied by the pack. The source UI has two hands, not a seconds hand. */
export function drawWallClock(ctx, time, { background, hands } = {}) {
  ctx.clearRect(0, 0, 240, 160);
  ctx.imageSmoothingEnabled = false;
  if (background?.complete && background.naturalWidth) ctx.drawImage(background, 0, 0);
  if (!hands?.complete || !hands.naturalWidth) return;
  const angles = clockHands(time);
  for (const [angle, y] of [[angles.minute, 0], [angles.hour, 64]]) {
    ctx.save(); ctx.translate(120, 80); ctx.rotate(angle);
    ctx.drawImage(hands, 0, y, 64, 64, -32, -56, 64, 64); ctx.restore();
  }
  // Period indicator shares the original sheet (tile 128 / 132).
  const phases = time.hour < 12 ? [90, 45] : [135, 90];
  for (const [i, phase] of phases.entries()) {
    const angle = phase * Math.PI / 180;
    ctx.drawImage(hands, i * 16, 128, 16, 16,
      Math.round(112 + Math.cos(angle) * 30), Math.round(72 + Math.sin(angle) * 30), 16, 16);
  }
}
