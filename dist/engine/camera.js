/** Portable camera focus. Coordinates are world pixels, not viewport offsets. */
export class CameraRig {
  constructor(timeline) {
    this.timeline = timeline;
    this.reset();
  }
  reset() {
    this.mode = "follow";
    this.point = null;
    this.track = null;
  }
  sample(player, now = this.timeline.now()) {
    if (!this.track) return this.mode === "follow" ? player : this.point;
    const a = this.track;
    const t = Math.max(0, Math.min(1, (now - a.start) / a.ms));
    const eased = t * t * (3 - 2 * t);
    const to = a.follow ? player : a.to;
    return {
      x: a.from.x + (to.x - a.from.x) * eased,
      y: a.from.y + (to.y - a.from.y) * eased,
      zone: to.zone,
    };
  }
  async pan(player, to, ms = 400) {
    if (this.track) throw new Error("Camera is already moving");
    if (player.zone !== to.zone)
      throw new Error("Camera cannot pan between disconnected scenes");
    const from = this.sample(player);
    this.mode = "hold";
    this.point = to;
    this.track = { from, to, start: this.timeline.now(), ms: Math.max(1, ms) };
    try {
      await this.timeline.wait(ms);
    } finally {
      this.track = null;
    }
  }
  async follow(player, ms = 400) {
    if (this.track) throw new Error("Camera is already moving");
    const from = this.sample(player);
    this.mode = "follow";
    this.track = {
      from,
      follow: true,
      start: this.timeline.now(),
      ms: Math.max(1, ms),
    };
    try {
      await this.timeline.wait(ms);
    } finally {
      this.track = null;
    }
  }
}
