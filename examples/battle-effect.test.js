import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "./helpers/session.js";
test("registered move effect runs in a real trainer turn", async () => {
  const plugin = manifest("battle-demo", api => {
    const effect = api.content.register("moveEffects", "focus", {
      target: "self", primary: [{ op: "stages", target: "self", changes: { atk: 1 } }],
    });
    api.content.register("moves", "focus", {
      name: "蓄势示例", power: 0, accuracy: 0, pp: 20,
      type: "normal", effect, priority: 0, chance: 0, target: "self",
    });
  });
  const { game, bus, mon } = session([plugin]);
  // Arrange the move; teaching/learning is a separate domain contract.
  mon.moves = [{ id: "battle-demo:focus", pp: 20 }];
  await bus.execute("core.battle.start", { trainerId: "youngster" });
  const battle = game.battle;
  assert(battle);
  await bus.execute("core.battle.action", { kind: "move", index: 0 });
  assert(battle.events.some(e => e.kind === "stage" && e.actorUid === mon.uid && e.targetUid === mon.uid && e.stat === "atk" && e.amount === 1));
  assert.equal(mon.moves[0].pp, 19);
  assert(mon.hp > 0);
});
