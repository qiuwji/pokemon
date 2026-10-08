import { CAPTURE_TIMING, captureShakes } from "../engine/extensions/capture-timing.js";
const clamp = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;
/** Pure cosmetic sampling over detached frame state. */
export function sampleBattleCapture(result, { e, start, now, t }, { ballResource, viewport }) {
  const { actors, layout } = result;
  if (e.kind === "ball") {
    const flight = clamp(t / 0.7),
      targetPose = layout.get(e.targetSeat) || { x: 252, baseline: 97 },
      sourcePose = layout.get(e.actorSeat) || { x: 72, y: 124 };
    result.ball = {
      resource: ballResource(e),
      x: lerp(sourcePose.x, targetPose.x, flight),
      y:
        lerp(sourcePose.y, targetPose.baseline - 35, flight) -
        Math.sin(flight * Math.PI) * (viewport ? 40 : 72),
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
      resource: ballResource(e),
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
      result.effects = [{ kind: "release", source: targetPose, target: targetPose, side: 1, t: end }];
    }
    if (e.caught && end > 0)
      result.effects = [{ kind: "stars", source: targetPose, target: targetPose, side: 1, t: end }];
  }
  else return false;
  return true;
}
