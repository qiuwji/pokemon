/**
 * Emerald opening-battle configuration (pack content). The presentation director is
 * content-agnostic; this module owns which environment scrolls, how far, and the ball art.
 * The environment keys come from the battle snapshot; the mapping mirrors
 * `src/battle_intro.c` `sBattleIntroSlideFuncs` (slide 1/2/3).
 */
const slide = (x) => Object.freeze({ x, y: 0 });

export const EMERALD_BATTLE_INTRO = Object.freeze({
  duration: 1100,
  ballResource: "battle-ball-poke",
  variants: Object.freeze({
    grass: slide(48),
    long_grass: slide(48),
    pond: slide(48),
    mountain: slide(48),
    cave: slide(48),
    sand: slide(64),
    underwater: slide(64),
    water: slide(64),
    building: slide(64),
    plain: slide(64),
    indoor: slide(64),
  }),
});
