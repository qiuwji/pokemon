import test from "node:test";
import assert from "node:assert/strict";
import { session, manifest } from "./helpers/session.js";
import { loadContentSync } from "../tools/content-io.mjs";
import { ObservationJournal } from "../dist/engine/observation-journal.js";
import { NetworkGateway } from "../dist/engine/extensions/network-gateway.js";
const base = loadContentSync().maps.LittlerootTown_ProfessorBirchsLab;
function room() {
  const s = session([manifest("control-fixture", api => {
    const map = { ...base, id: "control-fixture:room", title: "Control fixture", width: 8, height: 8,
      blocks: Array(64).fill(0), behavior: Array(64).fill(0), indoor: true, npcs: [], signs: [],
      elements: [], connections: [], warps: [] };
    map.blocks[1 * 8 + 3] = 1024;
    api.content.register("maps", "room", map);
  })]);
  s.game.enter({ map: "control-fixture:room", x: 3, y: 3, dir: "up" });
  return s;
}
test("Movement reports a real step, animation occupation, wall collision with turning and explicit story blocking", async () => {
  const { game, bus } = room();
  const step = bus.executeSync("core.field.move", { direction: "up" }, "network");
  assert.equal(step.status, "moved"); assert.equal(step.moved, true); assert.equal(step.to.y, 2);
  const animation = bus.executeSync("core.field.move", { direction: "left" }, "network");
  assert.equal(animation.status, "animating"); assert.equal(animation.moved, false);
  assert.equal(game.state.position.dir, "up"); assert(animation.availability.remainingMs > 0);
  await game.timeline.wait(game.motion.duration);
  game.field.tick(game.timeline.now());
  const blocked = bus.executeSync("core.field.move", { direction: "up" }, "network");
  assert.equal(blocked.status, "blocked"); assert.equal(blocked.reason, "wall"); assert.equal(blocked.moved, false);
  assert.equal(game.state.position.y, 2);
  game.storyBusy = true;
  const busy = bus.executeSync("core.field.move", { direction: "down" }, "network");
  assert.equal(busy.status, "busy"); assert.equal(busy.reason, "story"); assert.equal(busy.availability.remainingMs, null);
});
test("A walk awaits actual field completion, stops at the blocked instruction and retains its real partial receipt", async () => {
  const { game, bus } = room(), before = game.state.position.y;
  const result = await bus.execute("core.control.walk", { directions: ["up", "up", "left"] }, "network");
  assert.equal(result.status, "stopped"); assert.equal(result.reason, "wall");
  assert.equal(result.completed, 1); assert.equal(result.attempted, 2); assert.equal(result.stoppedAt, 1);
  assert.equal(result.steps[0].settled, true); assert.equal(result.steps[1].moved, false);
  assert.equal(game.state.position.y, before - 1); assert.equal(bus.active, null);
  const complete = await bus.execute("core.control.walk", { directions: ["left", "down"] }, "network");
  assert.equal(complete.status, "completed"); assert.equal(complete.completed, 2);
});
test("Observation journal reports gaps and paginated cursors and never holds live mutable data", () => {
  const j = new ObservationJournal({ limit: 2, now: () => 4 }), payload = { map: "a" };
  j.record("map.changed", payload); payload.map = "wrong";
  assert.equal(j.read().entries[0].data.map, "a");
  j.record("teleport"); j.record("choice.opened");
  const page = j.read({ since: 0, limit: 1 });
  assert.equal(page.gap, true); assert.equal(page.nextCursor, 2); assert.equal(page.hasMore, true);
  assert.equal(j.read({ since: page.nextCursor }).entries[0].type, "choice.opened");
  assert.throws(() => j.read({ since: -1 })); assert(Object.isFrozen(page.entries));
});
test("Walking can be observed and cancelled while active; no following instructions run", async () => {
  const { game, bus } = room();
  let release;
  game.timeline.wait = () => new Promise(resolve => { release = resolve; });
  const pending = bus.execute("core.control.walk", { directions: ["left", "down"] }, "network");
  assert.equal(bus.executeSync("core.control.availability", {}, "network").routeActive, true);
  assert.equal(bus.executeSync("core.control.cancel", {}, "network").cancelled, true);
  // Do not need a frame to cancel a route before its second instruction.
  release();
  const result = await pending;
  assert.equal(result.reason, "cancelled"); assert.equal(result.completed, 1); assert.equal(game.state.position.y, 3);
});
test("Network observations validate before movement, attach the real final state and deduplicate the entire receipt", async () => {
  const { bus, game } = room(), gateway = new NetworkGateway({ bus, session: "s" });
  const send = data => gateway.receive(JSON.stringify({ protocol: 1, type: "command", session: "s", ...data }));
  const request = { id: "walk", sequence: 1, command: "core.control.walk", input: { directions: ["left", "down"] }, observe: "core.control.availability" };
  const first = await send(request);
  assert.equal(first.ok, true); assert.equal(first.result.completed, 2); assert.equal(first.state.canMove, true);
  assert.deepEqual(await send(request), first);
  const position = structuredClone(game.state.position);
  const invalid = await send({ id: "bad", sequence: 2, command: "core.field.move", input: { direction: "right" }, observe: "core.ui.input", observeInput: '{"action":"confirm"}' });
  assert.equal(invalid.ok, false); assert.equal(invalid.error.code, "invalid_observation");
  assert.deepEqual(game.state.position, position);
});

test("Walk stops on a map transition or dialogue fact even when the blocking UI has already disappeared", async () => {
  const { ControlWalk } = await import("../dist/engine/control-walk.js");
  for (const type of ["map.changed", "teleport", "dialogue.started", "choice.opened", "battle.started"]) {
    let y = 0, now = 0;
    const j = new ObservationJournal();
    const runner = new ControlWalk({ move: () => { y++; return { moved: true, reason: null }; },
      availability: () => ({ canMove: true }), settle: async () => { now++; j.record(type); return null; },
      position: () => ({ y }), events: options => j.read(options), now: () => now });
    const r = await runner.run({ directions: ["up", "up"] });
    assert.equal(r.reason, type); assert.equal(r.completed, 1); assert.equal(r.stoppedAt, 0); assert.equal(y, 1);
  }
});
test("Hidden gameplay and indeterminate waits do not advertise a false action countdown", () => {
  const { game } = room();
  game.playActive = () => false;
  const a = game.control.availability(); assert.equal(a.canMove, false); assert.equal(a.reason, "hidden"); assert.equal(a.remainingMs, null);
});
