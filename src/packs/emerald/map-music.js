import { emeraldMusic } from "./audio-library.js";

// m4a FadeOutBody changes 64-volume by four every speed native frames.
const fade = speed => speed * 16 * 1000 / 60;
export function emeraldMapMusicTransition({ mode, warp, indoor } = {}) {
  const bike = ["mach-bike", "acro-bike"].includes(mode);
  return { mode: "after-fade", steps: 16,
    fadeOutMs: fade(warp ? indoor ? 2 : 4 : bike ? 4 : 8),
    fadeInMs: !warp && bike ? fade(4) : 0 };
}

/** Owns only field music policy; the player owns buffers, envelopes and cancellation. */
export class EmeraldMapMusic {
  constructor(audio) {
    this.audio = audio;
    this.scene = null;
    this.warp = null;
  }
  update(context) {
    const id = emeraldMusic(context, this.audio.cues), previous = this.scene;
    if (this.warp && context.map.id !== this.warp.target) return;
    this.scene = { id, map: context.map.id, battle: !!context.battle };
    if (context.battle || context.storyMusic) return this.audio.setMusic(id);
    if (previous?.id === id && !previous.battle && !this.warp) return this.audio.setMusic(id, { mode: "after-fade", fadeInMs: 0 });
    const immediate = !previous || previous.battle || !!this.warp;
    return this.audio.setMusic(id, immediate ? { mode: "after-fade", fadeOutMs: 0, fadeInMs: 0 } :
      emeraldMapMusicTransition({ mode: context.mode }));
  }
  prepareWarp(map, context) {
    const id = emeraldMusic({ ...context, map }, this.audio.cues);
    if (id === this.audio.music || context.storyMusic) return null;
    const lease = { target: map.id };
    this.warp = lease;
    return {
      ready: this.audio.fadeMusic(emeraldMapMusicTransition({ warp: true, indoor: map.indoor })),
      release: () => { if (this.warp === lease) this.warp = null; },
    };
  }
}
