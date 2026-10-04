import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { loadContentSync } from "../tools/content-io.mjs";
import { emeraldMusic, ORIGINAL_SONG_CUES } from "../dist/packs/emerald/audio-library.js";
import { validateAudioCue } from "../dist/engine/extensions/audio-contracts.js";

const DIST = new URL("../dist/", import.meta.url);
const catalog = JSON.parse(fs.readFileSync(new URL("plugins/catalog.json", DIST), "utf8"));
const packManifest = JSON.parse(
  fs.readFileSync(new URL("assets/audio/emerald-audio/manifest.json", DIST), "utf8"),
);

/** Register the real generated audio plugin exactly as the host would. */
async function installedMusicCues() {
  const cues = new Map();
  for (const entry of catalog.plugins.filter((p) => p.export === "audioPlugin")) {
    const module = await import(new URL(`plugins/${entry.module.slice(2)}`, DIST));
    module[entry.export].setup({
      presentation: {
        audio: (localId, cue) => cues.set(`${entry.id}:${localId}`, validateAudioCue(cue)),
      },
    });
  }
  return cues;
}

test("The game ships one enabled audio pack covering every rendered original song", async () => {
  const entries = catalog.plugins.filter((p) => p.export === "audioPlugin");
  assert.deepEqual(entries.map((p) => p.id), ["emerald-audio"]);
  assert.equal(entries[0].enabled, true);
  // No per-track plugins or per-track asset directories are left behind.
  assert.deepEqual(catalog.plugins.filter((p) => p.export === "bgmPlugin"), []);
  for (const old of packManifest.supersededPacks) {
    assert.equal(fs.existsSync(new URL(`plugins/${old}.js`, DIST)), false, old);
    assert.equal(fs.existsSync(new URL(`assets/audio/${old}`, DIST)), false, old);
  }
  const cues = await installedMusicCues();
  assert.equal(cues.size, packManifest.tracks.length);
  for (const track of packManifest.tracks) {
    const cue = cues.get(track.cueId);
    assert.ok(cue, track.cueId);
    assert.equal(cue.kind, track.kind);
    assert.equal(cue.source, track.source);
    assert.equal(fs.existsSync(new URL(track.source, DIST)), true, track.source);
  }
});

test("Chapter-one battle songs follow the original wild/trainer/rival selection", async () => {
  const { emeraldBattleSong } = await import("../dist/packs/emerald/audio-library.js");
  const cues = await installedMusicCues();
  assert.equal(emeraldBattleSong({ trainer: false }), "MUS_VS_WILD");
  assert.equal(emeraldBattleSong({ trainer: true, trainerId: "youngster" }), "MUS_VS_TRAINER");
  assert.equal(emeraldBattleSong({ trainer: true, script: "rival" }), "MUS_VS_RIVAL");
  assert.equal(emeraldMusic({ battle: { trainer: false }, map: {} }, cues), "emerald-audio:mus_vs_wild");
  assert.equal(
    emeraldMusic({ battle: { trainer: true, script: "rival" }, map: {} }, cues),
    "emerald-audio:mus_vs_rival",
  );
});

test("Every imported map keeps its original song constant and resolves to an installed loopable track", async () => {
  const db = loadContentSync(new URL("content/manifest.json", DIST));
  const cues = await installedMusicCues();
  const maps = Object.values(db.maps);
  assert.ok(maps.length >= 9);
  const seen = new Set();
  for (const map of maps) {
    // A reference map with MUS_NONE stays silent; every other map keeps its original constant.
    if (map.music === "MUS_NONE") {
      assert.equal(emeraldMusic({ map }, cues), null, map.id);
      continue;
    }
    assert.match(map.music, /^MUS_[A-Z0-9_]+$/, map.id);
    const id = emeraldMusic({ map }, cues);
    assert.ok(id, `${map.id} has no installed track for ${map.music}`);
    seen.add(map.music);
    const cue = cues.get(id);
    const data = fs.readFileSync(new URL(cue.source, DIST));
    assert.equal(data.toString("ascii", 0, 4), "RIFF");
    assert.equal(data.toString("ascii", 8, 12), "WAVE");
    assert.equal(cue.loop, true);
    assert.ok(cue.loopStart > 0 && cue.loopEnd > cue.loopStart, id);
    const channels = data.readUInt16LE(22);
    const sampleRate = data.readUInt32LE(24);
    const frames = (data.length - 44) / (channels * 2);
    assert.equal(frames, (cue.loopEnd * sampleRate), `${id} loop end is not the decoded length`);
    assert.ok(cue.loopStart * sampleRate < frames, id);
  }
  // Route101 and Route103 share one original song in the reference, like the original data.
  assert.equal(db.maps.Route101.music, db.maps.Route103.music);
  assert.equal(seen.size, 6);
  for (const song of seen) assert.ok(ORIGINAL_SONG_CUES[song], song);
});

test("An unregistered original song constant stays silent instead of guessing a track", async () => {
  const cues = await installedMusicCues();
  assert.equal(emeraldMusic({ map: { music: "MUS_NOT_IMPORTED" } }, cues), null);
  assert.equal(emeraldMusic({ map: {} }, cues), null);
  assert.equal(
    emeraldMusic({ battle: null, map: { music: "MUS_LITTLEROOT" } }, cues),
    "emerald-audio:mus_littleroot",
  );
});
