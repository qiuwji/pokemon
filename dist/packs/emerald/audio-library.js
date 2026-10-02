import { validateAudioCue } from "../../engine/extensions/audio-contracts.js";
// Short original demonstration melodies, not extracted Emerald music.
const music = (notes) => ({ kind: "music", volume: 0.022, loop: true, notes });
const sound = (notes) => ({ kind: "sound", volume: 0.03, loop: false, notes });
const cues = {
  town: music([
    [60, 0.25],
    [64, 0.25],
    [67, 0.5],
    [64, 0.25],
    [62, 0.25],
    [65, 0.5],
    [64, 0.25],
    [60, 0.25],
    [62, 0.5],
    [0, 0.5],
  ]),
  route: music([
    [67, 0.18],
    [69, 0.18],
    [72, 0.36],
    [69, 0.18],
    [67, 0.18],
    [64, 0.36],
    [65, 0.18],
    [67, 0.18],
    [69, 0.36],
    [0, 0.36],
  ]),
  indoor: music([
    [60, 0.4],
    [67, 0.4],
    [64, 0.4],
    [62, 0.4],
    [65, 0.4],
    [64, 0.4],
    [0, 0.8],
  ]),
  battle: music([
    [48, 0.15],
    [60, 0.15],
    [55, 0.15],
    [58, 0.15],
    [48, 0.15],
    [62, 0.15],
    [55, 0.15],
    [60, 0.15],
    [53, 0.15],
    [65, 0.15],
    [60, 0.15],
    [63, 0.15],
    [0, 0.3],
  ]),
  reward: sound([
    [60, 0.12],
    [64, 0.12],
    [67, 0.12],
    [72, 0.5],
  ]),
  attack: sound([
    [76, 0.04],
    [64, 0.06],
    [52, 0.08],
  ]),
  hurt: sound([
    [52, 0.08],
    [48, 0.1],
  ]),
  heal: sound([
    [64, 0.09],
    [67, 0.09],
    [72, 0.2],
  ]),
};
export function createEmeraldAudio(host) {
  const result = new Map(
    Object.entries(cues).map(([id, cue]) => [
      "emerald:" + id,
      validateAudioCue(cue),
    ]),
  );
  for (const [id, cue] of host?.audioCues || []) result.set(id, cue);
  return result;
}
export function emeraldMusic({ battle, map }) {
  return (
    "emerald:" +
    (battle
      ? "battle"
      : map.indoor
        ? "indoor"
        : map.id?.startsWith("Route")
          ? "route"
          : "town")
  );
}
