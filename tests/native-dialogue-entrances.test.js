import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";

const key = id => id?.toLowerCase().replaceAll("_", "-").replace("-eventscript-", ".");
const text = dialogue => dialogue.lines.map(line => typeof line === "string" ? line : line.runs.map(run => run.text).join("")).join("\n");
const sides = [[0, 1, "up"], [0, -1, "down"], [1, 0, "left"], [-1, 0, "right"]];
function face(s, map, object) {
  return sides.some(([dx, dy, dir]) => s.game.enter({ map, x: object.x + dx, y: object.y + dy, dir }) &&
    s.game.world.interact()?.script === object.script);
}

test("Every imported placement of the 68 static sign programs opens through field interaction, including after reload", async () => {
  const s = session(), g = s.game;
  const scripts = new Set(Object.values(s.db.stories["native-signs"].entries).map(entry => entry.selector.script));
  assert.equal(scripts.size, 68);
  const seen = new Set();
  let placements = 0;
  for (const [map, data] of Object.entries(s.db.maps)) for (const sign of data.signs) {
    if (!scripts.has(sign.script)) continue;
    assert(face(s, map, sign), `${map}/${sign.script} needs a legal entrance`);
    s.dialogs.length = 0;
    g.interact(); await s.settle();
    const response = s.dialogs.map(text).join("\n");
    assert(response.length > 0, sign.script);
    assert(!/尚未转写|未转写|EventScript|\{PLAYER\}|\{\{/.test(response), response);
    // Authored opening signs retain their own higher-priority state/gender branches.
    if (["Route104", "Route116", "RustboroCity_DevonCorp_1F", "RustboroCity_DevonCorp_3F"].includes(map))
      assert.equal(response, s.db.stories["native-signs"].dialogues[key(sign.script)].lines.join("\n"));
    g.loadDocument(g.exportDocument());
    s.dialogs.length = 0; g.interact(); await s.settle();
    assert.equal(s.dialogs.map(text).join("\n"), response, `${map}/${sign.script} survives load`);
    seen.add(sign.script); placements++;
  }
  assert.equal(placements, 117);
  assert.equal(seen.size, 68);
});

test("All currently visible source NPCs with static scripts speak the whole localized dialogue at their real positions", async () => {
  const s = session(), g = s.game, bundle = s.db.stories["native-npcs"], seen = new Set();
  assert.equal(Object.keys(bundle.dialogues).length, 106);
  let placements = 0;
  for (const [map, data] of Object.entries(s.db.maps)) for (const [index, source] of data.npcs.entries()) {
    if (!bundle.dialogues[key(source.script)]) continue;
    const localId = String(source.local_id ?? index + 1);
    const object = g.field.npcs.objects(map).find(object => object.sourceLocalId === localId);
    // Source visibility is controlled by its story slice; boxes are props, not NPC conversation.
    if (!object || object.actor === "MovingBox" || object.kind !== "talk") continue;
    assert(face(s, map, object), `${map}/${localId} needs a legal entrance`);
    s.dialogs.length = 0; g.interact(); await s.settle();
    assert.equal(s.dialogs.map(text).join("\n"), bundle.dialogues[key(source.script)].lines.join("\n"), source.script);
    seen.add(map); placements++;
  }
  assert.equal(placements, 90);
  assert(seen.size > 20, "coverage crosses imported towns, houses and other interiors");
});
