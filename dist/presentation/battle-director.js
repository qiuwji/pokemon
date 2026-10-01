import { battleView, battleLayout } from "./battle-view.js";
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
  choice: 120,
  vacancy: 180,
  failed: 450,
};
/** Seat-based animation state. It consumes snapshots and never calculates battle rules. */
export class BattleDirector {
  constructor(timeline, { profiles = {}, reducedMotion = () => false } = {}) {
    Object.assign(this, { timeline, profiles, reducedMotion });
    this.reset();
  }
  reset(view = null) {
    this.view = battleView(view);
    this.event = null;
    this.hidden = new Set();
    this.ball = false;
    this.caught = false;
  }
  get busy() {
    return this.event !== null;
  }
  stage(event) {
    this.event = {
      data: battleView(event),
      previous: this.view,
      start: Infinity,
      duration: 1,
    };
  }
  duration(event) {
    return event.kind === "capture"
      ? 700 + event.shakes * 420
      : (DURATIONS[event.kind] ?? DURATIONS.text);
  }
  async play(event, { message = () => {} } = {}) {
    event = battleView(event);
    const duration = this.reducedMotion()
        ? Math.min(240, this.duration(event))
        : this.duration(event),
      previous = this.view || event;
    this.view = event;
    await this.timeline.play(
      duration,
      (start) => {
        this.event = { data: event, previous, start, duration };
        if (event.kind === "switch") this.hidden.delete(event.targetSeat);
        message(event.text || "");
      },
      () => {
        if (event.kind === "faint" || event.kind === "vacancy")
          this.hidden.add(event.targetSeat);
        if (event.kind === "ball") {
          this.ball = true;
          this.hidden.add(event.targetSeat || event.combatants[1]?.seatId);
        }
        if (event.kind === "capture") {
          this.caught = !!event.caught;
          if (!event.caught) {
            this.ball = false;
            this.hidden.delete(event.targetSeat || event.combatants[1]?.seatId);
          }
        }
        this.event = null;
      },
    );
  }
  sample(now = this.timeline.now()) {
    if (!this.view) return null;
    const combatants = this.view.combatants.map((c) => ({
      ...c,
      monster: c.monster
        ? { ...c.monster, stats: { ...c.monster.stats } }
        : null,
    }));
    const current = battleView({ ...this.view, combatants }),
      layout = battleLayout(current);
    const actors = combatants.map((c) => ({
      seatId: c.seatId,
      x: 0,
      y: 0,
      scale: 1,
      opacity: !c.monster || this.hidden.has(c.seatId) ? 0 : 1,
      flash: false,
    }));
    const result = {
      view: current,
      combatants,
      actors,
      layout,
      effect: null,
      effects: [],
      ball: this.ball ? { x: 252, y: 78, angle: 0, sealed: this.caught } : null,
    };
    if (!this.event) return result;
    const { data: e, previous, start, duration } = this.event,
      t = clamp((now - start) / duration),
      subject = ["hurt", "heal", "faint", "switch"].includes(e.kind)
        ? e.targetSeat
        : e.actorSeat;
    const actor = actors.find((a) => a.seatId === subject),
      pose = layout.get(subject);
    if (["hurt", "heal"].includes(e.kind))
      for (const c of combatants) {
        const old = previous.combatants.find(
          (p) => p.seatId === c.seatId,
        )?.monster;
        if (c.monster && old && c.monster.uid === old.uid)
          c.monster.hp = Math.round(lerp(old.hp, c.monster.hp, clamp(t / 0.8)));
      }
    if (this.reducedMotion() || e.offscreen) return result;
    if (e.kind === "entry")
      for (const a of actors) {
        a.x = (layout.get(a.seatId).back ? -130 : 150) * (1 - t);
        a.opacity = t;
      }
    else if (e.kind === "move" && actor) {
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
        actor.x = Math.round(Math.sin(t * Math.PI) * (pose.back ? 20 : -20));
        actor.y = -Math.round(Math.sin(t * Math.PI) * 6);
      }
      const targets = e.targetSeats || [e.targetSeat];
      result.effects = targets
        .filter((id) => layout.has(id))
        .map((id) => ({
          kind: profile,
          type: e.move?.type || "normal",
          successful: e.move?.successful !== false,
          source: pose,
          target: layout.get(id),
          sourceSeat: e.actorSeat,
          targetSeat: id,
          side: pose.back ? 0 : 1,
          t,
        }));
    } else if (e.kind === "hurt" && actor) {
      actor.x = Math.round(Math.sin(t * Math.PI * 10) * 5 * (1 - t));
      actor.flash = t < 0.65 && Math.floor(t * 12) % 2 === 0;
    } else if (e.kind === "faint" && actor) {
      actor.y = Math.round(t * 55);
      actor.opacity = 1 - t;
    } else if (e.kind === "switch" && actor) {
      const entry = combatants.find((c) => c.seatId === subject),
        old = previous.combatants.find((c) => c.seatId === subject)?.monster;
      if (t < 0.4) {
        entry.monster = old;
        actor.scale = old?.hp > 0 ? 1 - t / 0.4 : 0;
      } else actor.scale = clamp((t - 0.5) / 0.5);
      result.effects = [
        {
          kind: "release",
          side: pose.back ? 0 : 1,
          source: pose,
          target: pose,
          t,
        },
      ];
    } else if (["heal", "level"].includes(e.kind) && pose)
      result.effects = [
        {
          kind: "heal",
          side: pose.back ? 0 : 1,
          source: pose,
          target: pose,
          t,
        },
      ];
    else if (e.kind === "ball") {
      const flight = clamp(t / 0.7);
      result.ball = {
        x: lerp(72, 252, flight),
        y: lerp(124, 62, flight) - Math.sin(flight * Math.PI) * 72,
        angle: flight * Math.PI * 4,
      };
      const target = actors.find((a) => a.seatId === e.targetSeat) || actors[1];
      if (t > 0.65) {
        target.scale = 1 - clamp((t - 0.65) / 0.25);
        target.opacity = target.scale;
      }
    } else if (e.kind === "capture") {
      const shakeTime = Math.max(0, now - start - 250),
        shaking = shakeTime < e.shakes * 420,
        end = clamp((now - start - 250 - e.shakes * 420) / 450);
      result.ball = {
        x: 252,
        y: 78,
        angle: shaking ? Math.sin((shakeTime / 420) * Math.PI * 2) * 0.28 : 0,
        sealed: !!e.caught && !shaking,
      };
      const target = actors.find((a) => a.seatId === e.targetSeat) || actors[1];
      if (!e.caught && end > 0) {
        result.ball = null;
        target.opacity = end;
        target.scale = end;
        result.effects = [{ kind: "release", side: 1, t: end }];
      }
      if (e.caught && end > 0)
        result.effects = [{ kind: "stars", side: 1, t: end }];
    }
    result.view = battleView({ ...current, combatants });
    result.effect = result.effects[0] || null;
    return result;
  }
}
