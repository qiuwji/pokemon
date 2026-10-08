import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
import { createEmeraldPresentation } from "../src/game/emerald/assembly/animations.js";
test("a plugin reskins one move through the public presentation registrations", () => {
  const plugin = manifest("move-skin", (api) => {
    const spark = api.presentation.effect("spark", { draw: () => {} });
    api.presentation.move("bubbly", {
      moveId: "water_gun",
      animation: {
        duration: 500,
        lunge: 0,
        tracks: [
          {
            effect: spark,
            anchor: "targets",
            start: 0,
            end: 1,
            parameters: { count: 3, color: "#00d0ff" },
          },
        ],
      },
    });
  });
  const s = session([plugin]);
  const registry = createEmeraldPresentation({
    host: s.host,
    typeColors: () => "#ffffff",
  });
  const animation = registry.animation({ id: "water_gun" });
  assert.equal(animation.duration, 500);
  assert.equal(animation.tracks[0].effect, "move-skin:spark");
  const layout = new Map([
    ["home:0", { x: 20, y: 100, back: true }],
    ["away:0", { x: 200, y: 30 }],
  ]);
  const [effect] = registry.sampleMove(
    {
      actorSeat: "home:0",
      targetSeat: "away:0",
      move: { id: "water_gun", type: "water", successful: true },
    },
    layout,
    0.5,
  );
  assert.equal(effect.kind, "move-skin:spark");
  assert.equal(effect.count, 3);
  assert.equal(effect.color, "#00d0ff", "the recipe's colour wins over the palette");
  // No unrelated move acquires a substitute effect.
  assert.equal(registry.animation({ id: "tackle" }), null);
});
