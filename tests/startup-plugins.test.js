import test from "node:test";
import assert from "node:assert/strict";
import { session } from "../examples/helpers/session.js";
import { e2eSupport } from "../dist/plugins/e2e-support.js";
test("Browser scenario-support machine IDs resolve and a granted machine teaches through the production inventory route", async () => {
  const { game, bus, mon } = session([e2eSupport]);
  await bus.execute("e2e-support:unlock", {
    items: ["e2e-support:e2e-tm-surf"],
  });
  const result = game.teachMove("e2e-support:surf", mon.uid, 0);
  assert(result.ok);
  assert(mon.moves.some((m) => m.id === "surf"));
  assert.equal(
    game.inventory.quantity(game.state.bag, "e2e-support:e2e-tm-surf"),
    1,
  );
  assert.equal(
    game.db.items["e2e-support:e2e-tm-surf"].learningMethod,
    "e2e-support:surf",
  );
});
