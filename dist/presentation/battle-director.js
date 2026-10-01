const clamp = (t) => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;
const DURATIONS = {
  entry: 850,
  move: 760,
  hurt: 650,
  faint: 650,
  switch: 850,
  heal: 700,
  ball: 850,
  level: 900,
  text: 550,
  invalid: 500,
  end: 650,
  learn: 700,
};

/** Consumes event snapshots. Never calculates damage or uses game RNG. */
export class BattleDirector {
  constructor(timeline, { profiles = {}, reducedMotion = () => false } = {}) {
    Object.assign(this, { timeline, profiles, reducedMotion });
    this.reset();
  }
  reset(view = null) {
    this.view = view;
    this.event = null;
    this.hidden = [false, false];
    this.ball = false;
    this.caught = false;
  }
  get busy() {
    return this.event !== null;
  }
  stage(event) {
    this.event = {
      data: event,
      previous: this.view,
      start: Infinity,
      duration: 1,
    };
  }
  duration(event) {
    if (event.kind === "capture") return 700 + event.shakes * 420;
    return DURATIONS[event.kind] ?? DURATIONS.text;
  }
  async play(event, { message = () => {} } = {}) {
    const duration = this.reducedMotion()
      ? Math.min(240, this.duration(event))
      : this.duration(event);
    const previous = this.view || { player: event.player, enemy: event.enemy };
    this.view = { player: event.player, enemy: event.enemy };
    await this.timeline.play(
      duration,
      (start) => {
        this.event = { data: event, previous, start, duration };
        if (event.kind === "switch") this.hidden[0] = false;
        message(event.text || "");
      },
      () => {
        if (event.kind === "faint") this.hidden[event.side] = true;
        if (event.kind === "ball") {
          this.ball = true;
          this.hidden[1] = true;
        }
        if (event.kind === "capture") this.caught = !!event.caught;
        if (event.kind === "capture" && !event.caught) {
          this.ball = false;
          this.hidden[1] = false;
        }
        this.event = null;
      },
    );
  }
  sample(now = this.timeline.now()) {
    if (!this.view) return null;
    const view = {
      player: { ...this.view.player },
      enemy: { ...this.view.enemy },
    };
    const actors = [0, 1].map((side) => ({
      x: 0,
      y: 0,
      scale: 1,
      opacity: this.hidden[side] ? 0 : 1,
      flash: false,
    }));
    const result = {
      view,
      actors,
      effect: null,
      ball: this.ball ? { x: 252, y: 78, angle: 0, sealed: this.caught } : null,
    };
    if (!this.event) return result;
    const { data: e, previous, start, duration } = this.event;
    const t = clamp((now - start) / duration),
      side = e.side ?? 0,
      actor = actors[side];
    if (e.kind === "hurt" || e.kind === "heal") {
      for (const key of ["player", "enemy"])
        view[key].hp = Math.round(
          lerp(previous[key].hp, view[key].hp, clamp(t / 0.8)),
        );
    }
    // Accessibility keeps temporal sequencing and HP interpolation, without flashes.
    if (this.reducedMotion()) return result;
    if (e.kind === "entry") {
      actors[0].x = -130 * (1 - t);
      actors[1].x = 150 * (1 - t);
      actors[0].opacity = actors[1].opacity = t;
    } else if (e.kind === "move") {
      const profile =
        this.profiles[e.move?.id] ||
        (e.move?.power === 0
          ? "status"
          : ["fire", "water", "grass", "electric", "psychic"].includes(
                e.move?.type,
              )
            ? "projectile"
            : "contact");
      if (profile === "contact") {
        actor.x = Math.round(Math.sin(t * Math.PI) * (side ? -20 : 20));
        actor.y = -Math.round(Math.sin(t * Math.PI) * 6);
      }
      result.effect = {
        kind: profile,
        type: e.move?.type || "normal",
        successful: e.move?.successful !== false,
        side,
        t,
      };
    } else if (e.kind === "hurt") {
      actor.x = Math.round(Math.sin(t * Math.PI * 10) * 5 * (1 - t));
      actor.flash = t < 0.65 && Math.floor(t * 12) % 2 === 0;
    } else if (e.kind === "faint") {
      actor.y = Math.round(t * 55);
      actor.opacity = 1 - t;
    } else if (e.kind === "switch") {
      if (t < 0.4) {
        view.player = previous.player;
        actor.scale = 1 - t / 0.4;
      } else {
        actor.scale = clamp((t - 0.5) / 0.5);
      }
      result.effect = { kind: "release", side: 0, t };
    } else if (e.kind === "heal" || e.kind === "level")
      result.effect = { kind: "heal", side, t };
    else if (e.kind === "ball") {
      const flight = clamp(t / 0.7);
      result.ball = {
        x: lerp(72, 252, flight),
        y: lerp(124, 62, flight) - Math.sin(flight * Math.PI) * 72,
        angle: flight * Math.PI * 4,
      };
      if (t > 0.65) {
        actors[1].scale = 1 - clamp((t - 0.65) / 0.25);
        actors[1].opacity = actors[1].scale;
      }
    } else if (e.kind === "capture") {
      const elapsed = now - start,
        shakeTime = Math.max(0, elapsed - 250),
        shaking = shakeTime < e.shakes * 420;
      const end = clamp((elapsed - 250 - e.shakes * 420) / 450);
      result.ball = {
        x: 252,
        y: 78,
        angle: shaking ? Math.sin((shakeTime / 420) * Math.PI * 2) * 0.28 : 0,
        sealed: !!e.caught && !shaking,
      };
      if (!e.caught && end > 0) {
        result.ball = null;
        actors[1].opacity = end;
        actors[1].scale = end;
        result.effect = { kind: "release", side: 1, t: end };
      }
      if (e.caught && end > 0)
        result.effect = { kind: "stars", side: 1, t: end };
    }
    return result;
  }
}
