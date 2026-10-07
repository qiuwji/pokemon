import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { createMonster } from "../src/engine/model.js";
import { inventoryQuantity } from "../src/engine/inventory.js";

const employee = "petalburg.woods.researcher", aqua = "petalburg.woods.aqua";
const text = lines => lines.map(line => typeof line === "string" ? line : line.runs.map(run => run.text).join("")).join("");
function pose(g, id) {
  const n = g.field.npcs.objects("PetalburgWoods").find(n => n.id === id);
  return n && [n.x, n.y, n.dir];
}
async function step(s, direction) {
  assert.equal((await s.bus.execute("core.field.move", { direction })).status, "moved");
  await s.game.timeline.wait(s.game.motion.remaining(s.game.timeline.now()));
  s.game.field.tick(s.game.timeline.now());
  await s.settle();
}
async function win(s) {
  const g = s.game;
  for (let i = 0; g.battle && i < 20; i++) {
    const index = g.battle.player.moves.findIndex(slot => slot.pp > 0 && s.db.moves[slot.id].power > 0);
    assert(index >= 0);
    assert(await g.turn({ kind: "move", index }));
    await s.settle();
  }
  assert.equal(g.battle, null);
  assert(g.state.story.rewards.includes("trainer.aquaPetalburgWoods.prize"));
}
function strongParty(s) {
  s.game.state.party = [createMonster("mudkip", 50, s.db, s.game.rng)];
}

for (const x of [26, 27]) test(`Woods lane ${x} follows source intermediate poses, real combat, retreat and departure`, async () => {
  const s = session(), g = s.game, seen = [];
  strongParty(s);
  const say = g.ui.say;
  g.ui.say = async (...args) => {
    seen.push({ text: text(args[1]), employee: pose(g, employee), aqua: pose(g, aqua), player: g.state.position.dir, battle: !!g.battle });
    await say(...args);
  };
  g.enter({ map: "PetalburgWoods", x, y: 24, dir: "up" });
  const before = g.state.money;
  await step(s, "up");
  const greeting = seen.find(s => s.text.includes("你见过一种叫蘑蘑菇"));
  assert.deepEqual(greeting.employee, x === 26 ? [26, 22, "down"] : [26, 23, "right"]);
  const help = seen.find(s => s.text.includes("请帮帮我"));
  assert.deepEqual(help.employee, [x, 24, "up"]);
  const challenge = seen.find(s => s.text.includes("来和我对战吧"));
  assert.deepEqual(challenge.aqua, [26, 22, "down"]);
  assert.equal(challenge.player, "up");
  assert.equal(g.battle?.trainerId, "aquaPetalburgWoods");
  await win(s);
  const retreat = seen.find(s => s.text.includes("今天就放过你"));
  assert.deepEqual(retreat.aqua, [26, 21, "down"]);
  const thanks = seen.find(s => s.text.includes("这些重要文件"));
  assert.equal(thanks.aqua, undefined);
  assert.equal(thanks.player, "down");
  const defeat = s.db.stories.dialogues.dialogues["woods.rescue.defeat"].lines.join("");
  assert(seen.find(s => s.text === defeat)?.battle);
  assert(!retreat.battle);
  assert.equal(g.state.position.dir, "up", "player watches the researcher leave");
  assert.equal(g.state.flags.petalburgWoodsSaved, true);
  assert.equal(g.state.money, before + 180);
  assert.equal(inventoryQuantity(g.state.bag, "great_ball"), 1);
  assert.equal(pose(g, employee), undefined);
  assert.equal(pose(g, aqua), undefined);
  g.loadDocument(g.exportDocument());
  await step(s, x === 26 ? "right" : "left");
  assert.equal(g.battle, null);
  assert.equal(pose(g, employee), undefined);
  assert.equal(pose(g, aqua), undefined);
  assert.equal(g.state.money, before + 180);
});

test("An interrupted approach can be retried from the other lane without accumulating old actor movements", async () => {
  const s = session(), g = s.game;
  strongParty(s);
  let fail = true;
  const say = g.ui.say, errors = [], logError = console.error;
  console.error = error => errors.push(error);
  try {
    g.ui.say = async (...args) => {
      if (fail && text(args[1]).includes("请帮帮我")) throw new Error("interrupted help dialogue");
      await say(...args);
    };
    g.enter({ map: "PetalburgWoods", x: 26, y: 24, dir: "up" });
    await step(s, "up");
    assert.equal(g.battle, null);
    assert.equal(g.storyBusy, false);
    assert.deepEqual(pose(g, employee), [26, 24, "up"]);
    fail = false;
    await step(s, "right");
    assert.equal(g.battle?.trainerId, "aquaPetalburgWoods");
    assert.deepEqual(pose(g, employee), [27, 24, "up"]);
    assert.deepEqual(pose(g, aqua), [26, 22, "down"]);
    await win(s);
    assert.equal(g.state.flags.petalburgWoodsSaved, true);
    assert.equal(errors.length, 1);
    assert.match(errors[0].message, /interrupted help/);
  } finally { console.error = logError; }
});

test("A committed victory with interrupted field dialogue resumes from the other lane after reload without rematching", async () => {
  const s = session(), g = s.game;
  strongParty(s);
  g.state.flags.petalburgWoodsReplayRequested = true;
  const before = g.state.money, say = g.ui.say, errors = [], logError = console.error;
  console.error = error => errors.push(error);
  try {
    g.ui.say = async (...args) => {
      if (text(args[1]).includes("今天就放过你")) throw new Error("interrupted retreat dialogue");
      await say(...args);
    };
    g.enter({ map: "PetalburgWoods", x: 26, y: 24, dir: "up" });
    await step(s, "up");
    await win(s);
    assert.notEqual(g.state.flags.petalburgWoodsSaved, true);
    assert.equal(g.state.money, before + 180);
    assert.equal(g.state.flags.petalburgWoodsReplayRequested, false, "confirmed replay victory switches to continuation even if its dialogue fails");
    assert.equal(g.storyBusy, false);
    g.loadDocument(g.exportDocument());
    g.ui.say = say;
    await step(s, "right");
    assert.equal(g.battle, null);
    assert.equal(g.state.flags.petalburgWoodsSaved, true);
    assert.equal(inventoryQuantity(g.state.bag, "great_ball"), 1);
    assert.equal(g.state.money, before + 180);
    assert.equal(pose(g, employee), undefined);
    assert.equal(pose(g, aqua), undefined);
    assert.equal(errors.length, 1);
  } finally { console.error = logError; }
});

test("An actual defeat leaves the rescue unfinished and permits a later successful challenge", async () => {
  const s = session(), g = s.game;
  g.state.party = [createMonster("mudkip", 1, s.db, g.rng)];
  g.enter({ map: "PetalburgWoods", x: 27, y: 24, dir: "up" });
  await step(s, "up");
  for (let i = 0; g.battle && i < 30; i++) {
    assert(await g.turn({ kind: "move", index: 0 }));
    await s.settle();
  }
  assert.equal(g.battle, null);
  assert.notEqual(g.state.flags.petalburgWoodsSaved, true);
  assert(!g.state.story.rewards.includes("trainer.aquaPetalburgWoods.prize"));
  assert.equal(inventoryQuantity(g.state.bag, "great_ball"), 0);
  strongParty(s);
  g.enter({ map: "PetalburgWoods", x: 26, y: 24, dir: "up" });
  await step(s, "up");
  assert.equal(g.battle?.trainerId, "aquaPetalburgWoods");
  await win(s);
  assert.equal(g.state.flags.petalburgWoodsSaved, true);
});

for (const x of [26, 27]) test(`Woods lane ${x} approaches through visible intermediate walking frames without repositioning actors`, async () => {
  const { manualStoryClock } = await import("./helpers/story-clock.js");
  const clock = manualStoryClock(), s = session(), g = s.game;
  g.timeline.now = clock.timeline.now;
  g.timeline.wait = clock.timeline.wait;
  g.enter({ map: "PetalburgWoods", x, y: 24, dir: "up" });
  strongParty(s);
  let stages = 0, done = false, failure, job;
  const stage = g.field.npcs.stage.bind(g.field.npcs);
  g.field.npcs.stage = (...args) => { stages++; return stage(...args); };
  const app = g.applications.story, run = app.runStory.bind(app);
  app.runStory = (...args) => { job = run(...args); job.then(() => { done = true; }, error => { failure = error; done = true; }); return job; };
  assert(g.move("up"));
  await clock.advance(g.motion.remaining(g.timeline.now()));
  g.tick(g.timeline.now());
  assert(job, "the real field-step entrance owns this scene");
  let walkingBetweenTiles = false, previous;
  for (let i = 0; !done && i < 2000; i++) {
    await new Promise(setImmediate);
    if (done) break;
    assert(clock.waits.length, "active scene waits on its presentation clock");
    const remaining = Math.min(...clock.waits.map(w => w.at)) - clock.timeline.now();
    await clock.advance(Math.min(16, Math.max(0, remaining)));
    g.tick(g.timeline.now());
    const n = g.field.npcs.view("PetalburgWoods", g.timeline.now()).find(n => n.id === employee);
    assert(n);
    if (n.fromY === 20 && n.toY === 21 && n.py > 320 && n.py < 336) walkingBetweenTiles = true;
    if (previous) assert(Math.hypot(n.px - previous.px, n.py - previous.py) <= 4, "no visible jump between consecutive frames");
    previous = n;
    if (g.storyBusy) assert.equal(g.move("left"), false, "the scene keeps player input locked");
  }
  assert(done, "bounded scene reaches its battle boundary");
  if (failure) throw failure;
  assert(walkingBetweenTiles, "the researcher's approach is interpolated between source cells");
  assert.equal(stages, 0);
  assert.equal(g.battle?.trainerId, "aquaPetalburgWoods");
});
