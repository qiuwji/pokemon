import test from "node:test";
import assert from "node:assert/strict";
import { AudioAdapter } from "../dist/adapters/audio.js";
import { validateAudioCue } from "../dist/engine/extensions/audio-contracts.js";
import { createEmeraldAudio } from "../dist/packs/emerald/audio-library.js";
import { SceneDirector } from "../dist/presentation/scene-director.js";
import { createEmeraldSceneDefinitions } from "../dist/packs/emerald/presentation-scenes.js";
import { Timeline } from "../dist/engine/timeline.js";
function fakeAudio() {
  const timers = new Map(),
    nodes = [];
  let sequence = 0;
  const node = () => {
    const result = {
      connect() {},
      disconnect() {
        this.disconnected = true;
      },
      start() {},
      stop() {
        this.stopped = true;
      },
      frequency: {},
      gain: {
        value: 0,
        setValueAtTime() {},
        linearRampToValueAtTime() {},
        exponentialRampToValueAtTime() {},
        cancelScheduledValues() {},
      },
    };
    nodes.push(result);
    return result;
  };
  const context = {
    currentTime: 0,
    createGain: node,
    createOscillator: node,
    createMediaElementSource: node,
    resume: async () => {},
    close: async () => {},
  };
  return {
    context,
    nodes,
    timers,
    schedule: (fn) => {
      timers.set(++sequence, fn);
      return sequence;
    },
    cancel: (id) => timers.delete(id),
  };
}
test("Music switches/muting cancels loops and voices; re-enable restores current context without spawning duplicate tracks", () => {
  const f = fakeAudio(),
    audio = new AudioAdapter({
      cues: createEmeraldAudio(),
      createContext: () => f.context,
      schedule: f.schedule,
      cancel: f.cancel,
    });
  audio.setMusic("emerald:town");
  assert.equal(f.nodes.length, 0);
  audio.enabled = true;
  const first = audio.musicVoice;
  assert(first);
  audio.setMusic("emerald:town");
  assert.equal(audio.musicVoice, first);
  audio.setMusic("emerald:battle");
  assert(first.stopped);
  assert(audio.musicVoice);
  audio.enabled = false;
  assert.equal(audio.voices.size, 0);
  assert.equal(f.timers.size, 0);
  audio.enabled = true;
  assert.equal(audio.musicVoice.id, "emerald:battle");
  audio.dispose();
  assert.equal(f.timers.size, 0);
  assert.equal(audio.voices.size, 0);
});
test("Audio resources reject traversal/malformed sequence and failed media playback releases the voice", async () => {
  assert.throws(() =>
    validateAudioCue({
      kind: "music",
      volume: 0.1,
      loop: true,
      source: "assets/../private.mp3",
    }),
  );
  assert.throws(() =>
    validateAudioCue({
      kind: "sound",
      volume: 0.1,
      loop: false,
      notes: [[60, 0]],
    }),
  );
  const f = fakeAudio(),
    errors = [],
    cue = validateAudioCue({
      kind: "sound",
      volume: 0.1,
      loop: false,
      source: "assets/chime.ogg",
    }),
    audio = new AudioAdapter({
      cues: new Map([["test", cue]]),
      createContext: () => f.context,
      createMedia: () => ({
        play: async () => {
          throw new Error("missing");
        },
        pause() {},
      }),
      schedule: f.schedule,
      cancel: f.cancel,
      onError: (e) => errors.push(e),
    });
  audio.enabled = true;
  audio.play("test");
  await new Promise(setImmediate);
  assert.equal(audio.voices.size, 0);
  assert.equal(errors.length, 1);
});
test("Synchronous media creation failure releases gain and voice before reporting the host error", () => {
  const f = fakeAudio(),
    errors = [];
  const audio = new AudioAdapter({
    cues: new Map([
      [
        "asset",
        { kind: "sound", volume: 0.1, loop: false, source: "assets/test.ogg" },
      ],
    ]),
    createContext: () => f.context,
    createMedia: () => {
      throw new Error("host creation failed");
    },
    schedule: f.schedule,
    cancel: f.cancel,
    onError: (e) => errors.push(e),
  });
  audio.enabled = true;
  assert.equal(audio.play("asset"), null);
  assert.equal(audio.voices.size, 0);
  assert.equal(f.timers.size, 0);
  assert(f.nodes.every((n) => n.disconnected));
  assert.equal(errors.length, 1);
});
test("Scene clock validates before taking control, rejects overlaps and releases scope even when cue fails", async () => {
  let resolve,
    now = 0;
  const definitions = createEmeraldSceneDefinitions(),
    director = new SceneDirector({
      definitions,
      timeline: new Timeline({
        now: () => now,
        wait: () => new Promise((r) => (resolve = r)),
      }),
    });
  await assert.rejects(director.play("unknown"));
  assert(!director.busy);
  await assert.rejects(director.play("emerald:dex", { species: 42 }));
  assert(!director.busy);
  const payload = { species: "mudkip" },
    job = director.play("emerald:dex", payload);
  payload.species = "torchic";
  now = 550;
  assert.equal(director.sample().progress, 0.5);
  assert.equal(director.sample().payload.species, "mudkip");
  await assert.rejects(director.play("emerald:title"));
  resolve();
  await job;
  assert(!director.busy);
  const broken = new SceneDirector({
    definitions,
    timeline: new Timeline({ wait: async () => {} }),
    onCue: () => {
      throw new Error("audio");
    },
  });
  await assert.rejects(broken.play("emerald:badge"));
  assert(!broken.busy);
});
test("UI scene facade serializes typed payload through the shared command envelope", async () => {
  const { createEmeraldCommandFacade } = await import(
    "../dist/packs/emerald/command-facade.js"
  );
  let received;
  const game = createEmeraldCommandFacade(
    {},
    {
      definition: () => ({ mode: "async" }),
      execute: async (id, input) => {
        received = { id, input };
        return { ok: true };
      },
    },
  );
  assert(
    (await game.playPresentation("emerald:dex", { species: "mudkip" })).ok,
  );
  assert.equal(received.id, "core.presentation.play");
  assert.deepEqual(JSON.parse(received.input.payload), { species: "mudkip" });
});
