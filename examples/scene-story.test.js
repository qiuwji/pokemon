import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session, objectSchema } from "./helpers/session.js";
test("a registered field scene focuses the view and gates a subsequent reward", async () => {
  const plugin = manifest("scene-demo", api => {
    api.presentation.scene("focus", {
      duration: 800, schema: objectSchema(),
      field: frame => ({ zoom: 1 + Math.sin(frame.progress * Math.PI) }),
    });
  });
  const { game } = session([plugin]), money = game.state.money;
  let finish;
  game.timeline.wait = () => new Promise(resolve => { finish = resolve; });
  const normal = game.cameraProjection();
  const running = game.runStory([
    { type: "presentation", id: "scene-demo:focus" },
    { type: "reward", id: "scene-demo:after", money: 5 },
  ]);
  await new Promise(setImmediate);
  assert.equal(game.state.money, money);
  assert.equal(game.cameraProjection({}, 400).width, normal.width / 2);
  assert(game.storyBusy); finish(); await running;
  assert.equal(game.state.money, money + 5);
  assert.equal(game.storyBusy, false);
  assert.deepEqual(game.cameraProjection(), normal);
});
