import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

test("Story evidence extraction preserves source boundaries, graph, waits and rejects unaudited or altered reviews", () => {
  const result = spawnSync("python3", [fileURLToPath(new URL("../tools/story/test_reference.py", import.meta.url))], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
});
