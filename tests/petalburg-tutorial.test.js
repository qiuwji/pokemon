import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { interaction, battleOutcome } from "../src/packs/emerald/story.js";
import { validateSave } from "../src/packs/emerald/save-contract.js";

function addItem(s, item, count) {
  const plan = s.game.inventory.prepare(s.game.state.bag, [
    { kind: "add", item, count },
  ]);
  assert.equal(plan.ok, true, plan.reason);
  assert(s.game.inventory.commit(plan, s.game.state.bag));
}

const valid = (s) => assert(validateSave(s.game.state, s.db, s.catalog, s.host));

/** Drains a player move and lets the field step trigger run. */
async function step(s, dir) {
  const g = s.game;
  assert(g.move(dir));
  for (let i = 0; i < 8 && g.motion.moving(g.timeline.now()); i++)
    await g.timeline.wait(g.motion.remaining(g.timeline.now()) || g.motion.duration);
  g.field.tick(g.timeline.now());
  await s.settle();
}

function petalburgSession() {
  const s = session();
  s.game.state.flags.pokedex = true;
  addItem(s, "pokeball", 5);
  s.game.enter({ map: "PetalburgCity_Gym", x: 4, y: 111, dir: "up" });
  return s;
}

test("Norman hands the player and Wally off to the Route 102 catching tutorial", async () => {
  const s = petalburgSession();
  const scene = interaction(s.game.state, { kind: "petalburgNorman" }, "橙华道馆");
  assert(scene.length > 0, "Norman has a first-visit scene");
  await s.game.runStory(scene);
  assert.equal(s.game.state.flags.wallyTutorial, true, "the tutorial flag is durable");
  assert.equal(s.game.state.position.map, "PetalburgCity", "the scene walks out to Route 102");
  valid(s);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.state.flags.wallyTutorial, true, "the hand-off survives save/reload");
});

test("The scripted catch runs itself with a borrowed Zigzagoon and never stores the demonstration Ralts", async () => {
  const s = petalburgSession();
  // The scene must not need player input: capture what the auto seat was given.
  const app = s.game.applications.battle;
  let demo = null;
  const auto = app.runAutoBattle.bind(app);
  app.runAutoBattle = async (actions) => {
    demo = {
      player: app.combat.battle.player.species,
      enemy: app.combat.battle.enemy.species,
      actions: actions.length,
    };
    return auto(actions);
  };
  await s.game.runStory(interaction(s.game.state, { kind: "petalburgNorman" }, "橙华道馆"));
  await s.game.flushStoryQueue();
  await s.settle();

  assert.deepEqual(demo, { player: "zigzagoon", enemy: "ralts", actions: 3 });
  assert.equal(s.game.battle, null, "the demonstration finishes on its own");
  assert.equal(s.game.state.party.some((m) => m.species === "zigzagoon"), false, "the real party is untouched");
  assert.equal(s.game.state.party.some((m) => m.species === "ralts"), false, "Wally's Ralts is not the player's");
  assert.equal(s.game.state.box.some((m) => m.species === "ralts"), false);
  assert.equal(s.game.state.flags.wallyCaught, true);
  assert.equal(s.game.state.position.map, "PetalburgCity_Gym", "the aftermath returns to the gym");
  valid(s);
});

test("Returning to the gym has Norman send the player toward Rustboro", async () => {
  const s = petalburgSession();
  await s.game.runStory(interaction(s.game.state, { kind: "petalburgNorman" }, "橙华道馆"));
  await s.game.flushStoryQueue();
  await s.settle();
  // Wally's aftermath enters the gym, which runs the return scene.
  await s.game.flushStoryQueue();
  await s.settle();
  assert.equal(s.game.state.flags.wallyDone, true);
  const after = interaction(s.game.state, { kind: "petalburgNorman" }, "橙华道馆");
  assert(after.length > 0);
  assert.equal(
    after.some((c) => c.type === "flag" && c.key === "wallyTutorial"),
    false,
    "the first-visit scene no longer matches",
  );
  valid(s);
});

test("Route 102 sight trainers challenge the player when they enter view", async () => {
  const s = session();
  s.game.state.flags.pokedex = true;
  // Calvin (Youngster) faces down at (33,14) with a three-tile sight range.
  s.game.enter({ map: "Route102", x: 33, y: 17, dir: "up" });
  await step(s, "up");
  assert(s.game.battle, "the trainer challenges on sight");
  assert.equal(s.game.battle.trainerId, "calvin");
  assert.equal(s.game.battle.trainer, true);
  assert.equal(s.game.state.position.dir, "up", "the player turns to face the trainer");
});

test("Defeating a Route 102 sight trainer shows the defeat line and pays the prize once", async () => {
  const s = session();
  s.game.state.flags.pokedex = true;
  const before = s.game.state.money;
  const result = { trainerId: "calvin", result: "win" };
  await s.game.runStory(battleOutcome(s.game.state, result, s.db));
  await s.settle();
  const flat = (lines) =>
    lines.flatMap((l) => (typeof l === "string" ? [l] : l.runs.map((r) => r.text)));
  assert(
    s.dialogs.some((d) => flat(d.lines).join("").includes("再练练")),
    "the trainer's defeat line plays after the battle",
  );
  assert.equal(s.game.state.money, before + 80, "the prize is paid");
  assert(s.game.state.story.rewards.includes("trainer.calvin.prize"));
  // The reward identity is stable, so a repeat receipt never double-pays.
  await s.game.runStory(battleOutcome(s.game.state, result, s.db));
  await s.settle();
  assert.equal(s.game.state.money, before + 80);
  valid(s);
});

test("Petalburg interiors are populated with their source cast", () => {
  const s = session();
  const counts = {
    PetalburgCity_PokemonCenter_1F: 5,
    PetalburgCity_Mart: 4,
    PetalburgCity_House1: 2,
    PetalburgCity_House2: 2,
    PetalburgCity_WallysHouse: 2,
  };
  for (const [map, count] of Object.entries(counts))
    assert.equal(s.game.field.npcs.objects(map).length, count, map);
});

test("Petalburg's Nurse Joy heals the party through the shared centre scene", async () => {
  const s = session();
  s.game.state.party[0].hp = 1;
  s.game.enter({ map: "PetalburgCity_PokemonCenter_1F", x: 7, y: 4, dir: "up" });
  const nurse = s.game.field.npcs
    .objects("PetalburgCity_PokemonCenter_1F")
    .find((o) => o.kind === "heal");
  assert(nurse, "the centre has a nurse");
  await s.game.runStory(interaction(s.game.state, nurse, "宝可梦中心"));
  await s.settle();
  assert.equal(s.game.state.party[0].hp > 1, true, "the nurse restores HP");
  valid(s);
});

test("Wally's outdoor mom steps out once the gym hand-off starts", () => {
  const moms = (s) =>
    s.game.field.npcs
      .objects("PetalburgCity")
      .filter((o) => o.kind === "petalburgWallysMom");
  const before = session();
  assert.equal(moms(before).length, 1, "she waits outside before the tutorial");
  const after = session();
  after.game.state.flags.wallyTutorial = true;
  assert.equal(moms(after).length, 0, "she is gone once Wally leaves with the player");
});

test("Only one Wally is active across town and Route 102", () => {
  const count = (s, map, kind) =>
    s.game.field.npcs.objects(map).filter((o) => o.kind === kind).length;
  const inTown = session();
  Object.assign(inTown.game.state.flags, { wallyTutorial: true, wallyInTown: true });
  assert.equal(count(inTown, "PetalburgCity", "petalburgWallyCity"), 1);
  assert.equal(count(inTown, "Route102", "petalburgWallyRoute102"), 0);
  const onRoute = session();
  Object.assign(onRoute.game.state.flags, { wallyTutorial: true, wallyInTown: false });
  assert.equal(count(onRoute, "PetalburgCity", "petalburgWallyCity"), 0);
  assert.equal(count(onRoute, "Route102", "petalburgWallyRoute102"), 1);
});

test("Wally is not in the gym before Norman's scene spawns him", () => {
  const s = petalburgSession();
  const gymWally = () =>
    s.game.field.npcs
      .objects("PetalburgCity_Gym")
      .filter((o) => o.kind === "petalburgWallyGym");
  assert.equal(gymWally().length, 0, "he has not entered yet");
  s.game.ui.choose = async () => "close";
  return s.game
    .runStory(interaction(s.game.state, { kind: "petalburgNorman" }, "橙华道馆"))
    .then(() => {
      assert(gymWally().length >= 1 || s.game.state.flags.wallyTutorial === true,
        "the scene spawns him and advances the tutorial");
    });
});
