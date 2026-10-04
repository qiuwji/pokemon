import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { TRAVEL_DESTINATIONS } from "../dist/packs/emerald/movement.js";
import { objectsFor } from "../dist/packs/emerald/pack.js";

const said = (s) =>
  s.dialogs
    .at(-1)
    .lines.flatMap((line) =>
      typeof line === "string" ? [line] : line.runs.map((run) => run.text),
    );

test("A new game starts on the moving truck tile like the reference opening", () => {
  const start = TRAVEL_DESTINATIONS.LittlerootTown.position;
  assert.deepEqual(start, { map: "LittlerootTown", x: 2, y: 10, dir: "down" });
  // Brendan's house truck stands at (2,10); May's at (11,10) in the original object data.
  assert.equal(start.y, 10);
});

test("The arrival scene walks the player off the truck, lets mom speak and enters the house", async () => {
  const s = session();
  s.game.state.playerName = "小悠";
  s.game.state.flags.introDone = false;
  s.game.enter({ ...TRAVEL_DESTINATIONS.LittlerootTown.position });
  // The host flushes queued map-enter stories once per frame; headless must do it explicitly.
  for (let i = 0; i < 40 && !s.dialogs.length; i++) await s.game.flushStoryQueue();
  await s.settle();

  // Mom's original arrival line, with the player name bound.
  assert.match(said(s).join(""), /小悠，我们到了哦/);
  assert.match(said(s).join(""), /这里就是未白镇/);
  // The scene ends inside the house with the arrival flag written.
  assert.equal(s.game.state.position.map, "LittlerootTown_BrendansHouse_1F");
  assert.equal(s.game.state.flags.introDone, true);
});

test("After the arrival the fat man appears outdoors and mom is back inside", async () => {
  const s = session();
  s.game.state.flags.introDone = true;
  s.game.enter({ map: "LittlerootTown", x: 10, y: 10, dir: "down" });
  const outdoor = objectsFor(s.game.state, s.db);
  const names = outdoor.map((o) => o.sourceLocalId || o.kind);
  assert.ok(!names.includes("LOCALID_LITTLEROOT_MOM"), "mom stays inside after the arrival");
  assert.ok(outdoor.some((o) => o.x === 12 && o.y === 13), "the fat man is revealed");
});

test("The arrival scene does not replay on a later visit", async () => {
  const s = session();
  s.game.state.flags.introDone = true;
  const before = s.dialogs.length;
  s.game.enter({ map: "LittlerootTown", x: 10, y: 10, dir: "down" });
  await s.game.flushStoryQueue();
  await s.settle();
  assert.equal(s.dialogs.length, before);
  assert.equal(s.game.state.position.map, "LittlerootTown");
});
