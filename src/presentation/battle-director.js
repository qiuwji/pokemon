import { CAPTURE_TIMING, captureShakes, playTimedCues } from "./timed-cues.js";
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
  constructor(
    timeline,
    {
      profiles = {},
      registry = null,
      onCue = () => {},
      cuePlan = () => [],
      // Optional pack classifier for moves with no explicit profile entry: type -> profile.
      profileFor = null,
      ballResource = () => null,
      // Injected palette port for impact colours; no type table lives in the presentation layer.
      typeColors = null,
      resolveMessage = (event) => event?.text || "",
      // Pack-provided, content-agnostic opening config: { duration?, ballResource?,
      // variants?: { [environmentKey]: { x, y } } }. The director names no content.
      intro = null,
      reducedMotion = () => false,
    } = {},
  ) {
    Object.assign(this, {
      timeline,
      profiles,
      registry,
      reducedMotion,
      onCue,
      cuePlan,
      profileFor,
      ballResource,
      typeColors,
      resolveMessage,
      intro,
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
    event = battleView(event);
    const duration = this.reducedMotion()
        ? Math.min(240, this.duration(event))
        : this.duration(event),
      previous = this.view || event;
    const deferredMessage = event.kind === "capture";
    this.view = event;
    await playTimedCues(
      this.timeline,
      duration,
      (start) => {
        this.event = { data: event, previous, start, duration };
        if (event.kind === "switch") this.hidden.delete(event.targetSeat);
        if (!deferredMessage) {
          message(this.resolveMessage(event));
          this.onCue(event.kind, event);
        }
      },
      () => {
        if (event.kind === "faint" || event.kind === "vacancy")
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
      this.cuePlan(event, { duration, reducedMotion: this.reducedMotion() }),
      (id) => this.onCue(id, event),
    );
    if (deferredMessage) {
      // Rules decide once; the result announcement follows the final shake/release.
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
      registry: this.registry,
      now,
      reducedMotion: this.reducedMotion(),
      view: current,
      combatants,
      actors,
      layout,
      effect: null,
      effects: [],
      ball: this.ball
        ? {
            x: layout.get(this.ballTarget)?.x ?? 252,
            y: (layout.get(this.ballTarget)?.baseline ?? 97) - 19,
            angle: 0,
            sealed: this.caught,
            resource: this.ballArt,
          }
        : null,
    };
    if (!this.event) return result;
    const { data: e, previous, start, duration } = this.event,
      t = clamp((now - start) / duration),
      subject = ["hurt", "heal", "faint", "switch", "form"].includes(e.kind)
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
    const registered = this.registry?.eventAnimation(e);
    // Registered replacements own cosmetics; HP interpolation and event lifecycle remain above.
    if (registered?.mode !== "replace") {
      if (e.kind === "entry") {
        // The pack supplies which environment scrolls and how far; the director is content-agnostic.
        const offset = this.intro?.variants?.[e.environment?.terrain] || null,
          settle = 1 - t;
        if (offset)
          result.background = {
            x: Math.round(offset.x * settle),
            y: Math.round(offset.y * settle),
          };
        // Trainers run in, stop, then throw as the balls open; they retreat once the
        // Pokémon are out, mirroring the reference trainer intro.
        const slide = Math.max(0, 1 - t / 0.25);
        result.trainers = (e.trainers || []).map((trainer) => ({
          ...trainer,
          x:
            (trainer.back ? 65 : 248) +
            (trainer.back ? -1 : 1) * slide * 140,
          y: trainer.back ? 158 : 74,
          opacity: clamp((0.85 - t) / 0.25),
        }));
        // In a trainer battle both trainers throw the pack's ball and their Pokémon
        // appears as it opens; a wild Pokémon just slides in like the reference.
        const ballResource = this.intro?.ballResource;
        if (e.trainers?.length && ballResource) {
          const openT = clamp((t - 0.6) / 0.3);
          for (const a of actors) {
            a.x = 0;
            a.opacity = 1;
            a.scale = openT;
          }
          result.balls = actors.map((a) => {
            const pos = layout.get(a.seatId),
              trainer = pos.back ? { x: 65, y: 158 } : { x: 248, y: 74 },
              throwT = clamp((t - 0.2) / 0.4);
            return {
              resource: ballResource,
              x: lerp(trainer.x, pos.x, throwT),
              y:
                lerp(trainer.y, pos.baseline - 20, throwT) -
                Math.sin(throwT * Math.PI) * 46,
              angle: throwT * Math.PI * 4,
              sealed: false,
            };
          });
          result.ball = result.balls[0];
          if (openT > 0)
            result.effects = actors.map((a) => {
              const pos = layout.get(a.seatId);
              return {
                kind: "release",
                side: pos.back ? 0 : 1,
                source: pos,
                target: pos,
                t: openT,
              };
            });
        } else {
          for (const a of actors) {
            const pos = layout.get(a.seatId);
            a.x = (pos.back ? -130 : 150) * (1 - t);
            a.opacity = t;
          }
        }
      } else if (e.kind === "move" && actor) {
        const profile =
          this.profiles[e.move?.id] ||
          (e.move?.power === 0
            ? "status"
            : this.profileFor?.(e.move?.type) || "contact");
        const lunge =
          this.registry?.animation(e.move, profile).lunge ??
          (profile === "contact" ? 20 : 0);
        if (lunge) {
          actor.x = Math.round(
            Math.sin(t * Math.PI) * (pose.back ? lunge : -lunge),
          );
          actor.y = -Math.round(Math.sin(t * Math.PI) * 6);
        }
        const targets = e.targetSeats || [e.targetSeat];
        result.effects = this.registry
          ? this.registry.sampleMove(e, layout, t, profile)
          : targets
              .filter((id) => layout.has(id))
              .map((id) => ({
                kind: profile,
                type: e.move?.type ?? null,
                successful: e.move?.successful !== false,
                source: pose,
                target: layout.get(id),
                sourceSeat: e.actorSeat,
                targetSeat: id,
                side: pose.back ? 0 : 1,
                t,
              }));
      } else if (
        ["stage", "status", "barrier"].includes(e.kind) &&
        layout.has(e.targetSeat)
      ) {
        result.effects = [
          {
            kind:
              e.kind === "stage"
                ? "stages"
                : e.kind === "status"
                  ? "ailment"
                  : "shield",
            target: layout.get(e.targetSeat),
            source: layout.get(e.actorSeat) || layout.get(e.targetSeat),
            ...(e.amount === undefined ? {} : { amount: e.amount }),
            status: e.status || "confusion",
            t,
          },
        ];
      } else if (e.kind === "form" && actor) {
        actor.flash = t > 0.25 && t < 0.6;
        actor.scale = 1 + Math.sin(t * Math.PI) * 0.12;
      } else if (e.kind === "hurt" && actor) {
        if (e.hit)
          result.effects = [
            {
              kind: "contact",
              source: layout.get(e.actorSeat) || pose,
              target: pose,
              t: 0.5 + t * 0.4,
              type: e.moveType ?? null,
              color: this.typeColors?.(e.moveType) ?? null,
            },
          ];
        actor.x = Math.round(Math.sin(t * Math.PI * 10) * 5 * (1 - t));
        actor.flash = t < 0.65 && Math.floor(t * 12) % 2 === 0;
      } else if (e.kind === "faint" && actor) {
        actor.y = Math.round(t * 55);
        actor.opacity = 1 - t;
      } else if (e.kind === "switch" && actor) {
        const entry = combatants.find((c) => c.seatId === subject),
          old = previous.combatants.find((c) => c.seatId === subject)?.monster,
          trainer = pose.back ? { x: 65, y: 158 } : { x: 248, y: 74 },
          ballResource = this.intro?.ballResource;
        // Recall the outgoing Pokémon with a beam into its ball, then throw the next one out.
        if (t < 0.4) {
          entry.monster = old;
          actor.scale = old?.hp > 0 ? 1 - t / 0.4 : 0;
          const recall = clamp(t / 0.4),
            ball = {
              resource: ballResource,
              x: lerp(pose.x, trainer.x, recall),
              y: lerp(pose.baseline - 19, trainer.y, recall),
              angle: recall * Math.PI * 4,
              sealed: false,
            };
          result.ball = ball;
          result.effects =
            old?.hp > 0
              ? [
                  {
                    kind: "beam",
                    source: pose,
                    target: ball,
                    t: Math.min(1, recall * 3),
                    color: "#f85858",
                    lineWidth: 4,
                    growth: 1,
                  },
                ]
              : [];
        } else {
          // The ball is thrown and lands before the Pokémon appears, not alongside it.
          actor.scale = clamp((t - 0.8) / 0.2);
          const send = clamp((t - 0.4) / 0.4);
          result.ball = {
            resource: ballResource,
            x: lerp(trainer.x, pose.x, send),
            y:
              lerp(trainer.y, pose.baseline - 19, send) -
              Math.sin(send * Math.PI) * 40,
            angle: (1 - send) * Math.PI * 4,
            sealed: false,
          };
          const openT = clamp((t - 0.8) / 0.2);
          result.effects =
            openT > 0
              ? [
                  {
                    kind: "release",
                    side: pose.back ? 0 : 1,
                    source: pose,
                    target: pose,
                    t: openT,
                  },
                ]
              : [];
        }
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
        const flight = clamp(t / 0.7),
          targetPose = layout.get(e.targetSeat) || { x: 252, baseline: 97 },
          sourcePose = layout.get(e.actorSeat) || { x: 72, y: 124 };
        result.ball = {
          resource: this.ballResource(e),
          x: lerp(sourcePose.x, targetPose.x, flight),
          y:
            lerp(sourcePose.y, targetPose.baseline - 35, flight) -
            Math.sin(flight * Math.PI) * 72,
          angle: flight * Math.PI * 4,
        };
        const target =
          actors.find((a) => a.seatId === e.targetSeat) || actors[1];
        if (t > 0.65) {
          target.scale = 1 - clamp((t - 0.65) / 0.25);
          target.opacity = target.scale;
        }
      } else if (e.kind === "capture") {
        const shakeTime = Math.max(0, now - start - CAPTURE_TIMING.settle),
          shaking = shakeTime < captureShakes(e) * CAPTURE_TIMING.shake,
          end = clamp(
            (now -
              start -
              CAPTURE_TIMING.settle -
              captureShakes(e) * CAPTURE_TIMING.shake) /
              CAPTURE_TIMING.release,
          );
        const targetPose = layout.get(e.targetSeat) || { x: 252, baseline: 97 };
        result.ball = {
          resource: this.ballResource(e),
          x: targetPose.x,
          y: targetPose.baseline - 19,
          angle: shaking
            ? Math.sin((shakeTime / CAPTURE_TIMING.shake) * Math.PI * 2) * 0.28
            : 0,
          sealed: !!e.caught && !shaking,
        };
        const target =
          actors.find((a) => a.seatId === e.targetSeat) || actors[1];
        if (!e.caught && end > 0) {
          result.ball = null;
          target.opacity = end;
          target.scale = end;
          result.effects = [{ kind: "release", side: 1, t: end }];
        }
        if (e.caught && end > 0)
          result.effects = [{ kind: "stars", side: 1, t: end }];
      }
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
    } else if (e.kind === "move" && this.registry) {
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
    result.view = battleView({ ...current, combatants });
    result.effect = result.effects[0] || null;
    return result;
  }
}
