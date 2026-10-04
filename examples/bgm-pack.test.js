import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { bgmPlugin } from "../dist/plugins/emerald-first-bgm.js";
import { AudioAdapter } from "../dist/adapters/audio.js";
import { createEmeraldAudio, emeraldMusic } from "../dist/packs/emerald/audio-library.js";
import { session } from "../tests/helpers/session.js";

test("Installed original-song pack selects its named asset and loops without restarting the intro", async () => {
  const metadata = JSON.parse(fs.readFileSync(new URL("../emerald-littleroot-bgm/manifest.json", import.meta.url)));
  const bytes = fs.readFileSync(new URL("../dist/" + metadata.cue.source, import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), metadata.assetSha256);
  assert.equal(bytes.toString("ascii", 8, 12), "WAVE");
  const sampleRate = bytes.readUInt32LE(24), frameSize = bytes.readUInt16LE(32);
  const duration = bytes.readUInt32LE(40) / frameSize / sampleRate;
  assert.equal(duration, metadata.durationSeconds);
  const s = session([bgmPlugin]), cues = createEmeraldAudio(s.host);
  const id = emeraldMusic({ battle: null, map: s.game.db.maps.LittlerootTown }, cues);
  assert.equal(id, metadata.cueId);
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
  assert.equal(voice.source.loopStart, metadata.loopStartFrame / sampleRate);
  assert.equal(voice.source.loopEnd, metadata.loopEndFrame / sampleRate);
  context.currentTime = duration * 3 + 2;
  assert.equal(await audio.setMusic(id), voice); assert.equal(sources.length, 1);
  audio.setSuspended(true); audio.setSuspended(false);
  const resumed = await audio.setMusic(id);
  assert(resumed.offset >= metadata.cue.loopStart && resumed.offset < metadata.cue.loopEnd);
  assert.equal(requests.length, 1); assert.deepEqual(errors, []);
  audio.dispose();
});
