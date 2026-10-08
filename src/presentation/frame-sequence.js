/** Playback samples immutable data; compilation callbacks never execute in the render loop. */
export function frameSequencePlayer(sequence) {
  return Object.freeze({
    holdFinal: !!sequence.holdFinal,
    messageAt: sequence.messageAt || "start",
    duration: sequence.frames.length * 1000 / sequence.fps,
    cues: Object.freeze(sequence.cues.map(cue => Object.freeze({ id: cue.id, at: cue.frame * 1000 / sequence.fps }))),
    sample(elapsedMs) {
      const index = Math.max(0, Math.min(sequence.frames.length - 1, Math.floor(elapsedMs * sequence.fps / 1000 + 1e-7)));
      return sequence.frames[index];
    },
  });
}
