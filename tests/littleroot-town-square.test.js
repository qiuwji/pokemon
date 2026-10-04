import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";

/** The dialogue port receives rendered line runs; compare the words the player actually reads. */
const said = (s) =>
  s.dialogs
    .at(-1)
    .lines.flatMap((line) =>
      typeof line === "string" ? [line] : line.runs.map((run) => run.text),
    );

/** Enter the real town square and talk to the original script owner. */
async function talkToTwin(flags) {
  const s = session();
  Object.assign(s.game.state.flags, flags);
  s.game.enter({ map: "LittlerootTown", x: 16, y: 11, dir: "up" });
  s.game.interact();
  await s.settle();
  return s;
}

test("The town square twin keeps the original branch order across the adventure states", async () => {
  const before = await talkToTwin({ rescued: false, pokedex: false });
  assert.deepEqual(
    said(before),
    ["这个、这个、这个！", "要是跑到外面草丛里，野生宝可梦就会跳出来！"],
  );

  const rescued = await talkToTwin({ rescued: true, pokedex: false });
  assert.deepEqual(
    said(rescued),
    ["你救下了小田卷博士！", "太好了！"],
  );

  const started = await talkToTwin({ rescued: true, pokedex: true });
  assert.deepEqual(
    said(started),
    ["你要去捕捉宝可梦吗？", "祝你好运！"],
  );
});

test("Town square bystanders and signs read the original text instead of teaching placeholders", async () => {
  const s = session();
  s.game.enter({ map: "LittlerootTown", x: 12, y: 14, dir: "up" });
  s.game.interact();
  await s.settle();
  assert.deepEqual(
    said(s),
    ["用PC就能把道具和宝可梦收放起来。", "科学的力量真是伟大！"],
  );

  s.game.enter({ map: "LittlerootTown", x: 15, y: 14, dir: "up" });
  s.game.interact();
  await s.settle();
  assert.deepEqual(
    said(s),
    ["未白镇", "“一座连色调都无法为其增色的城镇。”"],
  );
});

test("The player's house sign uses the player name and the neighbour house stays Birch's", async () => {
  const s = session();
  s.game.state.playerName = "小悠";
  s.game.enter({ map: "LittlerootTown", x: 7, y: 9, dir: "up" });
  s.game.interact();
  await s.settle();
  assert.deepEqual(said(s), ["小悠的家"]);

  s.game.enter({ map: "LittlerootTown", x: 12, y: 9, dir: "up" });
  s.game.interact();
  await s.settle();
  assert.deepEqual(said(s), ["小田卷博士的家"]);
});
