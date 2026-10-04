import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
import { SpriteCanvas } from "../dist/adapters/sprite-canvas.js";
test("a registered detail clip is selected, sampled and cleaned up by the real player", () => {
  const plugin = manifest("sprite-demo", api => {
    api.presentation.sprite("detail", {
      width: 64, height: 64, loop: true,
      match: { species: "mudkip", view: "detail" },
      frames: [0, 64].map(y => ({ resource: "poochyena-front",
        rect: { x: 0, y, width: 64, height: 64 }, durationMs: 50 })),
    });
  });
  const { game } = session([plugin]), before = structuredClone(game.state);
  let now = 0, pending = null;
  const draws = [], canvas = { width: 64, height: 64, getContext: () => ({
    clearRect() {}, drawImage: (...args) => draws.push(args),
  }) };
  const player = new SpriteCanvas({ canvas,
    assets: { "poochyena-front": { width: 64, height: 256 } },
    clock: { now: () => now, request: fn => { pending = fn; return 1; },
      cancel: () => { pending = null; } },
  });
  player.play(game.spriteClips.find("mudkip", "detail"));
  assert.equal(draws.at(-1)[2], 0); now = 50; pending();
  assert.equal(draws.at(-1)[2], 64); player.stop();
  assert.equal(pending, null);
  assert.deepEqual(game.state, before);
});
