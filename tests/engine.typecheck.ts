import { changeStoryVariable } from "../src/engine/story-variables.js";
import { sampleAnimationTrack } from "../src/presentation/animation-timing.js";
import { sampleSpriteAnimation } from "../src/presentation/sprite-animation.js";

changeStoryVariable({}, { name: "count", operation: "add", value: 1 });
sampleAnimationTrack({ start: 0, end: 10, easing: "smoothstep" }, 5);
sampleSpriteAnimation(undefined, "idle", "down", 0, false);
// @ts-expect-error Story variables are scalar, not arbitrary nested state.
changeStoryVariable({}, { name: "count", value: { nested: true } });
// @ts-expect-error Unknown easing identifiers are not part of the timing contract.
sampleAnimationTrack({ start: 0, end: 10, easing: "typo" }, 5);
// @ts-expect-error Sprite timing consumes numeric milliseconds, not text.
sampleSpriteAnimation(undefined, "idle", "down", "later", false);
