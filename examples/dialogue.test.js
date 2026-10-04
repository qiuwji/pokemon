import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "./helpers/session.js";
test("registered text effect reaches an NPC dialogue through the story application", async () => {
  const plugin = manifest("speech-demo", api => {
    const effect = api.presentation.textEffect("float", {
      sample: (_, c) => ({ y: Math.sin(c.elapsedMs / 120 + c.index) }),
    });
    api.content.register("mapExtensions", "guide", {
      map: "LittlerootTown", elements: [{ id: "speech-demo:guide",
        x: 8, y: 9, actor: "Boy1", dir: "down", kind: "talk", name: "向导",
        text: "你好", movement: { mode: "still", rangeX: 0, rangeY: 0 } }],
    });
    api.story.register("greeting", {
      trigger: "interact", once: true,
      match: ({ object }) => object?.id === "speech-demo:guide",
      commands: [{ type: "dialog", name: "向导", speed: 40, lines: [{ runs: [
        { text: "你好", effect }, { pauseMs: 200 }, { text: "！", color: "#ee8866" },
      ] }] }, { type: "reward", id: "speech-demo:thanks", money: 5 }],
    });
  });
  const s = session([plugin]), before = s.game.state.money;
  assert(s.game.enter({ map: "LittlerootTown", x: 8, y: 10, dir: "up" }));
  await s.bus.execute("core.field.interact", {}); await s.settle();
  assert.equal(s.dialogs[0].lines[0].runs[0].effect, "speech-demo:float");
  assert.deepEqual(s.dialogs[0].options, { speed: 40, mode: "typewriter" });
  assert.equal(s.game.state.money, before + 5);
  assert(s.game.state.story.completed.includes("speech-demo:greeting"));
});
