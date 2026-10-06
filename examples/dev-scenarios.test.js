import test from "node:test";
import assert from "node:assert/strict";
import { session } from "../tests/helpers/session.js";
import { devScenariosPlugin } from "../src/plugins/dev-scenarios/index.js";
/** Answer each nested choice with the first queued id that the menu actually offers. */
const choose = (s, ids) => {
  const queue = [...ids];
  s.game.ui.choose = async (_name, _prompt, options) => {
    const id = queue.find((candidate) =>
      options.some((o) => o.id === candidate),
    );
    if (!id)
      throw new Error(
        `No queued choice matched: ${options.map((o) => o.id).join(",")}`,
      );
    return id;
  };
};
const openTerminal = (s) => {
  s.game.enter({ map: "LittlerootTown", x: 10, y: 2, dir: "up" });
  s.game.interact();
};
test("the dev tester teleports through its real interact entry", async () => {
  const s = session([devScenariosPlugin]);
  choose(s, ["travel", "go3"]);
  openTerminal(s);
  await s.settle();
  assert.equal(s.game.state.position.map, "Route103");
  assert.deepEqual(
    [s.game.state.position.x, s.game.state.position.y],
    [4, 3],
  );
});
test("the dev tester can start a practice battle on request", async () => {
  const s = session([devScenariosPlugin]);
  choose(s, ["practice"]);
  openTerminal(s);
  await s.settle();
  assert(s.game.battle, "a practice battle is active");
});
test("the move showcase starts a single-move demo trainer", async () => {
  const s = session([devScenariosPlugin]);
  choose(s, ["moves", "group0", "tackle"]);
  openTerminal(s);
  await s.settle();
  assert(s.game.battle, "a demo battle is active");
  assert.equal(s.game.battle.trainerId, "dev-scenarios:move.tackle");
});
test("the wild showcase starts the selected species", async () => {
  const s = session([devScenariosPlugin]);
  choose(s, ["wild", "wild0"]);
  openTerminal(s);
  await s.settle();
  assert(s.game.battle, "a wild battle is active");
  assert.equal(s.game.battle.enemy.species, "poochyena");
});
test("the item reward grants through the real reward command", async () => {
  const s = session([devScenariosPlugin]);
  choose(s, ["itemdemo"]);
  openTerminal(s);
  await s.settle();
  assert(s.game.state.story.rewards.includes("dev-scenarios:item.potion"));
});
test("the dev menu action adds a party member for switch tests", async () => {
  const s = session([devScenariosPlugin]);
  const before = s.game.state.party.length;
  await s.bus.execute("dev-scenarios:give-mon", {});
  assert.equal(s.game.state.party.length, before + 1);
});
test("every placed tester resolves its interact entry", async () => {
  const s = session([devScenariosPlugin]);
  choose(s, ["close"]);
  for (const [map, x, y] of [
    ["LittlerootTown", 10, 2],
    ["OldaleTown", 8, 2],
    ["Route101", 8, 2],
    ["Route103", 4, 3],
    ["LittlerootTown_ProfessorBirchsLab", 1, 3],
    ["OldaleTown_PokemonCenter_1F", 1, 3],
  ]) {
    s.game.enter({ map, x, y, dir: "up" });
    s.game.interact();
    await s.settle();
    assert.equal(s.game.state.position.map, map, `${map} tester is reachable`);
  }
});
test("the tester menu jumps the save to a named chapter", async () => {
  const s = session([devScenariosPlugin]);
  choose(s, ["progress.wallydone"]);
  openTerminal(s);
  await s.settle();
  assert.equal(s.game.state.flags.pokedex, true);
  assert.equal(s.game.state.flags.wallyDone, true);
  assert.equal(s.game.state.position.map, "PetalburgCity_Gym");
  assert(s.game.state.story.rewards.includes("professor.pokedex"));
  assert(s.game.inventory.quantity(s.game.state.bag, "pokeball") >= 5);
});
test("a chapter jump clears later-chapter flags so earlier scenes replay", async () => {
  const s = session([devScenariosPlugin]);
  // Simulate a save that already finished the Wally tutorial.
  Object.assign(s.game.state.flags, { wallyTutorial: true, wallyCaught: true, wallyDone: true });
  choose(s, ["progress.petalburg"]);
  openTerminal(s);
  await s.settle();
  assert.equal(s.game.state.flags.pokedex, true);
  assert.equal(s.game.state.flags.wallyTutorial, false, "the tutorial flag is cleared");
  assert.equal(s.game.state.flags.wallyCaught, false);
  assert.equal(s.game.state.flags.wallyDone, false);
});
