import { manifest } from "../../helpers/session.js";
/** Test-only action replacement, shared limit and registered cue. */
export const augmentFixture = manifest("fixture-augment", api => {
  const move = api.content.register("moves", "burst", {
    name: "Fixture attack", power: 100, accuracy: 0, pp: 1, type: "normal", effect: "hit",
    priority: 1, chance: 0, target: "selected", contact: false,
  });
  api.content.register("battleAugments", "burst", {
    name: "Fixture augment", moves: [move], select: () => move,
    requires: c => c.sourceMove.power > 0 && c.actor.hp > 0,
    limit: { scope: "controller", max: 1 }, cost: { pp: 1 },
  });
  api.presentation.battle("cue", { kind: "augment", match: { augmentId: "fixture-augment:burst" },
    mode: "append", priority: 0,
    animation: { duration: 320, tracks: [{ effect: "status", anchor: "actor", start: 0, end: 1 }] },
  });
}, ["battle"]);
