import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
test("data story arrival chooses a branch and persists its variable", async () => {
  const plugin = manifest("branch-demo", api => {
    api.story.register("arrival", { trigger: "step", once: true,
      where: { map: "LittlerootTown", x: 8, y: 10, width: 1, height: 1 },
      commands: [{ type: "choice", name: "向导", prompt: "领取示例奖励？",
        variable: "branch-demo.answer", cancel: "leave", options: [
          { id: "yes", label: "领取", commands: [
            { type: "reward", id: "branch-demo:gift", money: 20 },
          ] },
          { id: "leave", label: "离开", commands: [] },
        ],
      }],
    });
  });
  const s = session([plugin]), before = s.game.state.money;
  assert(s.game.enter({ map: "LittlerootTown", x: 8, y: 10, dir: "down" }));
  // Inject the same arrival callback used by FieldSession; movement is tested separately.
  s.game.step(s.game.world.cell(8, 10));
  await s.settle();
  assert.equal(s.game.state.story.variables["branch-demo.answer"], "yes");
  assert.equal(s.game.state.money, before + 20);
  s.game.loadDocument(s.game.exportDocument());
  s.game.step(s.game.world.cell(8, 10));
  await s.settle();
  assert.equal(s.game.state.money, before + 20);
});
