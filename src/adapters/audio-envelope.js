/** Audio-clock automation, independent of song identities and gameplay. */
export function envelopeLevel(envelope, at) {
  if (!envelope) return 1;
  let progress = Math.max(0, Math.min(1, (at - envelope.start) / (envelope.end - envelope.start || 1)));
  if (envelope.steps) progress = Math.floor(progress * envelope.steps + 1e-7) / envelope.steps;
  return envelope.from + (envelope.to - envelope.from) * progress;
}
export function automateVolume(parameter, envelope, target, at) {
  parameter.cancelScheduledValues(at);
  parameter.setValueAtTime(target * envelopeLevel(envelope, at), at);
  if (!envelope || at >= envelope.end) return;
  if (at < envelope.start) parameter.setValueAtTime(target * envelope.from, envelope.start);
  if (envelope.steps) {
    for (let step = 1; step <= envelope.steps; step++) {
      const time = envelope.start + (envelope.end - envelope.start) * step / envelope.steps;
      if (time > at) parameter.setValueAtTime(target * (envelope.from + (envelope.to - envelope.from) * step / envelope.steps), time);
    }
  } else parameter.linearRampToValueAtTime(target * envelope.to, envelope.end);
}
