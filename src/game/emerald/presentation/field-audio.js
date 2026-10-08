import { CENTER_AUDIO_POLICY } from "../../../packs/emerald/center-presentation.js";
/** Host cue orchestration; authored timings stay in content and voice state stays in audio. */
export function createEmeraldFieldCuePlayer(audio, timeline) {
  return async id => {
    const policy = CENTER_AUDIO_POLICY[id];
    if (!policy?.holdMusic) { await audio.play(id); return; }
    const release = audio.holdMusic();
    try { await audio.play(id); await timeline.wait(policy.waitMs); }
    finally { release(); }
  };
}
