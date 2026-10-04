import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { drawWallClock } from "../dist/presentation/wall-clock-dial.js";
import { WALL_CLOCK_HAND_OFFSETS } from "../dist/packs/emerald/generated/wall-clock.js";

test("Native wall-clock assets keep transparent hand backgrounds and both period indicators", () => {
  const result = spawnSync("python3", [fileURLToPath(new URL("../tools/tests/test_clock_assets.py", import.meta.url))], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});

test("Loaded clock sheets use native angle offsets, ten-minute hour ticks and the correct PM tile", () => {
  const calls = [];
  const ctx = Object.fromEntries(["clearRect", "drawImage", "save", "restore", "translate", "rotate"].map(key => [key, (...args) => calls.push([key, ...args])]));
  const image = { complete: true, naturalWidth: 64 };
  for (const [hour, minute] of [[0,0],[3,15],[6,30],[9,45],[12,59],[23,9]]) {
    calls.length = 0;
    drawWallClock(ctx, { hour, minute }, { hands: image, handOffsets: WALL_CLOCK_HAND_OFFSETS });
    const angles = [minute * 6, hour % 12 * 30 + Math.floor(minute / 10) * 5];
    assert.deepEqual(calls.filter(c => c[0] === "translate").map(c => c.slice(1)),
      angles.map(degrees => { const [x,y] = WALL_CLOCK_HAND_OFFSETS[degrees]; return [120+x,80+y]; }));
    const draws = calls.filter(c => c[0] === "drawImage");
    assert.deepEqual(draws.slice(0,2).map(c => c.slice(2,6)), [[0,0,64,64],[0,64,64,64]]);
    assert.deepEqual(draws.slice(2).map(c => c.slice(2,6)), [[0,128,16,16],[32,128,16,16]]);
  }
});
