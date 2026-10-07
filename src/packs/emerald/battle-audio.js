import {
  CAPTURE_TIMING,
  captureShakes,
} from "../../presentation/timed-cues.js";
/** Native sample choices are pack policy. Timing follows the displayed ball phases, not rules. */
export function emeraldBattleCues(event, { duration, reducedMotion }) {
  const cue = (id, at = 0) => ({ id: "emerald:" + id, at });
  if (event.kind === "ball")
    return reducedMotion
      ? [cue("ball.throw")]
      : [cue("ball.throw"), cue("ball.open", duration * 0.65)];
  if (event.kind === "capture") {
    if (reducedMotion)
      return event.caught ? [] : [cue("ball.open", duration * 0.75)];
    const normalDuration = CAPTURE_TIMING.settle + CAPTURE_TIMING.release + captureShakes(event) * CAPTURE_TIMING.shake;
    const scaled = at => at * duration / normalDuration;
    const cues = Array.from({ length: captureShakes(event) }, (_, i) =>
      cue("ball.shake", CAPTURE_TIMING.settle + i * CAPTURE_TIMING.shake),
    );
    if (!event.caught)
      cues.push(
        cue(
          "ball.open",
          scaled(CAPTURE_TIMING.settle + captureShakes(event) * CAPTURE_TIMING.shake),
        ),
      );
    return cues;
  }
  if (event.kind === "switch") return [cue("ball.open", duration * 0.5)];
  if (event.introPhase === "slide") return [];
  if (event.introPhase === "send" && event.sendMotion) {
    const motion = event.sendMotion, normalDuration = event.duration || duration;
    return (event.sendSeats || []).flatMap((seat, i) => {
      const at = reducedMotion ? 0 : (motion.ballDelay + motion.ballTravel + i * motion.partnerDelay) * 1000 / 60 * duration / normalDuration;
      const mon = event.combatants.find(c => c.seatId === seat)?.monster;
      return [cue("ball.open", at), ...(mon ? [cue("cry." + mon.species, at)] : [])];
    });
  }
  if (event.kind === "entry" && event.trainers?.length)
    return [cue("ball.open", duration * 0.25)];
  // Growl is an attacker cry in battle_anim_scripts.s, not a generic impact sound.
  if (event.kind === "move" && event.move?.id === "growl") {
    const mon = event.combatants?.find(
      (c) => c.seatId === event.actorSeat,
    )?.monster;
    if (mon) return [cue("cry." + mon.species)];
  }
  return [];
}
