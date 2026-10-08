import { readOnly, callSync } from "./values.js";

/** Bounded, browser-independent compilation utility. Content owns callback semantics and scheduling. */
export class FrameSequenceBuilder {
  constructor({ fps = 60, maxFrames = 3600 } = {}) {
    if (!Number.isInteger(fps) || fps < 1 || fps > 240 || !Number.isInteger(maxFrames) || maxFrames < 1 || maxFrames > 3600)
      throw new Error("Invalid frame sequence clock");
    this.fps = fps;
    this.maxFrames = maxFrames;
    this.frame = 0;
    this.tracks = [];
    this.cues = [];
    this.channels = new Map();
  }
  seek(frame) {
    if (!Number.isInteger(frame) || frame < this.frame || frame >= this.maxFrames)
      throw new Error("Frame sequence time exceeds its bounds");
    this.frame = frame;
    return this;
  }
  wait(frames) { return this.seek(this.frame + frames); }
  until(channel) { return this.channels.get(channel) || 0; }
  track({ frames, sample }, { channel = "visual", at = this.frame } = {}) {
    if (!Number.isInteger(frames) || frames < 0 || !Number.isInteger(at) || at < 0 || at + frames > this.maxFrames || typeof sample !== "function" || typeof channel !== "string" || !channel)
      throw new Error("Invalid frame sequence track");
    this.tracks.push({ at, frames, sample });
    this.channels.set(channel, Math.max(this.until(channel), at + frames));
    return this;
  }
  cue(id, { at = this.frame, frames = 0 } = {}) {
    if (typeof id !== "string" || !id || !Number.isInteger(at) || at < 0 || at >= this.maxFrames || !Number.isInteger(frames) || frames < 0 || at + frames > this.maxFrames)
      throw new Error("Invalid frame sequence cue");
    this.cues.push({ id, frame: at });
    this.channels.set("sound", Math.max(this.until("sound"), at + frames));
    return this;
  }
  build({ frames = Math.max(this.frame + 1, ...this.tracks.map(t => t.at + t.frames), ...this.cues.map(c => c.frame + 1)), messageAt = "start", holdFinal = false } = {}) {
    if (!Number.isInteger(frames) || frames < 1 || frames > this.maxFrames || this.tracks.some(track => track.at + track.frames > frames) || this.cues.some(cue => cue.frame >= frames))
      throw new Error("Invalid frame sequence length");
    const samples = Array.from({ length: frames }, (_, frame) => {
      const output = { poses: [], sprites: [], healthBars: [], scenes: [], statusBoxes: [] };
      for (const track of this.tracks) {
        const local = frame - track.at;
        if (local < 0 || local >= track.frames) continue;
        const sampled = callSync(track.sample, [local]);
        if (!sampled || typeof sampled !== "object" || Array.isArray(sampled) || Object.keys(sampled).some(key => !Object.hasOwn(output, key)))
          throw new Error("Invalid compiled frame channels");
        for (const channel of Object.keys(output)) output[channel].push(...sampled[channel] || []);
      }
      return output;
    });
    // No source callbacks survive into playback; callers cannot mutate built frames.
    return readOnly({ fps: this.fps, frames: samples, cues: this.cues, messageAt, holdFinal });
  }
}
