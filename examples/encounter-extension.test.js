import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
test("a plugin controls step encounters and opens a contact-owned wild battle", async () => {
  let api;
  const plugin = manifest("visible-demo", value => {
    api = value;
    api.content.register("encounterPolicies", "quiet", { channel: "step", priority: 100,
      when: c => c.position.map === "Route101", decide: () => null });
    api.content.register("actorTemplates", "marker", {
      name: "Encounter marker", actor: "ProfBirch", behavior: "still" });
  }, ["actors", "encounters", "movement"]);
  const { game } = session([plugin]);
  game.enter({ map: "Route101", x: 5, y: 11, dir: "up" });
  const region = await api.commands.dispatch("core.world.cells", { x: 5, y: 10, width: 1, height: 1 });
  assert.equal(region.cells[0].collision, 0);
  const { actor } = await api.commands.dispatch("core.actor.spawn", {
    template: "visible-demo:marker", position: { map: "Route101", x: 5, y: 10, dir: "down" } });
  const { ticket } = await api.commands.dispatch("core.encounter.prepare", { actor: actor.uid, area: "land" });
  const story = structuredClone(game.state.story);
  assert.equal(game.battle, null);
  assert.equal((await api.commands.dispatch("core.encounter.policy", { channel: "step" })).decision, null);
  await api.commands.dispatch("core.field.move", { direction: "up" });
  const contact = api.query().contacts[0].sequence;
  assert((await api.commands.dispatch("core.encounter.request", { ticket: ticket.id, contact })).ok);
  assert.equal(game.battle.enemy.species, ticket.species);
  assert.deepEqual(game.state.story, story);
});
