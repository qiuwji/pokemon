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
/** Original song constants resolve to the registered cue carrying the same song identity. */
export const ORIGINAL_SONG_CUES = Object.freeze({
  MUS_LITTLEROOT: "emerald-audio:mus_littleroot",
  MUS_ROUTE101: "emerald-audio:mus_route101",
  MUS_OLDALE: "emerald-audio:mus_oldale",
  MUS_BIRCH_LAB: "emerald-audio:mus_birch_lab",
  MUS_POKE_CENTER: "emerald-audio:mus_poke_center",
  MUS_POKE_MART: "emerald-audio:mus_poke_mart",
  MUS_VS_WILD: "emerald-audio:mus_vs_wild",
  MUS_VS_TRAINER: "emerald-audio:mus_vs_trainer",
  MUS_VS_RIVAL: "emerald-audio:mus_vs_rival",
});
/**
 * Battle music follows the original GetBattleBGM policy: a rival script plays the rival
 * theme, other trainer battles the trainer theme, everything else the wild theme.
 */
export function emeraldBattleSong(battle) {
  if (!battle) return null;
  if (battle.script === "rival") return "MUS_VS_RIVAL";
  return battle.trainer ? "MUS_VS_TRAINER" : "MUS_VS_WILD";
}
/** Map content keeps the original song constant; a directly registered cue id is also accepted. */
export function emeraldMusic({ battle, map, battleSong }, cues) {
  const id = battle
    ? battleSong || map.battleMusic || emeraldBattleSong(battle)
    : map.music;
  if (!id) return null;
  const cueId = cues.has(id) ? id : ORIGINAL_SONG_CUES[id];
  return cueId && cues.get(cueId)?.kind === "music" ? cueId : null;
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
