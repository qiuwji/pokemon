import { CAPTURE_TIMING, captureShakes, playTimedCues } from "./timed-cues.js";
import { sampleBattleOpening } from "./battle-opening.js";
import { sampleBattleActions } from "./battle-actions.js";
import { sampleBattleCapture } from "./battle-capture.js";
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
  "trainer-slide": 800,
  recall: 650,
};
/** Seat-based animation state. It consumes snapshots and never calculates battle rules. */
export class BattleDirector {
  constructor(
    timeline,
    {
      registry = null,
      onCue = () => {},
      cuePlan = () => [],
      ballResource = () => null,
      // Injected palette port for impact colours; no type table lives in the presentation layer.
      typeColors = null,
      resolveMessage = (event) => event?.text || "",
      // Pack-provided, content-agnostic opening config: { duration?, ballResource?,
      // variants?: { [environmentKey]: { x, y } } }. The director names no content.
      intro = null,
      layout = battleLayout,
      viewport = null,
      reducedMotion = () => false,
    } = {},
  ) {
    Object.assign(this, {
      timeline,
      registry,
      reducedMotion,
      onCue,
      cuePlan,
      ballResource,
      typeColors,
      resolveMessage,
      intro,
      layout,
      viewport,
    });
    this.reset();
  }
  reset(view = null) {
    this.view = battleView(view);
    this.event = null;
    this.hidden = new Set();
    this.ball = false;
    this.caught = false;
    this.ballTarget = null;
    this.ballArt = null;
    this.trainers = [];
    this.statusBoxes = [];
    this.heldFrame = null;
  }
  get busy() {
    return this.event !== null;
  }
  stage(event) {
    const data = battleView(event), registered = this.registry?.eventAnimation(data);
    const animation = registered?.mode === "replace" ? null : this.registry?.prepareSequence(data, this.view, this.layout(data));
    this.event = {
      data, source: event, animation,
      previous: this.view,
      start: Infinity,
      duration: animation?.duration || 1,
    };
  }
  duration(event) {
    if (event.duration) return event.duration;
    const registered = this.registry?.eventAnimation(event);
    if (registered) return registered.animation.duration;
    if (event.kind === "entry" && this.intro?.duration)
      return this.intro.duration;
    return event.kind === "capture"
      ? CAPTURE_TIMING.settle +
          CAPTURE_TIMING.release +
          captureShakes(event) * CAPTURE_TIMING.shake
      : event.kind === "move" && this.registry?.moves.has(event.move?.id)
        ? this.registry.moves.get(event.move.id).duration
        : (DURATIONS[event.kind] ?? DURATIONS.text);
  }
  async play(event, { message = () => {} } = {}) {
    const staged = this.event?.start === Infinity && this.event.source === event ? this.event.animation : undefined;
    event = battleView(event);
    const previous = this.view || event;
    const registered = this.registry?.eventAnimation(event);
    const animation = staged !== undefined ? staged : registered?.mode === "replace" ? null : this.registry?.prepareSequence(event, previous, this.layout(event));
    const fullDuration = registered?.mode === "append"
      ? Math.max(animation?.duration || 0, this.duration(event))
      : animation?.duration || this.duration(event);
    const duration = this.reducedMotion() ? Math.min(240, fullDuration) : fullDuration;
    const deferredMessage = event.kind === "capture" || animation?.messageAt === "end";
    this.view = event;
    this.heldFrame = null;
    try {
      await playTimedCues(
        this.timeline,
        duration,
        (start) => {
          this.event = { data: event, previous, start, duration, animation };
          if (event.kind === "switch") this.hidden.delete(event.targetSeat);
          if (!deferredMessage) {
            message(this.resolveMessage(event));
            this.onCue(event.kind, event);
          }
        },
        () => {
          if (animation?.holdFinal) this.heldFrame = animation.sample(duration);
          if (animation?.sample(duration).statusBoxes?.length) this.statusBoxes = animation.sample(duration).statusBoxes;
          if (event.kind === "trainer-slide")
            this.trainers = (event.trainers || []).map(trainer => ({ ...trainer, ...this.trainerPosition(trainer), opacity: 1 }));
          if (event.introPhase === "slide") {
            this.trainers = (event.trainers || []).map(trainer => ({ ...trainer, ...this.trainerPosition(trainer), opacity: 1, frame: trainer.rest || 0 }));
            for (const c of event.combatants)
              if (event.trainers?.some(trainer => !!trainer.back === !!this.layout(event).get(c.seatId)?.back)) this.hidden.add(c.seatId);
          }
          if (event.introPhase === "send") {
            for (const seat of event.sendSeats || []) this.hidden.delete(seat);
            this.trainers = this.trainers.filter(trainer => !!trainer.back !== event.sendBack);
          }
          if (["faint", "vacancy", "recall"].includes(event.kind))
            this.hidden.add(event.targetSeat);
          if (event.kind === "ball") {
            this.ball = true;
            this.ballTarget = event.targetSeat || event.combatants[1]?.seatId;
            this.ballArt = this.ballResource(event);
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
        animation?.cues && !this.reducedMotion() ? animation.cues : this.cuePlan(event, { duration, reducedMotion: this.reducedMotion() }),
        (id) => this.onCue(id, event),
      );
    } finally { this.event = null; }
    if (deferredMessage) {
      // Rules decide once; content can announce a result after the visual phase has settled.
      const text = this.resolveMessage(event);
      message(text);
      this.onCue(event.kind, event);
      if (text) {
        const hold = this.reducedMotion() ? 240 : DURATIONS.text;
        await this.timeline.play(
          hold,
          (start) => {
            this.event = {
              data: { ...event, kind: "text" },
              previous: event,
              start,
              duration: hold,
            };
          },
          () => {
            this.event = null;
          },
        );
      }
    }
  }
  applyFrame(result, sampled) {
    const { actors, combatants } = result;
    for (const pose of sampled.poses || []) {
      const target = actors.find(a => a.seatId === pose.seatId);
      if (target) Object.assign(target, pose);
    }
    result.sprites = sampled.sprites || [];
    if (sampled.statusBoxes?.length) result.statusBoxes = sampled.statusBoxes;
    const scene = sampled.scenes?.[0];
    if (scene) {
      result.background = { x: scene.backgroundX || 0, split: scene.split || false };
      result.clip = scene.clip;
      if (scene.hideTrainers) result.trainers = [];
      if (scene.hideBall) { result.ball = null; result.balls = []; }
    }
    result.healthBars = sampled.healthBars || [];
    for (const bar of result.healthBars) {
      const mon = combatants.find(c => c.seatId === bar.seatId)?.monster;
      if (mon) mon.hp = bar.hp;
    }
  }
  trainerPosition(trainer) {
    const back = typeof trainer === "boolean" ? trainer : !!trainer.back;
    const position = trainer.position || this.intro?.trainerPositions?.[back ? "home" : "away"] ||
      { x: back ? 65 : 248, y: back ? 158 : 74 };
    return { ...position, y: position.y + (trainer.offsetY || 0) };
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
      layout = this.layout(current);
    const actors = combatants.map((c) => ({
      seatId: c.seatId,
      x: 0,
      y: 0,
      scale: 1,
      opacity: !c.monster || this.hidden.has(c.seatId) ? 0 : 1,
      flash: false,
    }));
    const result = {
      registry: this.registry,
      now,
      reducedMotion: this.reducedMotion(),
      view: current,
      combatants,
      actors,
      layout,
      viewport: this.viewport,
      trainers: this.trainers,
      statusBoxes: this.statusBoxes,
      effect: null,
      effects: [],
      ball: this.ball
        ? {
            x: layout.get(this.ballTarget)?.x ?? 252,
            y: (layout.get(this.ballTarget)?.baseline ?? 97) - 19,
            angle: 0,
            sealed: this.caught,
            resource: this.ballArt,
            size: this.viewport ? 16 : 20,
          }
        : null,
    };
    if (!this.event) {
      if (this.heldFrame) this.applyFrame(result, this.heldFrame);
      return result;
    }
    const { data: e, previous, start, duration, animation } = this.event,
      t = clamp((now - start) / duration),
      subject = ["hurt", "heal", "faint", "switch", "form", "recall"].includes(e.kind)
        ? e.targetSeat
        : e.actorSeat;
    const actor = actors.find((a) => a.seatId === subject),
      pose = layout.get(subject);
    if (["hurt", "heal"].includes(e.kind) && (!animation || this.reducedMotion()))
      for (const c of combatants) {
        const old = previous.combatants.find(
          (p) => p.seatId === c.seatId,
        )?.monster;
        if (c.monster && old && c.monster.uid === old.uid)
          c.monster.hp = Math.round(lerp(old.hp, c.monster.hp, clamp(t / 0.8)));
      }
    if (e.introPhase === "slide" && this.reducedMotion()) {
      result.trainers = (e.trainers || []).map(trainer => ({ ...trainer, ...this.trainerPosition(trainer), opacity: 1, frame: trainer.rest || 0 }));
      actors.forEach(a => { if (result.trainers.some(trainer => !!trainer.back === !!layout.get(a.seatId).back)) a.opacity = 0; });
    }
    if (this.reducedMotion() || e.offscreen) return result;
    const registered = this.registry?.eventAnimation(e);
    if (animation) {
      const sampled = animation.sample(Math.max(0, now - start));
      this.applyFrame(result, sampled);
    }

    // Registered replacements own cosmetics; HP interpolation and event lifecycle remain above.
    if (!animation && registered?.mode !== "replace") {
      const context = { e, previous, start, duration, now, t, subject, actor, pose };
      const ports = {
        intro: this.intro, viewport: this.viewport, trainers: this.trainers,
        trainerPosition: trainer => this.trainerPosition(trainer),
        registry: this.registry,
        typeColors: this.typeColors, ballResource: this.ballResource,
      };
      sampleBattleOpening(result, context, ports) || sampleBattleActions(result, context, ports) || sampleBattleCapture(result, context, ports);
    }

    if (registered) {
      const sampled = this.registry.sampleAnimation(
        registered.animation,
        e,
        layout,
        t,
      );
      result.effects =
        registered.mode === "append"
          ? [...result.effects, ...sampled.effects]
          : sampled.effects;
      for (const pose of sampled.poses) {
        const target = actors.find((a) => a.seatId === pose.seatId);
        if (target) Object.assign(target, pose);
      }
    } else if (!animation && e.kind === "move" && this.registry) {
      const definition = this.registry.moves.get(e.move?.id);
      if (definition?.poses)
        for (const pose of this.registry.sampleAnimation(
          definition,
          e,
          layout,
          t,
        ).poses) {
          const target = actors.find((a) => a.seatId === pose.seatId);
          if (target) Object.assign(target, pose);
        }
    }
    if (this.viewport && result.ball) result.ball.size = 16;
    result.view = battleView({ ...current, combatants });
    result.effect = result.effects[0] || null;
    return result;
  }
}
