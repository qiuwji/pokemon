import test from "node:test";
import assert from "node:assert/strict";
import { manifest, session } from "../tests/helpers/session.js";
import { FrameSequenceBuilder } from "../src/engine/extensions/frame-sequence-builder.js";
import { poseFrames } from "../src/engine/extensions/frame-tracks.js";
import { createEmeraldPresentation } from "../src/game/emerald/assembly/animations.js";
import { emeraldBattleLayout, EMERALD_BATTLE_VIEWPORT } from "../src/packs/emerald/battle-presentation.js";
import { audioPlugin } from "../generated/plugins/emerald-audio.js";

test("external choreography uses public capabilities in a real battle and cannot dispatch from preparation", async () => {
  let prepared = 0, compiled = 0, forbidden;
  const plugin = manifest("sequence-demo", api => {
    const resource = api.content.register("resources", "impact", "generated/assets/battle/impact.png");
    api.presentation.sequence("pound", {
      kind: "move", match: { moveId: "pound" },
      prepare({ event, layout }) {
        prepared++;
        assert(Object.isFrozen(event.combatants));
        const { actorSeat, targetSeat } = event, target = layout[targetSeat];
        forbidden = api.commands.dispatch("core.battle.action", { kind: "move", index: 0 }).catch(error => error);
        return new FrameSequenceBuilder().track(poseFrames(actorSeat, 12, age => {
          compiled++; return { x: age < 6 ? age : 12 - age };
        })).track({ frames: 6, sample: () => ({ sprites: [{ resource, width: 32, height: 32, x: target.x, y: target.y }] }) }, { at: 6 }).build();
      },
    });
  }, ["battle"]);
  const s = session([audioPlugin, plugin]), g = s.game,
    registry = createEmeraldPresentation({ host: s.host });
  Object.assign(g.director, { registry, layout: emeraldBattleLayout, viewport: EMERALD_BATTLE_VIEWPORT });
  s.mon.moves = [{ id: "pound", pp: 35 }];
  await s.bus.execute("core.battle.start", { trainerId: "youngster" });
  await s.bus.execute("core.battle.action", { kind: "move", index: 0 });
  await s.settle();
  assert.equal(prepared, 1);
  assert.equal(compiled, 12);
  assert.match((await forbidden).message, /read-only callback/);
  assert.equal(s.mon.moves[0].pp, 34, "rules consume one action independently of choreography");
  assert.equal(g.director.busy, false);
  g.director.sample(); g.director.sample();
  assert.equal(compiled, 12);
});
