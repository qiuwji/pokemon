import { validateAudioCue } from "../../engine/extensions/audio-contracts.js";
/**
 * UI and battle cues now carry the original sound identity rendered from the reference MIDI.
 * Attack and hit sounds stay absent on purpose: the original plays a per-move sound effect, so
 * a generic hit sample would be a substitute rather than a restoration.
 */
export const EMERALD_AUDIO_CUES = {
  confirm: {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_select.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 2,
  },
  purchase: {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_shop.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 2,
  },
  reward: {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/mus_level_up.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 1,
  },
  door: {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_door.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 2,
  },
  ledge: {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_ledge.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 2,
  },
  "ball.throw": {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_ball_throw.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 2,
  },
  "ball.shake": {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_ball.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 2,
  },
  "ball.open": {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_ball_open.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 2,
  },
  heal: {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_exp.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 2,
  },
  save: {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_save.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 1,
  },
  "storage.pc": {
    kind: "sound",
    source: "generated/assets/audio/emerald-audio/sounds/se_pc_login.wav",
    volume: 0.5,
    loop: false,
    maxVoices: 1,
  },
  "cry.mudkip": {
    kind: "sound",
    source: "generated/assets/audio/cry-mudkip.wav",
    volume: 0.4,
    loop: false,
    maxVoices: 1,
  },
  "cry.treecko": {
    kind: "sound",
    source: "generated/assets/audio/cry-treecko.wav",
    volume: 0.4,
    loop: false,
    maxVoices: 1,
  },
  "cry.torchic": {
    kind: "sound",
    source: "generated/assets/audio/cry-torchic.wav",
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
  MUS_HELP: "emerald-audio:mus_help",
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
export function emeraldMusic(
  { battle, map, battleSong, storyMusic, flags = {} },
  cues,
) {
  const id = battle
    ? battleSong || map.battleMusic || emeraldBattleSong(battle)
    : storyMusic ||
      (map.id === "Route101" && flags.heardBirch && !flags.rescued
        ? "MUS_HELP"
        : map.music);
  if (!id) return null;
  const cueId = cues.has(id) ? id : ORIGINAL_SONG_CUES[id];
  return cueId && cues.get(cueId)?.kind === "music" ? cueId : null;
}

/**
 * Battle cues keep the original mapping where the reference has one: level up plays the
 * level fanfare and recovery plays the exp sound. Move and hurt stay unmapped until the
 * per-move sound effect table is imported; the original plays a different sound per move.
 */
export const EMERALD_BATTLE_AUDIO = Object.freeze({
  move: null,
  hurt: null,
  heal: "emerald:heal",
  level: "emerald:reward",
});
export function emeraldBattleSound(kind, cues) {
  const id = cues.has(kind) ? kind : EMERALD_BATTLE_AUDIO[kind];
  return id && cues.get(id)?.kind === "sound" ? id : null;
}

/**
 * field_door.c GetDoorSoundEffect plays a sliding sound for some doors instead of the
 * swinging one. The sliding render is not installed yet, so an absent cue falls back to
 * the swinging door instead of going silent. Every other cue id passes through unchanged.
 */
export const EMERALD_SLIDING_DOOR_CUE = "emerald-audio:se_sliding_door";
export function emeraldDoorSound(id, cues) {
  if (id !== "emerald:slidingDoor") return id;
  return cues?.get?.(EMERALD_SLIDING_DOOR_CUE)?.kind === "sound"
    ? EMERALD_SLIDING_DOOR_CUE
    : "emerald:door";
}
