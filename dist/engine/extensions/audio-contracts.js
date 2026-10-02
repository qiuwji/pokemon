import { readOnly } from "./values.js";
/** Asset cues and bounded note sequences share one registration contract. */
export function validateAudioCue(value) {
  const cue = readOnly(value);
  if (
    !cue ||
    !["music", "sound"].includes(cue.kind) ||
    !Number.isFinite(cue.volume) ||
    cue.volume < 0 ||
    cue.volume > 1 ||
    typeof cue.loop !== "boolean" ||
    Boolean(cue.source) === Boolean(cue.notes)
  )
    throw new Error("Invalid audio cue");
  if (
    cue.source &&
    (typeof cue.source !== "string" ||
      !/^assets\/[a-zA-Z0-9_./:-]+\.(ogg|wav|mp3)$/i.test(cue.source) ||
      cue.source.split("/").includes(".."))
  )
    throw new Error("Invalid audio asset");
  if (
    cue.notes &&
    (!Array.isArray(cue.notes) ||
      !cue.notes.length ||
      cue.notes.length > 128 ||
      cue.notes.some(
        (n) =>
          !Array.isArray(n) ||
          n.length !== 2 ||
          !Number.isInteger(n[0]) ||
          n[0] < 0 ||
          n[0] > 127 ||
          !Number.isFinite(n[1]) ||
          n[1] < 0.02 ||
          n[1] > 10,
      ) ||
      cue.notes.reduce((s, n) => s + n[1], 0) > 60)
  )
    throw new Error("Invalid audio sequence");
  return cue;
}
