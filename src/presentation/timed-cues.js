/** Await one cosmetic timeline with ordered cues. Uses the injected clock, never timers or rules. */
export async function playTimedCues(
  timeline,
  duration,
  start,
  finish,
  cues,
  onCue,
) {
  if (!cues.length) return timeline.play(duration, start, finish);
  const ordered = [...cues].sort((a, b) => a.at - b.at);
  for (const cue of ordered)
    if (
      !Number.isFinite(cue.at) ||
      cue.at < 0 ||
      cue.at >= duration ||
      typeof cue.id !== "string" ||
      !cue.id
    )
      throw new Error("Invalid presentation sound cue");
  const began = timeline.now();
  start(began, duration);
  try {
    for (const cue of ordered) {
      const wait = began + cue.at - timeline.now();
      if (wait > 0) await timeline.wait(wait);
      onCue(cue.id);
    }
    const wait = began + duration - timeline.now();
    if (wait > 0) await timeline.wait(wait);
  } finally {
    finish();
  }
}
export const CAPTURE_TIMING = Object.freeze({
  settle: 250,
  shake: 420,
  release: 450,
});

// The fourth successful rule check means capture; the original displays three shakes.
export const captureShakes = (event) =>
  event.caught ? Math.min(3, event.shakes) : event.shakes;
