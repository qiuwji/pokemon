const clamp = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;
/** Pure cosmetic sampling over detached frame state. */
export function sampleBattleOpening(result, { e, duration, t }, { intro, viewport, trainers, trainerPosition }) {
  const { actors, layout } = result;
  if (e.kind === "trainer-slide") {
    result.trainers = (e.trainers || []).map(trainer => {
      const position = trainerPosition(trainer);
      return { ...trainer, ...position, x: position.x + (trainer.slideOffset ?? (trainer.back ? -1 : 1) * (viewport?.width || 320)) * (1 - t), opacity: 1 };
    });
  } else if (e.introPhase === "slide") {
    const width = viewport?.width || 320;
    result.background = { split: true, x: Math.max(0, width - Math.floor(t * width / 2) * 2) };
    result.trainers = (e.trainers || []).map(trainer => {
      const position = trainerPosition(trainer);
      return { ...trainer, ...position, x: position.x + (trainer.slideOffset ?? (trainer.back ? -1 : 1) * width) * (1 - t), opacity: 1, frame: trainer.rest || 0 };
    });
    for (const a of actors) {
      const p = layout.get(a.seatId);
      a.opacity = e.trainers?.some(trainer => !!trainer.back === p.back) ? 0 : 1;
      a.x = (p.back ? 1 : -1) * width * (1 - t);
    }
  } else if (e.introPhase === "send") {
    const send = new Set(e.sendSeats || []), openT = clamp((t - 0.65) / 0.35);
    const motion = e.sendMotion, frames = Math.floor(t * duration * 60 / 1000);
    result.trainers = trainers.map(trainer => {
      if (!!trainer.back !== e.sendBack) return trainer;
      const elapsedFrames = Math.floor(t * duration * 60 / 1000);
      let elapsed = elapsedFrames, index = trainer.rest || 0;
      for (const [frame, frames] of trainer.throw || []) {
        index = frame;
        if (elapsed < frames) break;
        elapsed -= frames;
      }
      return motion
        ? { ...trainer, frame: index, x: lerp(trainer.x, motion.exitX, clamp(frames / motion.trainerFrames)), opacity: frames < motion.trainerFrames ? 1 : 0 }
        : { ...trainer, frame: index, x: trainer.x - (trainer.back ? 1 : -1) * clamp((t - 0.65) / 0.35) * 96, opacity: 1 };
    });
    result.balls = [];
    result.effects = [];
    for (const a of actors) {
      if (!send.has(a.seatId)) continue;
      const position = layout.get(a.seatId), origin = trainerPosition(position.back), throwT = clamp((t - 0.2) / 0.45);
      if (motion) {
        const index = (e.sendSeats || []).indexOf(a.seatId);
        const localFrames = frames - motion.ballDelay;
        const releaseAt = motion.ballTravel + index * motion.partnerDelay;
        const emerge = clamp((localFrames - releaseAt) / motion.releaseFrames);
        const ballEnd = { x: position.x, y: position.y + 24 };
        const ballStart = motion.arc ? motion.ballOrigin : ballEnd;
        const travel = clamp(localFrames / motion.ballTravel);
        a.opacity = localFrames >= releaseAt ? 1 : 0;
        a.scale = emerge;
        a.y = 24 * (1 - emerge);
        if (localFrames >= 0 && emerge < 1) result.balls.push({ resource: intro?.ballResource,
          x: lerp(ballStart.x, ballEnd.x, travel), y: lerp(ballStart.y, ballEnd.y, travel) - (motion.arc ? Math.sin(travel * Math.PI) * 30 : 0),
          angle: 0, size: 16, sealed: emerge === 0 });
        if (emerge > 0 && emerge < 1) result.effects.push({ kind: "release", source: ballEnd, target: position,
          side: position.back ? 0 : 1, t: emerge });
        continue;
      }
      a.opacity = openT > 0 ? 1 : 0;
      a.scale = openT;
      if (t >= 0.2 && openT < 1) result.balls.push({ resource: intro?.ballResource,
        x: lerp(origin.x, position.x, throwT), y: lerp(origin.y, position.y, throwT) - Math.sin(throwT * Math.PI) * 32,
        angle: 0, size: 16, sealed: false });
      if (openT > 0 && openT < 1) result.effects.push({ kind: "release", source: position, target: position, side: position.back ? 0 : 1, t: openT });
    }
    result.ball = result.balls[0] || null;
  } else if (e.kind === "entry") {
    // The pack supplies which environment scrolls and how far; the director is content-agnostic.
    const offset = intro?.variants?.[e.environment?.terrain] || null,
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
    const ballResource = intro?.ballResource;
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

  } else return false;
  return true;
}
