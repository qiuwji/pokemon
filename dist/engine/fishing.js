/** A resumable input/timer domain session. Hosts provide clocks and seeded rules; no UI or browser dependency. */
export class FishingSession {
  constructor({ rules, roll, now, hasEncounters, lead }) {
    Object.assign(this, { rules, roll, now, hasEncounters, lead });
    this.round = 0;
    this.minimumRounds = rules.minimumRounds(roll);
    if (
      !Number.isInteger(this.minimumRounds) ||
      this.minimumRounds < 1 ||
      this.minimumRounds > 16
    )
      throw new Error("Invalid fishing rounds");
    this.phase = "cast";
    this.deadline = now() + rules.castDuration;
    this.dots = 0;
    this.result = null;
  }
  startRound(at) {
    this.phase = "wait";
    this.dots = 0;
    this.requiredDots = this.rules.dots(this.round, this.roll);
    if (
      !Number.isInteger(this.requiredDots) ||
      this.requiredDots < 1 ||
      this.requiredDots > 64
    )
      throw new Error("Invalid fishing dots");
    this.deadline = at + (this.requiredDots + 1) * this.rules.dotDuration;
    this.started = at;
  }
  finish(result) {
    this.result = result;
    this.phase = "done";
  }
  tick(at = this.now()) {
    if (!Number.isFinite(at)) throw new Error("Invalid fishing clock");
    if (this.phase === "cast" && at >= this.deadline) this.startRound(at);
    if (this.phase === "wait") {
      this.dots = Math.min(
        this.requiredDots,
        Math.floor((at - this.started) / this.rules.dotDuration),
      );
      if (at >= this.deadline) {
        this.round++;
        if (
          this.round === 1 &&
          (!this.hasEncounters || !this.rules.bite(this.lead, this.roll))
        )
          this.finish("no-bite");
        else {
          this.phase = "bite";
          this.deadline = at + this.rules.reelDuration;
        }
      }
    } else if (this.phase === "bite" && at >= this.deadline)
      this.finish("escaped");
    return this.view();
  }
  press() {
    const at = this.now();
    this.tick(at);
    if (this.phase === "wait") this.finish(this.round ? "escaped" : "no-bite");
    else if (this.phase === "bite") {
      if (
        this.round < this.minimumRounds ||
        this.rules.extraRound(this.round, this.roll)
      )
        this.startRound(at);
      else this.finish("caught");
    }
    return this.view();
  }
  cancel() {
    if (!this.result) this.finish("cancelled");
  }
  view() {
    return Object.freeze({
      phase: this.phase,
      dots: this.dots,
      round: this.round,
      result: this.result,
    });
  }
}
