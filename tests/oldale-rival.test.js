import test from "node:test";
import assert from "node:assert/strict";
import { session } from "./helpers/session.js";
import { validateSave } from "../src/packs/emerald/save-contract.js";

const rival = g => g.field.npcs.objects("OldaleTown").find(n => n.id === "oldale.rival");
const setup = async (gender = "male") => {
  const s = session(), g = s.game;
  g.state.playerGender = gender; g.state.playerName = "小明";
  g.state.flags.rivalWon = true;
  g.enter({ map: "OldaleTown", x: 11, y: 18, dir: "down" });
  await g.flushStoryQueue(); await s.settle();
  return s;
};

test("Oldale rival waits only after Route 103 victory, supports legacy prize records, and disappears after the Pokédex", async () => {
  const { game: g } = await setup();
  assert.deepEqual([rival(g).x, rival(g).y, rival(g).dir, rival(g).elevation], [11,19,"up",3]);
  delete g.state.flags.rivalWon; assert.equal(rival(g), undefined);
  g.state.story.rewards.push("rival.prize"); assert(rival(g));
  g.state.flags.pokedex = true; assert.equal(rival(g), undefined);
  g.state.flags.pokedex = false; g.state.flags.oldaleRivalDone = true; assert.equal(rival(g), undefined);
});

for (const gender of ["male", "female"]) for (const x of [null,8,9,10]) {
  test(`Oldale ${gender} rival completes ${x === null ? "direct interaction" : `approach ${x}`} and walks twelve steps into Route 101`, async () => {
    const s = await setup(gender), g = s.game;
    const actor = rival(g);
    assert.equal(actor.actor, gender === "female" ? "BrendanNormal" : "MayNormal");
    if (x !== null) g.enter({ map: "OldaleTown", x, y: 19, dir: "down" });
    const before = g.state.money, prizes = [...g.state.story.rewards];
    let conversation, departure;
    const say = g.ui.say, hide = g.fieldDirector.hide.bind(g.fieldDirector);
    g.ui.say = async (name, lines, ...rest) => {
      if (name === "小遥" || name === "小悠") {
        conversation = { name, lines, actor: g.fieldDirector.actor("oldale.rival") };
      }
      return say(name, lines, ...rest);
    };
    g.fieldDirector.hide = command => {
      if (command.actor === "oldale.rival") departure = g.fieldDirector.actor(command.actor);
      return hide(command);
    };
    const commands = x === null
      ? g.story.resolve("interact", g.state, { map: "OldaleTown", object: actor })
      : g.story.resolve("step", g.state, { map: "OldaleTown", position: { ...g.state.position } });
    assert(commands.length); await g.runStory(commands); await s.settle();
    assert.equal(conversation.name, gender === "female" ? "小悠" : "小遥");
    assert(JSON.stringify(conversation.lines).includes("小明"));
    assert.equal(conversation.actor.x, x === null ? 11 : x + 1);
    assert.deepEqual([departure.map, departure.x, departure.y], ["Route101", x === null ? 11 : x + 1, 11]);
    assert.equal(g.state.flags.oldaleRivalDone, true);
    assert.equal(g.state.position.map, "OldaleTown");
    assert.equal(g.state.position.dir, "down");
    assert.equal(g.state.money, before); assert.deepEqual(g.state.story.rewards, prizes);
    assert.equal(rival(g), undefined); assert.equal(g.busy, false);
    assert(validateSave(g.state, s.db, s.catalog, s.host));
    g.loadDocument(g.exportDocument());
    assert.equal(g.state.flags.oldaleRivalDone, true); assert.equal(rival(g), undefined);
    assert.equal(g.story.resolve("step", g.state, { map: "OldaleTown", position: { map: "OldaleTown", x: 8, y: 19 } }).length, 0);
  });
}

test("Saving before Oldale conversation and reentering the town preserves the waiting rival", async () => {
  const s = await setup(), g = s.game;
  g.loadDocument(g.exportDocument()); assert(rival(g));
  g.enter({ map: "Route103", x: 9, y: 11, dir: "down" });
  g.enter({ map: "OldaleTown", x: 11, y: 18, dir: "down" });
  assert(rival(g)); assert.equal(g.state.flags.oldaleRivalDone, undefined);
});
