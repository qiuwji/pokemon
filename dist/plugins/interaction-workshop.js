import { objectSchema } from "../engine/extensions/values.js";
import { frontCell } from "../engine/extensions/field-utils.js";
/** Optional author example. Crate, terrain and item share public field actions; no story scripts. */
export function createInteractionWorkshop(baseMap) {
  return {
    id: "interaction-workshop",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      const room = "interaction-workshop:room";
      const behavior = Array(64).fill(0);
      behavior[2 * 8 + 1] = 2;
      api.content.register("maps", "room", {
        ...baseMap,
        id: room,
        title: "交互接口示例",
        width: 8,
        height: 8,
        indoor: true,
        blocks: Array(64).fill(0),
        behavior,
        npcs: [],
        signs: [],
        connections: [],
        warps: [],
        darkness: { radius: 24, illuminatedRadius: 72 },
        elements: [
          {
            id: "crate",
            kind: "workshop-crate",
            x: 3,
            y: 3,
            actor: "BirchsBag",
            dir: "down",
          },
          {
            id: "stone",
            kind: "boulder",
            x: 5,
            y: 3,
            actor: "BirchsBag",
            dir: "down",
          },
        ],
      });
      api.content.register("fieldActions", "shift-crate", {
        name: "移动箱子",
        duration: 0,
        cue: "field-impact",
        menu: false,
        triggers: ["blocked"],
        allowed: (c) => c.mode === "walk",
        target: (c) => {
          const p = frontCell(c.position),
            o = c.objects.find(
              (o) => o.kind === "workshop-crate" && o.x === p.x && o.y === p.y,
            );
          return o ? { ...p, object: o.id } : null;
        },
        plan: (c, t) => ({
          kind: "displace",
          object: t.object,
          direction: c.position.dir,
          follow: true,
          mode: "walk",
          duration: 320,
          scope: "visit",
        }),
      });
      api.content.register("fieldActions", "clear-tile", {
        name: "整理草地",
        duration: 160,
        cue: "field-cut",
        triggers: ["interact"],
        allowed: (c) => c.position.map === room,
        target: (c) => {
          const p = frontCell(c.position);
          return p.x >= 0 &&
            p.x < 8 &&
            p.y >= 0 &&
            p.y < 8 &&
            c.map.behavior[p.y * 8 + p.x] === 2
            ? p
            : null;
        },
        plan: (_c, t) => ({
          kind: "world",
          operations: [{ kind: "tile", ...t, behavior: 0 }],
        }),
      });
      const effect = api.content.register("fieldEffects", "lamp", {
        scope: "visit",
        schema: objectSchema(),
        presentation: () => ({ kind: "light-radius", radius: 80 }),
      });
      const action = api.content.register("fieldActions", "light", {
        name: "点亮提灯",
        duration: 240,
        cue: "field-flash",
        allowed: (c) => !!c.map.darkness,
        target: (c) => c.position,
        plan: () => ({ kind: "effect", id: effect, data: {} }),
      });
      api.content.register("items", "lamp", {
        name: "示例提灯",
        price: 0,
        holdable: false,
        shopStock: false,
        contexts: ["field"],
        target: "field",
        effects: [],
        actions: [{ id: "light", fieldAction: action }],
      });
      const mechanism = api.content.register(
        "fieldMechanisms",
        "weight-sensor",
        {
          scope: "visit",
          schema: objectSchema({ pressed: { type: "boolean" } }, ["pressed"]),
          initialState: { pressed: false },
          occupancy(c) {
            if (c.event.payload.stage !== "settle") return {};
            const pressed = c.objects.some(
              (o) => o.x === c.device.x && o.y === c.device.y,
            );
            return {
              state: { pressed },
              facts: [{ kind: "weight-changed", data: { pressed } }],
            };
          },
        },
      );
      api.content.register("fieldDevices", "sensor", {
        map: room,
        x: 3,
        y: 2,
        mechanism,
      });
    },
  };
}
