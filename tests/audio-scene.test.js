import test from "node:test";
import assert from "node:assert/strict";
import { AudioAdapter } from "../src/adapters/audio.js";
import { validateAudioCue } from "../src/engine/extensions/audio-contracts.js";
import { createEmeraldAudio } from "../src/packs/emerald/audio-library.js";
import { SceneDirector } from "../src/presentation/scene-director.js";
import { createEmeraldSceneDefinitions } from "../src/packs/emerald/presentation-scenes.js";
import { Timeline } from "../src/engine/timeline.js";
function fakeAudio({ fetchAsset } = {}) {
  const nodes = [],
    requests = [];
  const node = () => {
    const result = {
      connect() {},
      disconnect() {
        this.disconnected = true;
      },
      start(at, offset) {
        this.offset = offset;
      },
      stop(at) {
        this.stopped = true;
        if (at === undefined) this.onended?.();
      },
      gain: {
        value: 0,
        setValueAtTime(v) {
          this.value = v;
        },
        linearRampToValueAtTime(v) {
          this.value = v;
        },
        cancelAndHoldAtTime() {},
        cancelScheduledValues() {},
      },
    };
    nodes.push(result);
    return result;
  };
  const context = {
    currentTime: 0,
    destination: {},
    createGain: node,
    createBufferSource: node,
    decodeAudioData: async () => ({ duration: 10 }),
    resume: async () => {},
    close: async () => {},
  };
  return {
    context,
    nodes,
    requests,
    fetchAsset:
      fetchAsset ||
      (async (source) => {
        requests.push(source);
        return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
      }),
  };
}
const musicCues = () =>
  new Map([
    [
      "town",
      validateAudioCue({
        kind: "music",
        volume: 0.4,
        loop: true,
        source: "assets/town.ogg",
        loopStart: 2,
        loopEnd: 8,
      }),
    ],
    [
      "battle",
      validateAudioCue({
        kind: "music",
        volume: 0.5,
        loop: true,
        source: "assets/battle.ogg",
      }),
    ],
    [
      "hit",
      validateAudioCue({
        kind: "sound",
        volume: 0.2,
        loop: false,
        source: "assets/hit.wav",
        maxVoices: 2,
      }),
    ],
  ]);
const player = (f, more = {}) =>
  new AudioAdapter({
    cues: musicCues(),
    createContext: () => f.context,
    fetchAsset: f.fetchAsset,
    ...more,
  });

test("Completed non-looping title music stays ended across ticks, mute and visibility; selecting again restarts it", async () => {
  const f = fakeAudio(), cues = musicCues();
  cues.set("title", validateAudioCue({ kind: "music", source: "assets/title.wav", volume: .5, loop: false }));
  const audio = player(f, { cues }); audio.enabled = true;
  const voice = await audio.setMusic("title"); voice.source.onended(); await voice.finished;
  assert.equal(audio.musicVoice, null); const count = f.nodes.length;
  await audio.setMusic("title"); audio.enabled = false; audio.enabled = true;
  audio.setSuspended(true); audio.setSuspended(false); await Promise.resolve();
  assert.equal(f.nodes.length, count);
  await audio.setMusic(null); assert(await audio.setMusic("title")); audio.dispose();
});

test("fanfare music holds retain the source position, allow sounds and release only the final lease", async () => {
  const f = fakeAudio(), audio = player(f);
  audio.enabled = true;
  await audio.setMusic("town");
  f.context.currentTime = 2;
  const release = audio.holdMusic(), second = audio.holdMusic();
  assert.equal(audio.musicVoice, null);
  await audio.setMusic("town");
  assert.equal(audio.musicVoice, null);
  assert(await audio.play("hit"));
  release(); release();
  await Promise.resolve(); assert.equal(audio.musicVoice, null);
  second();
  await audio.musicRequest;
  assert.equal(audio.musicVoice.offset, 2);
  assert.equal(audio.musicVoice.cue.kind, "music");
  const end = audio.holdMusic(); audio.dispose(); end();
  await Promise.resolve(); assert.equal(audio.musicVoice, null);
});
test("Asset music switches, caches decoded buffers and resumes its sample position after mute/background pause", async () => {
  const f = fakeAudio(),
    audio = player(f);
  await audio.setMusic("town");
  assert.equal(f.nodes.length, 0);
  audio.enabled = true;
  const first = await audio.setMusic("town");
  assert(first);
  assert.equal(first.source.loopStart, 2);
  assert.equal(first.source.loopEnd, 8);
  assert.equal(await audio.setMusic("town"), first);
  f.context.currentTime = 9;
  audio.setSuspended(true);
  assert.equal(audio.voices.size, 0);
  audio.setSuspended(false);
  const resumed = await audio.setMusic("town");
  assert.equal(resumed.offset, 3);
  assert.equal(f.requests.length, 1);
  const battle = await audio.setMusic("battle");
  assert(first.stopped);
  assert.equal(battle.id, "battle");
  audio.enabled = false;
  assert.equal(audio.voices.size, 0);
  audio.enabled = true;
  assert.equal((await audio.setMusic("battle")).id, "battle");
  audio.dispose();
  assert.equal(audio.voices.size, 0);
  assert.equal(audio.buffers.size, 0);
});
test("Pending asset loads cannot start after mute, track replacement or disposal", async () => {
  const responses = new Map(),
    f = fakeAudio({
      fetchAsset: (source) => new Promise((r) => responses.set(source, r)),
    }),
    audio = player(f);
  audio.enabled = true;
  const town = audio.setMusic("town"),
    battle = audio.setMusic("battle");
  responses.get("assets/town.ogg")({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(1),
  });
  assert.equal(await town, null);
  audio.enabled = false;
  responses.get("assets/battle.ogg")({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(1),
  });
  assert.equal(await battle, null);
  assert.equal(f.nodes.length, 0);
  audio.enabled = true;
  await audio.setMusic("battle");
  const hit = audio.play("hit");
  audio.dispose();
  responses.get("assets/hit.wav")({
    ok: true,
    arrayBuffer: async () => new ArrayBuffer(1),
  });
  assert.equal(await hit, null);
  assert.equal(audio.voices.size, 0);
});
test("Asset-only contracts reject note programs, traversal and malformed loops; HTTP/decode failures can retry", async () => {
  const sound = {
    kind: "sound",
    volume: 0.1,
    loop: false,
    source: "assets/chime.ogg",
  };
  for (const bad of [
    { ...sound, source: "assets/../private.mp3" },
    { ...sound, notes: [[60, 0.1]] },
    { ...sound, source: undefined },
    { ...sound, loopStart: 1, loopEnd: 2 },
    { ...sound, loop: true, loopStart: 3, loopEnd: 2 },
    { ...sound, maxVoices: 0 },
  ])
    assert.throws(() => validateAudioCue(bad));
  let fail = true;
  const f = fakeAudio({
      fetchAsset: async () => ({
        ok: !fail,
        status: 404,
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    }),
    errors = [],
    audio = player(f, { onError: (e) => errors.push(e) });
  audio.enabled = true;
  assert.equal(await audio.play("hit"), null);
  assert.equal(audio.voices.size, 0);
  fail = false;
  assert(await audio.play("hit"));
  assert.equal(errors.length, 1);
  audio.dispose();
});
test("Sound limits, channel volume, ended cleanup and synchronous host failure release audio resources", async () => {
  const f = fakeAudio(),
    errors = [],
    audio = player(f, { onError: (e) => errors.push(e) });
  audio.enabled = true;
  const first = await audio.play("hit");
  await audio.play("hit");
  const last = await audio.play("hit");
  assert(first.stopped);
  assert.equal(audio.voices.size, 2);
  assert.equal(f.requests.length, 1);
  audio.setVolume("master", 0.5);
  assert.equal(last.gain.gain.value, 0.1);
  audio.setVolume("sound", 0.5);
  assert.equal(last.gain.gain.value, 0.05);
  assert.throws(() => audio.setVolume("unknown", 1));
  last.source.onended();
  assert.equal(audio.voices.size, 1);
  f.context.createBufferSource = () => {
    throw new Error("host failure");
  };
  assert.equal(await audio.play("hit"), null);
  assert(f.nodes.at(-1).disconnected);
  assert.equal(errors.length, 1);
  audio.dispose();
  assert.equal(audio.voices.size, 0);
});
test("Real Emerald sample library serves compressed MP3 resources and selects music by explicit content IDs", async () => {
  const fs = await import("node:fs");
  const { emeraldMusic, emeraldBattleSound } = await import(
    "../src/packs/emerald/audio-library.js"
  );
  const cues = createEmeraldAudio();
  assert(cues.size >= 9);
  for (const cue of cues.values()) {
    const data = fs.readFileSync(
      new URL("../" + cue.source, import.meta.url),
    );
    assert.match(cue.source, /\.mp3$/);
    assert.equal(data.toString("ascii", 0, 3), "ID3");
    assert.equal(cue.notes, undefined);
  }
  // The original plays a per-move sound effect, so no generic move/hurt cue is shipped.
  assert.equal(emeraldBattleSound("move", cues), null);
  assert.equal(emeraldBattleSound("hurt", cues), null);
  assert.equal(emeraldBattleSound("heal", cues), "emerald:heal");
  assert.equal(emeraldBattleSound("level", cues), "emerald:reward");
  assert.equal(emeraldBattleSound("unmatched", cues), null);
  assert.throws(
    () =>
      createEmeraldAudio({
        audioCues: new Map([["emerald:confirm", cues.get("emerald:confirm")]]),
      }),
    /Duplicate audio cue/,
  );
  const c = musicCues();
  assert.equal(emeraldMusic({ map: {} }, c), null);
  assert.equal(emeraldMusic({ map: { music: "town" } }, c), "town");
  assert.equal(
    emeraldMusic(
      { battle: true, map: { music: "town", battleMusic: "battle" } },
      c,
    ),
    "battle",
  );
  assert.equal(emeraldMusic({ map: { music: "hit" } }, c), null);
});
test("Plugin sounds request only owned registered resources outside rules/transactions and never receive host nodes", async () => {
  const { PluginHost } = await import(
    "../src/engine/extensions/plugin-host.js"
  );
  const { CommandBus } = await import(
    "../src/engine/extensions/command-bus.js"
  );
  let api, cue;
  const host = new PluginHost({ base: {} });
  host.load([
    {
      id: "audio-demo",
      apiVersion: 1,
      version: "1.0.0",
      dataVersion: 1,
      permissions: [],
      setup(a) {
        api = a;
        cue = a.presentation.audio("click", {
          kind: "sound",
          volume: 0.2,
          loop: false,
          source: "assets/audio/emerald-audio/sounds/se_select.wav",
        });
      },
    },
  ]);
  assert.throws(() => api.presentation.sound(cue));
  const state = {},
    runtime = host.attach({
      bus: new CommandBus(),
      ports: { state: () => state, query: () => ({}) },
    }),
    events = [];
  host.events.on("core:audio-request", (e) => events.push(e));
  api.presentation.sound(cue);
  assert.equal(events[0].payload.id, cue);
  assert.throws(() => api.presentation.sound("foreign:click"));
  runtime.evaluate(() => assert.throws(() => api.presentation.sound(cue)));
  runtime.active = true;
  assert.throws(() => api.presentation.sound(cue));
  runtime.active = false;
});
test("Current plugin records are required; mismatched data does not invoke an old migration callback", async () => {
  const { PluginHost } = await import(
    "../src/engine/extensions/plugin-host.js"
  );
  const { CommandBus } = await import(
    "../src/engine/extensions/command-bus.js"
  );
  const host = new PluginHost({ base: {} });
  let migrated = false;
  host.load([
    {
      id: "current",
      apiVersion: 1,
      version: "1.0.0",
      dataVersion: 2,
      permissions: [],
      setup() {},
      migrate() {
        migrated = true;
        return { version: 2, data: {}, states: {} };
      },
    },
  ]);
  const record = { version: 1, data: {}, states: {} },
    state = { extensions: { current: record } };
  assert.throws(
    () => host.attach({ bus: new CommandBus(), ports: { state: () => state } }),
    /version mismatch/,
  );
  assert.equal(migrated, false);
  assert.equal(state.extensions.current, record);
  assert.equal(record.version, 1);
});
test("Stopping all cancels pending sounds and a source start failure still releases its connections", async () => {
  let resolve;
  const f = fakeAudio({ fetchAsset: () => new Promise((r) => (resolve = r)) }),
    audio = player(f);
  audio.enabled = true;
  const pending = audio.play("hit");
  audio.stopAll();
  resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) });
  assert.equal(await pending, null);
  assert.equal(audio.voices.size, 0);
  const original = f.context.createBufferSource;
  f.context.createBufferSource = () => {
    const source = original();
    source.start = () => {
      throw new Error("start failed");
    };
    source.stop = () => {
      throw new Error("unstarted");
    };
    return source;
  };
  assert.equal(await audio.play("hit"), null);
  assert.equal(audio.voices.size, 0);
  assert(f.nodes.every((n) => n.disconnected));
  audio.dispose();
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
    "../src/game/emerald/commands/command-facade.js"
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

test("Decoder failures release cached rejection for retry and loop points cannot exceed decoded audio", async () => {
  const f = fakeAudio(),
    audio = player(f);
  let failed = true;
  f.context.decodeAudioData = async () => {
    if (failed) throw new Error("unsupported file");
    return { duration: 10 };
  };
  await assert.rejects(audio.load("hit"), /unsupported file/);
  failed = false;
  assert.equal((await audio.load("hit")).duration, 10);
  assert.equal(f.requests.length, 2);
  const loop = new AudioAdapter({
    cues: new Map([
      [
        "short",
        {
          kind: "music",
          source: "assets/short.wav",
          volume: 0.2,
          loop: true,
          loopStart: 1,
          loopEnd: 12,
        },
      ],
    ]),
    createContext: () => f.context,
    fetchAsset: f.fetchAsset,
  });
  await assert.rejects(loop.load("short"), /loop exceeds/);
  assert.equal(loop.voices.size, 0);
  loop.dispose();
  audio.dispose();
});

test('Voice completion resolves on natural end and mute so waiting stories cannot retain an audio lock', async () => {
  const f = fakeAudio(), audio = player(f);
  audio.enabled = true; await audio.unlock();
  const natural = await audio.play('hit');
  let ended = false;
  natural.finished.then(() => { ended = true; });
  await Promise.resolve(); assert.equal(ended, false);
  natural.source.onended(); await natural.finished;
  assert.equal(ended, true); assert.equal(audio.voices.size, 0);
  const stopped = await audio.play('hit');
  audio.enabled = false; await stopped.finished;
  assert.equal(audio.voices.size, 0);
  audio.dispose();
});

test('Music crossfade keeps the previous voice until decoding completes and rejects stale replacements', async () => {
  const pending = new Map(), f = fakeAudio({fetchAsset: source => new Promise(r => pending.set(source, r))});
  const audio = player(f); audio.enabled = true;
  const response = {ok:true, arrayBuffer:async()=>new ArrayBuffer(8)};
  const a = audio.setMusic('town'); pending.get('assets/town.ogg')(response); const town = await a;
  const b = audio.setMusic('battle'); assert.equal(town.stopped, false);
  pending.get('assets/battle.ogg')(response); const battle = await b;
  assert.equal(town.stopped, true); assert.equal(audio.musicVoice, battle);
  assert.equal(await audio.setMusic('battle'), battle);
  audio.dispose();
});

test("an incoming cue can cut the previous music after decoding while ordinary crossfades remain available", async () => {
  const f = fakeAudio(), cues = musicCues();
  cues.set("battle", validateAudioCue({ ...cues.get("battle"), fadePreviousMs: 0, fadeInMs: 0 }));
  const audio = player(f, { cues }); audio.enabled = true;
  const town = await audio.setMusic("town");
  await audio.setMusic("battle");
  assert.equal(town.cleaned, true);
  assert.equal(audio.musicVoice.id, "battle");
  assert.throws(() => validateAudioCue({ ...cues.get("battle"), fadePreviousMs: -1 }), /fade/);
  audio.dispose();
});

test('Returning to the playing cue cancels a pending replacement without restarting; failed replacement can retry', async () => {
  let fail = false, resolve;
  const f = fakeAudio({fetchAsset: source => source.includes('battle') ? new Promise(r => { resolve = () => r({ok:!fail,status:404,arrayBuffer:async()=>new ArrayBuffer(8)}); }) : Promise.resolve({ok:true,arrayBuffer:async()=>new ArrayBuffer(8)})});
  const errors=[], audio=player(f,{onError:e=>errors.push(e)});audio.enabled=true;
  const town=await audio.setMusic('town'), pending=audio.setMusic('battle');
  assert.equal(await audio.setMusic('town'),town);resolve();assert.equal(await pending,null);
  assert.equal(town.stopped,false);
  // Drop the cached success to exercise a genuine resource failure and retry.
  audio.buffers.delete('assets/battle.ogg'); fail=true;
  const failed=audio.setMusic('battle');resolve();assert.equal(await failed,null);assert.equal(audio.musicVoice,town);
  fail=false;const retry=audio.setMusic('battle');resolve();assert.equal((await retry).id,'battle');
  assert.equal(errors.length,1);audio.dispose();
});
