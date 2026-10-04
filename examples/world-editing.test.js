import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";

test("a mod discovers, replaces and reads back an existing sign dialogue", async () => {
  let api, dialogue;
  const plugin = manifest("sign-mod", value => {
    api = value;
    const exports = api.story.registerBundle("speech", { version: 1,
      dialogues: { greeting: { name: "告示牌", lines: ["桥梁维修中。"] } },
      scripts: {}, entries: {},
    });
    dialogue = exports.dialogues.greeting;
  }, ["world", "movement"]);
  const s = session([plugin]), map = "LittlerootTown";
  const listing = await api.commands.dispatch("core.world.objects", { map });
  const sign = listing.objects.find(o => o.kind === "sign" && o.x === 15 && o.y === 13);
  assert(sign.capabilities.fields.includes("dialogue"));
  const result = await api.commands.dispatch("core.world.patch", { feedback: true,
    operations: JSON.stringify([{ kind: "object", map, id: sign.id, changes: { dialogue } }]),
  });
  assert.equal(result.changes[0].object.dialogue, dialogue);
  assert(s.game.enter({ map, x: 15, y: 14, dir: "up" }));
  await api.commands.dispatch("core.field.interact", {}); await s.settle();
  assert.equal(s.dialogs.at(-1).lines[0].runs[0].text, "桥梁维修中。");
  s.game.loadDocument(s.game.exportDocument());
  assert.equal((await api.commands.dispatch("core.world.objects", { map, id: sign.id })).objects[0].dialogue, dialogue);
});
