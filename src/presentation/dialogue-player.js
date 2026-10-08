import { readOnly } from "../engine/extensions/values.js";
const segmenter = new Intl.Segmenter("und", { granularity: "grapheme" });
/** Compile once; pauses have no glyph and Unicode clusters cannot be half revealed. */
export function compileDialogueLine(
  line,
  { speed = 30, mode = "typewriter" } = {},
) {
  let cursor = 0;
  const glyphs = [];
  const pauses = [];
  for (const run of line.runs) {
    if (run.pauseMs !== undefined) {
      pauses.push({ at: cursor, duration: run.pauseMs });
      cursor += run.pauseMs;
      continue;
    }
    const { text, ...style } = run;
    for (const { segment } of segmenter.segment(text)) {
      cursor += speed;
      glyphs.push({ text: segment, at: cursor, style });
    }
  }
  return readOnly({
    text: line.text,
    glyphs,
    pauses,
    duration: mode === "instant" ? 0 : cursor,
    instant: mode === "instant",
  });
}
/** Pure time sampling: no browser, random source or gameplay objects. */
export function sampleDialogue(
  track,
  elapsedMs,
  { revealed = false, reducedMotion = false } = {},
) {
  if (!Number.isFinite(elapsedMs)) throw new Error("Invalid dialogue clock");
  const t = Math.max(0, elapsedMs),
    instant = revealed || reducedMotion || track.instant;
  let low = 0,
    high = track.glyphs.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (track.glyphs[mid].at <= t) low = mid + 1;
    else high = mid;
  }
  return {
    visible: instant ? track.glyphs.length : low,
    complete: instant || t >= track.duration,
    elapsedMs: t,
  };
}
export class DialoguePlayer {
  start(track, now) {
    if (!Number.isFinite(now)) throw new Error("Invalid dialogue clock");
    this.track = track;
    this.started = now;
    this.revealed = false;
  }
  sample(now, options) {
    if (!this.track) throw new Error("Dialogue player is inactive");
    return sampleDialogue(this.track, now - this.started, {
      ...options,
      revealed: this.revealed,
    });
  }
  skip() {
    this.revealed = true;
  }
  stop() {
    this.track = null;
  }
}
