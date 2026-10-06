import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";

test("held input cannot move the player before a mapEnter story takes control", async () => {
  const s = session(),
    g = s.game;
  g.state.playerGender = "male";
  g.state.flags = { introDone: true, introState: 5, clockSet: false };
  assert(g.enter({ map: "LittlerootTown_BrendansHouse_1F", x: 8, y: 8, dir: "up" }));
  // The early-return interruption owns a script, so field input is locked at once.
  assert.equal(g.applications.story.storyPending(), true);
  const before = { ...g.state.position };
  g.applications.movement.handleFieldInput({
    direction: "right",
    secondary: false,
    running: false,
  });
  assert.deepEqual({ ...g.state.position }, before);
  await g.flushStoryQueue();
  await s.settle();
  assert.equal(g.applications.story.storyPending(), false);
});

test("a map entry without a script does not lock held movement", () => {
  const s = session(),
    g = s.game;
  g.state.playerGender = "male";
  g.state.flags = { introDone: true, introState: 7, roomChecked: true, clockSet: true };
  assert(g.enter({ map: "LittlerootTown_BrendansHouse_1F", x: 8, y: 8, dir: "up" }));
  assert.equal(g.applications.story.storyPending(), false);
});
