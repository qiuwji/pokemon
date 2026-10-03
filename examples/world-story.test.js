import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "./helpers/session.js";
test("registered NPC triggers a once-only data story", async () => {
  const plugin = manifest("story-demo", api => {
    api.content.register("mapExtensions", "guide", {
      map: "LittlerootTown", elements: [{ id: "story-demo:guide",
        x: 8, y: 9, actor: "Boy1", dir: "down", kind: "talk",
        name: "向导", text: "欢迎。", movement: { mode: "still", rangeX: 0, rangeY: 0 } }],
    });
    api.story.register("gift", {
      trigger: "interact", once: true,
      match: ({ object }) => object?.id === "story-demo:guide",
      commands: [
        { type: "dialog", name: "向导", lines: ["这是一份项目示例礼物。"] },
        { type: "reward", id: "story-demo:gift", money: 20 },
      ],
    });
  });
  const s = session([plugin]), before = s.game.state.money;
  assert(s.game.enter({ map: "LittlerootTown", x: 8, y: 10, dir: "up" }));
  await s.bus.execute("core.field.interact", {});
  await s.settle();
  assert.equal(s.dialogs[0].name, "向导");
  assert.equal(s.game.state.money, before + 20);
  assert(s.game.state.story.completed.includes("story-demo:gift"));
  await s.bus.execute("core.field.interact", {});
  await s.settle();
  assert.equal(s.game.state.money, before + 20);
});
