import test from "node:test";
import assert from "node:assert/strict";
import { NPCBehaviorRegistry } from "../src/engine/npc-behaviors.js";
import { NPCSystem } from "../src/engine/npcs.js";
const map = {
  width: 5,
  height: 5,
  blocks: Array(25).fill(0),
  behavior: Array(25).fill(0),
  warps: [],
};
test("Registered NPC intentions retain common collision/range checks and immutable context", () => {
  const registry = new NPCBehaviorRegistry({
    "custom:walker": {
      decide: (c) => {
        assert(Object.isFrozen(c.position));
        return { dir: "right", move: true, pose: "walk", duration: 120 };
      },
    },
  });
  const npc = new NPCSystem(
    { test: map },
    () => [
      {
        id: "n",
        x: 2,
        y: 2,
        dir: "down",
        movement: { mode: "custom:walker", rangeX: 2 },
      },
    ],
    { behaviors: registry, random: () => 0.5 },
  );
  npc.tick(5000, { map: "test", x: 3, y: 2 });
  assert.equal(npc.objects("test")[0].x, 2);
  npc.tick(9000, { map: "test", x: 1, y: 1 });
  assert.equal(npc.objects("test")[0].x, 3);
  assert.equal(npc.objects("test")[0].duration, 120);
  assert.equal(npc.view("test", 9060)[0].px, 40);
});
test("A malformed NPC extension is isolated while other actors continue; jumping pose does not change occupancy", () => {
  const errors = [],
    registry = new NPCBehaviorRegistry({
      "custom:bad": () => ({ dir: "teleport", move: true, pose: "walk" }),
    });
  const npc = new NPCSystem(
    { test: map },
    () => [
      { id: "a", x: 1, y: 1, dir: "up", movement: { mode: "custom:bad" } },
      { id: "b", x: 3, y: 3, dir: "up", movement: { mode: "hop" } },
    ],
    { behaviors: registry, random: () => 0.5, onError: (e) => errors.push(e) },
  );
  npc.objects("test");
  npc.tick(5000, { map: "test", x: 4, y: 4 });
  assert.equal(errors.length, 1);
  assert.equal(npc.objects("test")[1].pose, "hop");
  assert.equal(npc.reserved(npc.objects("test")[1]).length, 1);
  assert.equal(npc.objects("test")[1].x, 3);
});

test('A scene pin keeps the same actor through definition refreshes and releases cleanly', () => {
  let version = 1;
  const npc = new NPCSystem({ test: map }, () => [{ id:'n', x:1, y:1, dir:'down', _worldVersion:version }]);
  npc.beginScene();
  const controlled = npc.control('n', 'test');
  controlled.x = controlled.toX = 2;
  version = 2;
  npc.tick(100, { map:'test', x:4, y:4 }, { paused:true });
  assert.strictEqual(npc.control('n', 'test'), controlled);
  assert.strictEqual(npc.states.get('test:n'), controlled);
  assert.equal(npc.objects('test')[0].x, 2);
  npc.endScene();
  assert.equal(npc.objects('test')[0].x, 1, 'after release the changed definition can apply');
});
