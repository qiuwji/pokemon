import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { AudioAdapter } from "../src/adapters/audio.js";
import { createEmeraldAudio, EMERALD_AUDIO_CUES } from "../src/packs/emerald/audio-library.js";
import { AUDIO_DELIVERY_SOURCES } from "../generated/packs/emerald/audio-delivery.js";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("generated/packs/emerald/audio-delivery.json", root)));

test("Every compressed resource keeps WAV provenance and a bounded MP3 decoding tail", () => {
  assert.equal(manifest.tracks.length, Object.keys(AUDIO_DELIVERY_SOURCES).length);
  for (const track of manifest.tracks) {
    const source = readFileSync(new URL(track.source, root));
    const delivery = readFileSync(new URL(track.output, root));
    assert.equal(createHash("sha256").update(source).digest("hex"), track.sourceSha256);
    assert.equal(createHash("sha256").update(delivery).digest("hex"), track.outputSha256);
    assert.equal(delivery.length, track.outputBytes);
    assert.equal(AUDIO_DELIVERY_SOURCES[track.source], track.output);
    assert.match(track.output, /\.mp3$/);
    const tail = track.decodedFrames - track.sourceFrames * track.decodedRate / track.sourceRate;
    assert(tail >= -1 && tail <= 1152);
  }
});

test("Core sounds resolve to compressed delivery without modifying source declarations", () => {
  const cues = createEmeraldAudio();
  for (const [id, original] of Object.entries(EMERALD_AUDIO_CUES)) {
    assert.match(original.source, /\.wav$/);
    const delivered = cues.get("emerald:" + id);
    assert.equal(delivered.source, AUDIO_DELIVERY_SOURCES[original.source]);
    assert(existsSync(new URL(delivered.source, root)));
    for (const key of Object.keys(original))
      if (key !== "source") assert.equal(delivered[key], original[key]);
  }
});

test("Compressed music loads on demand, shares a decoded cache and preserves loop/fade policy", async () => {
  const source = "generated/assets/audio/emerald-audio/music/mus_littleroot.wav";
  const track = manifest.tracks.find((entry) => entry.source === source);
  const definition = { kind: "music", source, volume: 0.5, loop: true, loopStart: 1,
    loopEnd: track.sourceFrames / track.sourceRate, fadeInMs: 300, fadeOutMs: 500 };
  const cues = createEmeraldAudio({ audioCues: new Map([
    ["fixture:scene", definition], ["fixture:alias", definition],
    ["fixture:external", { kind: "sound", source: "assets/plugin.ogg", volume: 1, loop: false }],
  ]) });
  assert.equal(cues.get("fixture:external").source, "assets/plugin.ogg");
  assert.equal(definition.source, source);
  const delivered = cues.get("fixture:scene");
  for (const key of ["loopStart", "loopEnd", "fadeInMs", "fadeOutMs"]) assert.equal(delivered[key], definition[key]);
  const requests = [], buffer = { duration: track.decodedFrames / track.decodedRate };
  const audio = new AudioAdapter({ cues, createContext: () => ({ decodeAudioData: async () => buffer }),
    fetchAsset: async (path) => {
      requests.push(path);
      return { ok: true, arrayBuffer: async () => new ArrayBuffer(1) };
    } });
  assert.deepEqual(requests, []);
  assert.equal(await audio.load("fixture:scene"), buffer);
  assert.equal(await audio.load("fixture:alias"), buffer);
  assert.deepEqual(requests, [AUDIO_DELIVERY_SOURCES[source]]);
});
