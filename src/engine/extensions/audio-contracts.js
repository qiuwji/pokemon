import { readOnly } from "./values.js";
/** Audio is a registered resource; cue definitions never contain oscillators or note programs. */
export function validateAudioCue(value) {
  const cue = readOnly(value);
  if (
    !cue ||
    Array.isArray(cue) ||
    Object.keys(cue).some(
      (k) =>
        ![
          "kind",
          "source",
          "volume",
          "loop",
          "loopStart",
          "loopEnd",
          "fadeInMs",
          "fadeOutMs",
          "fadePreviousMs",
          "maxVoices",
        ].includes(k),
    ) ||
    !["music", "sound"].includes(cue.kind) ||
    !Number.isFinite(cue.volume) ||
    cue.volume < 0 ||
    cue.volume > 1 ||
    typeof cue.loop !== "boolean"
  )
    throw new Error("Invalid audio cue");
  if (
    typeof cue.source !== "string" ||
    !/^(?:generated\/)?assets\/[a-zA-Z0-9_./:-]+\.(ogg|wav|mp3|m4a)$/i.test(cue.source) ||
    cue.source.split("/").includes("..")
  )
    throw new Error("Invalid audio asset");
  if (
    (cue.loopStart !== undefined || cue.loopEnd !== undefined) &&
    (!cue.loop ||
      !Number.isFinite(cue.loopStart) ||
      cue.loopStart < 0 ||
      !Number.isFinite(cue.loopEnd) ||
      cue.loopEnd <= cue.loopStart)
  )
    throw new Error("Invalid audio loop region");
  for (const key of ["fadeInMs", "fadeOutMs", "fadePreviousMs"])
    if (
      cue[key] !== undefined &&
      (!Number.isFinite(cue[key]) || cue[key] < 0 || cue[key] > 10000)
    )
      throw new Error("Invalid audio fade");
  if (cue.fadePreviousMs !== undefined && cue.kind !== "music")
    throw new Error("Only music can replace a previous cue");
  if (
    cue.maxVoices !== undefined &&
    (!Number.isInteger(cue.maxVoices) ||
      cue.maxVoices < 1 ||
      cue.maxVoices > 32 ||
      cue.kind !== "sound")
  )
    throw new Error("Invalid audio voice limit");
  return cue;
}
