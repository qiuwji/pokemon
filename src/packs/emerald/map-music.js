// m4a FadeOutBody changes 64-volume by four every speed native frames.
const fade = speed => speed * 16 * 1000 / 60;
export function emeraldMapMusicTransition({ mode, warp, indoor } = {}) {
  const bike = ["mach-bike", "acro-bike"].includes(mode);
  return { mode: "after-fade", steps: 16,
    fadeOutMs: fade(warp ? indoor ? 2 : 4 : bike ? 4 : 8),
    fadeInMs: !warp && bike ? fade(4) : 0 };
}
