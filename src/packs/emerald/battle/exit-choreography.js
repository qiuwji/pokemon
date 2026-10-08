/** palette.c alternates BG/OBJ banks, subtracting two 5-bit levels per pass, then finishes for five frames. */
export const EMERALD_BATTLE_EXIT = Object.freeze({
  fps: 60, holdMs: 0, settleMs: 0,
  coverFrames: Object.freeze(Array.from({ length: 37 }, (_, frame) => {
    const level = Math.min(31, 2 + Math.floor(frame / 2) * 2);
    return Object.freeze({ opacity: level === 31 ? 1 : 0, colorOffset: Object.freeze([-level * 8, -level * 8, -level * 8]) });
  })),
  // Overworld restoration uses its normal 0..16 palette blend after the covered scene swap.
  revealFrames: Object.freeze(Array.from({ length: 17 }, (_, frame) => Object.freeze({ opacity: 1 - frame / 16 }))),
});
