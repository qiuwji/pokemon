import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { validateSave } from "../src/game/emerald/assembly/save-contract.js";

test("A real ledge hop emits the original sound once; animation-busy and blocked climbs stay silent", async () => {
  const s = session(), g = s.game, sounds = [];
  g.ui.sound = id => sounds.push(id);
  assert(g.enter({ map: "Route103", x: 6, y: 4, dir: "down" }));
  await s.settle();
  assert(g.move("down"));
  assert.equal(g.motion.jump, true);
  assert.deepEqual(sounds, ["emerald:ledge"]);
  assert.equal(g.move("down"), false);
  assert.deepEqual(sounds, ["emerald:ledge"]);
  await g.timeline.wait(400);
  g.field.tick(g.timeline.now());
  assert.equal(g.move("up"), false);
  assert.deepEqual(sounds, ["emerald:ledge"]);
});

// Fixed reference Route101/map.json coordinate events and scripts.inc movement arrays.
for (const [x, y, dx, dy, dir] of [
  [10, 18, 0, -1, "up"], [11, 18, 0, -1, "up"],
  [6, 15, 1, 0, "right"], [6, 16, 1, 0, "right"],
  [6, 17, 1, 0, "right"], [6, 18, 1, 0, "right"],
  [7, 13, 0, 1, "down"],
]) test(`Before rescuing Birch, (${x},${y}) pushes back towards ${dir}; rescue releases it`, async () => {
  const s = session(), g = s.game;
  Object.assign(g.state.flags, { rescued: false, heardBirch: true });
  // (6,18) is a source coordinate event embedded in an impassable corner.
  // Validate its binding without changing the original collision data.
  const impassable = x === 6 && y === 18;
  assert(g.enter({ map: "Route101", x, y: impassable ? 17 : y, dir }));
  await s.settle();
  const context = () => ({ map: "Route101", position: { ...g.state.position, x, y } });
  const commands = g.story.resolve("step", g.state, context());
  assert(commands.length);
  if (!impassable) {
    await g.runStory(commands);
    assert.deepEqual([g.state.position.x, g.state.position.y, g.state.position.dir], [x + dx, y + dy, dir]);
    assert.match(JSON.stringify(s.dialogs.at(-1).lines), /别丢下我/);
  }
  assert.equal(g.storyBusy, false);
  assert(validateSave(g.state, s.db, s.catalog, s.host));
  g.state.flags.rescued = true;
  assert.equal(g.story.resolve("step", g.state, context()).length, 0);
});
