import test from "node:test";
import assert from "node:assert/strict";
import { AudioAdapter } from "../src/adapters/audio.js";
import { envelopeLevel } from "../src/adapters/audio-envelope.js";
import { EmeraldMapMusic, emeraldMapMusicTransition } from "../src/packs/emerald/map-music.js";
import { session } from "./helpers/session.js";

function arrange() {
  const sources = [];
  const context = { currentTime: 0, destination: {}, resume: async () => {}, close: async () => {},
    decodeAudioData: async () => ({ duration: 30 }),
    createGain: () => ({ connect() {}, disconnect() {}, gain: {
      events: [], cancelScheduledValues() {},
      setValueAtTime(value, at) { this.events.push({ value, at }); },
      linearRampToValueAtTime(value, at) { this.events.push({ value, at, ramp: true }); },
    } }),
    createBufferSource: () => {
      const source = { connect() {}, disconnect() {}, start(at, offset) { Object.assign(this, { at, offset }); },
        stop(at) { this.stopAt = at; if (at === undefined) this.onended?.(); } };
      sources.push(source); return source;
    },
  };
  const cues = new Map(["town", "route", "lab"].map(id => [id,
    { kind: "music", source: `generated/assets/${id}.wav`, volume: 1, loop: true, fadeInMs: 1500, fadeOutMs: 1200 }]));
  const audio = new AudioAdapter({ cues, createContext: () => context,
    fetchAsset: async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) }) });
  audio.enabled = true;
  const music = new EmeraldMapMusic(audio);
  return { audio, music, context, sources,
    advance(at) { context.currentTime = at; for (const source of sources)
      if (source.stopAt !== undefined && source.stopAt <= at) source.onended?.(); },
    field(map, id = map, more = {}) { return music.update({ map: { id: map, music: id }, ...more }); },
  };
}

test("native walking and bicycle switches sequence 16 volume steps and never overlap the two songs", async () => {
  const s = arrange(), first = await s.field("town");
  assert.equal(first.envelope, null, "boot starts the original song at full level");
  const next = await s.field("route");
  assert.equal(next.startedAt, 128 / 60);
  assert.equal(first.source.stopAt, next.source.at);
  assert.equal(next.envelope, null, "walking starts the next song without a fade-in");
  assert.equal(first.gain.gain.events.filter(e => e.at > 0).length, 16);
  assert.equal(envelopeLevel(first.envelope, 8 / 60 - 0.001), 1);
  assert.equal(envelopeLevel(first.envelope, 8 / 60), 15 / 16);
  s.advance(3);
  const bike = await s.field("lab", "lab", { mode: "mach-bike" });
  assert.equal(bike.startedAt, 3 + 64 / 60);
  assert.equal(bike.envelope.end, bike.startedAt + 64 / 60);
  assert.equal(envelopeLevel(bike.envelope, bike.startedAt + 4 / 60), 1 / 16);
});

test("same-song maps preserve the voice and sample offset; rapid changes cancel a scheduled intermediate song", async () => {
  const s = arrange(), first = await s.field("town");
  s.advance(5);
  assert.equal(await s.field("house", "town"), first);
  assert.equal(s.sources.length, 1);
  const intermediate = await s.field("route"), final = await s.field("lab");
  assert(intermediate.cleaned);
  assert.equal(final.startedAt, 5 + 128 / 60, "the outgoing deadline is not restarted");
  s.audio.enabled = false;
  assert.equal(s.audio.voices.size, 0);
  s.audio.enabled = true;
  const resumed = await s.audio.setMusic("lab");
  assert.equal(resumed.offset, 0, "a cancelled future source has not consumed samples");
});

test("warp waits under the covered screen for audio completion and releases the lease on failure or mute", async () => {
  const s = arrange(); await s.field("town");
  const g = session().game;
  g.prepareMapExit = to => s.music.prepareWarp({ id: to.map, music: "lab", indoor: true }, {});
  const origin = g.state.position.map;
  const pending = g.field.runWarp({ map: "LittlerootTown_ProfessorBirchsLab", x: 4, y: 10, dir: "up" });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(g.state.position.map, origin);
  assert.equal(g.transitions.sample().covered, true);
  assert.equal(s.sources[0].stopAt, 32 / 60);
  assert.equal(await s.field("town"), undefined, "the render loop cannot restart the outgoing song");
  s.advance(32 / 60);
  await pending;
  assert.equal(g.state.position.map, "LittlerootTown_ProfessorBirchsLab");
  assert.equal(s.music.warp, null);
  const arrived = await s.field(g.state.position.map, "lab");
  assert.equal(arrived.envelope, null);
  // A rejected map change still releases all presentation locks and the field music lease.
  const again = g.field.runWarp({ map: "missing-map", x: 0, y: 0, dir: "up" });
  s.audio.enabled = false;
  await assert.rejects(again, /Unknown device map/);
  assert.equal(s.music.warp, null); assert.equal(g.field.warping, false); assert.equal(g.transitions.busy, false);
});

test("changing output volume keeps the envelope phase; invalid transition policies do not replace playing music", async () => {
  const s = arrange(), first = await s.field("town");
  await s.field("route"); s.advance(64 / 60);
  s.audio.setVolume("music", 0.5);
  const event = first.gain.gain.events.findLast(e => e.at === 64 / 60);
  assert.equal(event.value, 0.25);
  assert.throws(() => s.audio.setMusic("lab", { mode: "after-fade", fadeOutMs: -1 }));
  assert.equal(s.audio.music, "route");
  assert.equal(emeraldMapMusicTransition({ warp: true, indoor: false }).fadeOutMs, 64 * 1000 / 60);
  s.audio.dispose();
});
