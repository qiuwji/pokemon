import { validateSpriteClip } from "../engine/extensions/sprite-clip-contracts.js";
/** Immutable clip catalog. Explicit extension bindings override pack defaults, never each other. */
export class SpriteClips {
  constructor({ resources, species }) {
    this.resources = resources;
    this.species = species;
    this.clips = new Map();
    this.bindings = new Map();
    this.defaults = new Map();
    this.sealed = false;
  }
  register(id, definition, { fallback = false } = {}) {
    if (this.sealed || this.clips.has(id))
      throw new Error(`Duplicate or sealed sprite clip ${id}`);
    const d = validateSpriteClip(definition);
    for (const f of d.frames)
      if (!Object.hasOwn(this.resources, f.resource))
        throw new Error(`Unknown sprite resource ${id}/${f.resource}`);
    const bindings = fallback ? this.defaults : this.bindings;
    if (d.match) {
      if (!Object.hasOwn(this.species, d.match.species))
        throw new Error(`Unknown sprite species ${id}/${d.match.species}`);
      const key = JSON.stringify([d.match.species, d.match.view]);
      if (bindings.has(key))
        throw new Error(`Conflicting sprite binding ${key}`);
      bindings.set(key, id);
    }
    this.clips.set(id, d);
    return this;
  }
  get(id) {
    const d = this.clips.get(id);
    if (!d) throw new Error(`Unknown sprite clip ${id}`);
    return d;
  }
  find(species, view = "detail") {
    const key = JSON.stringify([species, view]),
      id = this.bindings.get(key) || this.defaults.get(key);
    return id ? this.get(id) : null;
  }
  seal() {
    this.sealed = true;
    return this;
  }
}
/** Pure finite-time sampling. Once clips hold their final frame; reduced motion uses the first frame. */
export function sampleSpriteClip(
  clip,
  elapsedMs,
  { reducedMotion = false } = {},
) {
  if (!Number.isFinite(elapsedMs)) throw new Error("Invalid sprite clock");
  const duration = clip.frames.reduce(
      (total, frame) => total + frame.durationMs,
      0,
    ),
    elapsed = Math.max(0, elapsedMs);
  if (reducedMotion) return { index: 0, frame: clip.frames[0], complete: true };
  let t = clip.loop ? elapsed % duration : Math.min(elapsed, duration),
    index = 0;
  for (; index < clip.frames.length - 1; index++) {
    if (t < clip.frames[index].durationMs) break;
    t -= clip.frames[index].durationMs;
  }
  return {
    index,
    frame: clip.frames[index],
    complete: !clip.loop && elapsed >= duration,
  };
}
