import { validateAudioCue } from "../../engine/extensions/audio-contracts.js";
/** Real source samples for provisional UI/SFX; not a claim of reconstructed native song/SE mixing. */
export const EMERALD_AUDIO_CUES = {
  confirm: {
    kind: "sound",
    source: "assets/audio/bicycle-bell.wav",
    volume: 0.16,
    loop: false,
    maxVoices: 2,
  },
  purchase: {
    kind: "sound",
    source: "assets/audio/register-noise.wav",
    volume: 0.2,
    loop: false,
    maxVoices: 2,
  },
  reward: {
    kind: "sound",
    source: "assets/audio/bicycle-bell.wav",
    volume: 0.28,
    loop: false,
    maxVoices: 2,
  },
  attack: {
    kind: "sound",
    source: "assets/audio/kick.wav",
    volume: 0.3,
    loop: false,
    maxVoices: 4,
  },
  hurt: {
    kind: "sound",
    source: "assets/audio/snare.wav",
    volume: 0.2,
    loop: false,
    maxVoices: 4,
  },
  heal: {
    kind: "sound",
    source: "assets/audio/bicycle-bell.wav",
    volume: 0.24,
    loop: false,
    maxVoices: 2,
  },
  "cry.mudkip": {
    kind: "sound",
    source: "assets/audio/cry-mudkip.wav",
    volume: 0.4,
    loop: false,
    maxVoices: 1,
  },
  "cry.treecko": {
    kind: "sound",
    source: "assets/audio/cry-treecko.wav",
    volume: 0.4,
    loop: false,
    maxVoices: 1,
  },
  "cry.torchic": {
    kind: "sound",
    source: "assets/audio/cry-torchic.wav",
    volume: 0.4,
    loop: false,
    maxVoices: 1,
  },
};
export function createEmeraldAudio(host) {
  const result = new Map(
    Object.entries(EMERALD_AUDIO_CUES).map(([id, cue]) => [
      "emerald:" + id,
      validateAudioCue(cue),
    ]),
  );
  for (const [id, cue] of host?.audioCues || []) {
    if (result.has(id)) throw new Error(`Duplicate audio cue ${id}`);
    result.set(id, cue);
  }
  return result;
}
/** Content chooses explicit registered cues; absent music remains silent until real BGM is imported. */
export function emeraldMusic({ battle, map }, cues) {
  const id = battle ? map.battleMusic : map.music;
  return id && cues.get(id)?.kind === "music" ? id : null;
}

export const EMERALD_BATTLE_AUDIO = Object.freeze({
  move: "emerald:attack",
  hurt: "emerald:hurt",
  heal: "emerald:heal",
  level: "emerald:reward",
});
export function emeraldBattleSound(kind, cues) {
  const id = EMERALD_BATTLE_AUDIO[kind];
  return id && cues.get(id)?.kind === "sound" ? id : null;
}
