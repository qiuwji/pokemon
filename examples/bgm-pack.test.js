import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { audioPlugin } from "../generated/plugins/emerald-audio.js";
import { AudioAdapter } from "../src/adapters/audio.js";
import { createEmeraldAudio, emeraldMusic } from "../src/packs/emerald/audio-library.js";
import { session } from "../tests/helpers/session.js";

/** Chapter-one songs ship as one pack; the map keeps the original constant. */
const manifest = JSON.parse(
  fs.readFileSync(new URL("../generated/assets/audio/emerald-audio/manifest.json", import.meta.url)),
);
const track = manifest.tracks.find((t) => t.song === "MUS_LITTLEROOT");

test("Installed original-song pack selects its named asset and loops without restarting the intro", async () => {
  const bytes = fs.readFileSync(new URL("../" + track.source, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), track.assetSha256);
  assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
  const sampleRate = bytes.readUInt32LE(24), frameSize = bytes.readUInt16LE(32);
  const duration = bytes.readUInt32LE(40) / frameSize / sampleRate;
  assert.equal(duration, track.durationSeconds);

  const s = session([audioPlugin]), cues = createEmeraldAudio(s.host);
  const id = emeraldMusic({ battle: null, map: s.game.db.maps.LittlerootTown }, cues);
  assert.equal(id, track.cueId);

  const errors = [], requests = [], sources = [];
  const node = () => ({ connect() {}, disconnect() {}, stop() {}, start() {}, gain: {
    value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, cancelScheduledValues() {},
  } });
  const context = { currentTime: 0, destination: {}, createGain: node, resume: async () => {}, close: async () => {},
    createBufferSource() { const source = node(); sources.push(source); return source; },
    decodeAudioData: async () => ({ duration }),
  };
  const audio = new AudioAdapter({ cues, createContext: () => context, onError: e => errors.push(e),
    fetchAsset: async path => { requests.push(path); return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }; },
  });
  audio.enabled = true;
  const voice = await audio.setMusic(id);
  assert(voice); assert.equal(voice.source.loop, true);
  assert.equal(voice.source.loopStart, track.cue.loopStart);
  assert.equal(voice.source.loopEnd, track.cue.loopEnd);
  context.currentTime = duration * 3 + 2;
  assert.equal(await audio.setMusic(id), voice); assert.equal(sources.length, 1);
  audio.setSuspended(true); audio.setSuspended(false);
  const resumed = await audio.setMusic(id);
  assert(resumed.offset >= track.cue.loopStart && resumed.offset < track.cue.loopEnd);
  assert.equal(requests.length, 1); assert.deepEqual(errors, []);
  audio.dispose();
});

test("Every manifest track has a matching registered cue, and the pack owns no stale module", async () => {
  const s = session([audioPlugin]);
  const cues = createEmeraldAudio(s.host);
  for (const entry of manifest.tracks) {
    assert.ok(cues.has(entry.cueId), entry.cueId);
    assert.equal(cues.get(entry.cueId).kind, entry.kind, entry.cueId);
  }
  for (const old of manifest.supersededPacks) {
    assert.equal(fs.existsSync(new URL(`../src/plugins/${old}.js`, import.meta.url)), false, old);
    assert.equal(fs.existsSync(new URL(`../generated/assets/audio/${old}`, import.meta.url)), false, old);
  }
});
