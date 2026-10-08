import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { inventoryQuantity } from "../src/engine/inventory.js";
import { validateSave } from "../src/game/emerald/assembly/save-contract.js";

async function step(s, dir) {
  const g = s.game;
  assert(g.move(dir), `player can move ${dir}`);
  for (let i = 0; i < 8 && g.motion.moving(g.timeline.now()); i++)
    await g.timeline.wait(g.motion.remaining(g.timeline.now()) || g.motion.duration);
  g.field.tick(g.timeline.now());
  await s.settle();
}

function dialogueText(s) {
  return s.dialogs.flatMap((dialog) =>
    dialog.lines.flatMap((line) =>
      typeof line === "string" ? [line] : line.runs.map((run) => run.text),
    ),
  ).join("");
}

function valid(s) {
  assert(validateSave(s.game.state, s.db, s.catalog, s.host));
}

test("Scott stops the player on each Petalburg departure lane and the encounter saves once", async () => {
  for (const y of [10, 11, 12, 13]) {
    const s = session();
    s.game.enter({ map: "PetalburgCity", x: 3, y, dir: "right" });
    await step(s, "right");
    assert.equal(s.game.state.flags.petalburgScottMet, true, `row ${y}`);
    assert(dialogueText(s).includes("看你的穿着打扮"));
    assert(dialogueText(s).includes("寻找有才能的训练家"));
    assert.equal(s.game.storyBusy, false, "Scott releases field control");
    valid(s);
    s.game.loadDocument(s.game.exportDocument());
    assert.equal(s.game.state.flags.petalburgScottMet, true);
  }
});

test("The left Petalburg Woods entrance triggers the rescue battle and pays its rewards once", async () => {
  const s = session();
  s.game.enter({ map: "PetalburgWoods", x: 26, y: 24, dir: "up" });
  const before = s.game.state.money;
  await step(s, "up");
  assert(s.game.battle, "the scripted Aqua challenge starts from the map step");
  assert.equal(s.game.battle.trainerId, "aquaPetalburgWoods");
  assert.equal(s.game.battle.enemy.species, "poochyena");
  assert.equal(s.game.battle.enemy.level, 9);
  s.game.battle.finish("win");
  await s.game.combat.finish();
  await s.settle();
  assert.equal(s.game.state.money, before + 180);
  assert.equal(inventoryQuantity(s.game.state.bag, "great_ball"), 1);
  assert.equal(s.game.state.flags.petalburgWoodsSaved, true);
  assert(dialogueText(s).includes("你见过一种叫蘑蘑菇的宝可梦吗"));
  assert(dialogueText(s).includes("这些重要文件"));
  valid(s);
  s.game.loadDocument(s.game.exportDocument());
  assert.equal(s.game.state.flags.petalburgWoodsSaved, true);
  assert.equal(s.game.state.money, before + 180);
  assert.equal(inventoryQuantity(s.game.state.bag, "great_ball"), 1);
});

test("The right entrance uses its side-specific rescue choreography", async () => {
  const s = session();
  s.game.enter({ map: "PetalburgWoods", x: 27, y: 24, dir: "up" });
  await step(s, "up");
  assert(s.game.battle);
  assert.equal(s.game.battle.trainerId, "aquaPetalburgWoods");
  s.game.battle.finish("win");
  await s.game.combat.finish();
  await s.settle();
  assert.equal(s.game.state.flags.petalburgWoodsSaved, true);
  valid(s);
});

test("Losing to the Aqua grunt does not mark the rescue or award its item", async () => {
  const s = session();
  s.game.enter({ map: "PetalburgWoods", x: 26, y: 24, dir: "up" });
  await step(s, "up");
  assert(s.game.battle);
  s.game.battle.finish("loss");
  await s.game.combat.finish();
  await s.settle();
  assert.notEqual(s.game.state.flags.petalburgWoodsSaved, true);
  assert.notEqual(s.game.state.story.rewards.includes("petalburg.woods.great-ball"), true);
  valid(s);
});

test("Petalburg Woods keeps the source cast in place and wires the girl and ground items", async () => {
  const s = session();
  s.game.enter({ map: "PetalburgWoods", x: 32, y: 5, dir: "right" });
  const objects = s.game.field.npcs.objects("PetalburgWoods");
  const at = (id) => objects.find((object) => object.id === id);
  assert.deepEqual(
    [at("petalburg.woods.researcher").actor, at("petalburg.woods.researcher").x, at("petalburg.woods.researcher").y],
    ["Man2", 26, 20],
  );
  assert.deepEqual(
    [at("petalburg.woods.aqua").actor, at("petalburg.woods.aqua").x, at("petalburg.woods.aqua").y, at("petalburg.woods.aqua").dir],
    ["AquaMemberM", 26, 17, "right"],
  );
  assert.deepEqual(
    objects.filter((object) => object.kind === "fieldItem").map(({ x, y, itemId }) => [x, y, itemId]),
    [[45, 7, "great_ball"], [35, 20, "x_attack"], [4, 8, "ether"], [4, 26, "paralyze_heal"]],
  );
  const girl = at("woods.girl");
  assert.deepEqual([girl.actor, girl.x, girl.y], ["Girl2", 33, 5]);
  s.game.interact();
  await s.settle();
  assert.equal(inventoryQuantity(s.game.state.bag, "miracle_seed"), 1);
  assert.equal(s.game.state.flags.woodsMiracleSeedGift, true);
  assert(dialogueText(s).includes("那是卡那兹道馆的徽章吧"));
  valid(s);

  s.game.interact();
  await s.settle();
  assert(dialogueText(s).includes("草属性招式的威力会提高"));
  assert.equal(inventoryQuantity(s.game.state.bag, "miracle_seed"), 1, "the repeat explanation grants no second seed");
});

test("A Woods field item is collectible through the normal interaction and reward path", async () => {
  const s = session();
  s.game.enter({ map: "PetalburgWoods", x: 44, y: 7, dir: "right" });
  s.game.interact();
  await s.settle();
  assert.equal(inventoryQuantity(s.game.state.bag, "great_ball"), 1);
  assert.equal(s.game.state.flags.woodsItemGreatBall, true);
  valid(s);
});
