import { loadContentSync } from "../../tools/content-io.mjs";
import { manifest, session } from "./session.js";
const base = loadContentSync();
export function encounterFixture({
  permissions = ["actors", "encounters", "movement"],
  decide = () => null,
  behavior = null,
  extra = () => {},
} = {}) {
  let api;
  const plugin = manifest(
    "encounter-lab",
    (a) => {
      api = a;
      a.content.register("maps", "field", {
        ...base.maps.LittlerootTown,
        id: "encounter-lab:field",
        width: 6,
        height: 5,
        blocks: Array(30).fill(0),
        behavior: Array(30).fill(2),
        encounters: [],
        encounterRate: 180,
        connections: [],
        warps: [],
        npcs: [],
        elements: [],
        signs: [],
      });
      a.content.register("encounters", "field", {
        map: "encounter-lab:field",
        area: "land",
        rate: 180,
        entries: [{ species: "zigzagoon", weight: 1, min: 2, max: 2 }],
      });
      a.content.register("encounterPolicies", "control", {
        channel: "step",
        priority: 100,
        when: (c) => c.position.map === "encounter-lab:field",
        decide,
      });
      if (behavior)
        a.content.register("npcBehaviors", "contact", { decide: behavior });
      a.content.register("actorTemplates", "marker", {
        name: "Encounter marker",
        actor: "ProfBirch",
        behavior: behavior ? "encounter-lab:contact" : "still",
      });
      extra(a);
    },
    permissions,
  );
  const s = session([plugin]);
  s.game.enter({ map: "encounter-lab:field", x: 1, y: 2, dir: "right" });
  return {
    ...s,
    api,
    spawn: (x = 2, y = 2) =>
      api.commands.dispatch("core.actor.spawn", {
        template: "encounter-lab:marker",
        position: { map: "encounter-lab:field", x, y, dir: "left" },
      }),
    async walk(dir) {
      await api.commands.dispatch("core.field.move", { direction: dir });
      await s.game.timeline.wait(300);
      s.game.tick(s.game.timeline.now(), ["encounter-lab:field"]);
      await s.settle();
    },
  };
}
