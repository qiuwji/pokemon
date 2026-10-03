import { gen3CanFish } from "../../engine/rules/gen3/fishing.js";
import { BIKE_ITEMS, ROD_ITEMS } from "./field-capabilities.js";
import { GEN3_ELEVATION } from "../../engine/rules/gen3/elevation.js";
import { DIRECTIONS } from "../../engine/world.js";
import { isWater, BEHAVIOR } from "../../engine/terrain.js";
import { objectSchema } from "../../engine/extensions/values.js";

const partner = (c, move) =>
  c.party.find((m) => !m.egg && m.moves.some((s) => s.id === move));
const permission = (move, badge) => (c) =>
  (!!c.flags[badge] && !!partner(c, move)) || {
    reason: "需要相应徽章和学会这项招式的伙伴。",
  };
const front = (c) => {
  const [dx, dy] = DIRECTIONS[c.position.dir];
  return { map: c.position.map, x: c.position.x + dx, y: c.position.y + dy };
};
const behavior = (c, p) =>
  p.x < 0 || p.y < 0 || p.x >= c.map.width || p.y >= c.map.height
    ? null
    : c.map.behavior[p.y * c.map.width + p.x];
const removeObject = (kind) => (c) => {
  const p = front(c),
    object = c.objects.find(
      (o) =>
        o.kind === kind &&
        o.x === p.x &&
        o.y === p.y &&
        GEN3_ELEVATION.compatible(c.position.elevation ?? 0, o.elevation ?? 0),
    );
  return object ? { ...p, objectId: object.id } : null;
};
const hide = (c, t) => ({
  kind: "world",
  operations: [
    {
      kind: "object",
      map: t.map,
      id: t.objectId,
      hidden: true,
      scope: "visit",
    },
  ],
});
const diveTarget = (action) => (c) =>
  c.links.find(
    (l) =>
      l.action === action &&
      l.map === c.position.map &&
      l.x === c.position.x &&
      l.y === c.position.y,
  ) || null;

/** Gen III qualifications belong to the rule pack; content supplies objects, dive links and encounter tables. */
export const EMERALD_FIELD_ACTIONS = {
  fall: {
    name: "落下",
    cue: "field-fall",
    menu: false,
    duration: 80000 / 60,
    avatar: [
      {
        anchor: "actor",
        start: 0,
        end: 1,
        keyframes: [
          { at: 0, values: { y: 0, opacity: 1 } },
          { at: 0.25, easing: "in-quad", values: { y: 0, opacity: 1 } },
          { at: 1, values: { y: 24, opacity: 0 } },
        ],
      },
    ],
    schema: objectSchema(
      { device: { type: "string", minLength: 1, maxLength: 128 } },
      ["device"],
    ),
    allowed(c, input) {
      const d = c.devices.devices[input.device];
      return (
        !!d &&
        c.position.map === d.map &&
        c.position.x === d.x &&
        c.position.y === d.y &&
        GEN3_ELEVATION.compatible(
          c.position.elevation ?? 0,
          d.elevation ?? 0,
        ) &&
        behavior(c, c.position) === BEHAVIOR.CRACKED_FLOOR_HOLE
      );
    },
    target: (c, input) => ({
      ...c.position,
      device: input.device,
      to: c.devices.devices[input.device].config.to,
    }),
    plan: (c, target) => ({
      kind: "travel",
      position: target.to,
      mode: "walk",
    }),
  },
  cut: {
    name: "居合斩",
    cue: "field-cut",
    duration: 640,
    allowed: permission("cut", "badgeStone"),
    target: removeObject("cutTree"),
    plan: hide,
  },
  "rock-smash": {
    name: "碎岩",
    cue: "field-impact",
    duration: 640,
    allowed: permission("rock_smash", "badgeDynamo"),
    target: removeObject("breakableRock"),
    plan: (c, t) => ({ ...hide(c, t), encounter: "rock" }),
  },
  dive: {
    name: "潜水",
    cue: "field-dive",
    duration: 600,
    allowed: (c) => c.mode === "surf" && permission("dive", "badgeMind")(c),
    target: diveTarget("dive"),
    plan: (c, t) => ({ kind: "travel", position: t.to, mode: "dive" }),
  },
  surface: {
    name: "浮出水面",
    cue: "field-dive",
    duration: 600,
    allowed: (c) => c.mode === "dive" && permission("dive", "badgeMind")(c),
    target: diveTarget("surface"),
    plan: (c, t) => ({ kind: "travel", position: t.to, mode: "surf" }),
  },
  waterfall: {
    name: "攀瀑",
    cue: "field-water",
    duration: 480,
    allowed: (c) =>
      c.mode === "surf" &&
      c.position.dir === "up" &&
      permission("waterfall", "badgeRain")(c),
    target: (c) => {
      const start = front(c);
      if (behavior(c, start) !== BEHAVIOR.WATERFALL) return null;
      const end = { ...start };
      while (behavior(c, end) === BEHAVIOR.WATERFALL) end.y--;
      return behavior(c, end) !== null && isWater(behavior(c, end))
        ? { ...end, steps: c.position.y - end.y }
        : null;
    },
    plan: (c, t) => ({
      kind: "route",
      directions: Array(t.steps).fill("up"),
      mode: "waterfall",
    }),
  },
  cycling: {
    name: "骑上 / 收起自行车",
    cue: "field-bike",
    menu: false,
    duration: 160,
    schema: objectSchema(
      { mode: { type: "string", enum: Object.keys(BIKE_ITEMS) } },
      ["mode"],
    ),
    allowed(c, input) {
      if (!(c.bag[BIKE_ITEMS[input.mode]] > 0))
        return { reason: "尚未获得这辆自行车。" };
      const mode = Object.hasOwn(BIKE_ITEMS, c.mode) ? "walk" : input.mode;
      return (
        c.movementOptions[mode]?.ok === true || {
          reason: c.movementOptions[mode]?.reason || "这里不能骑车。",
        }
      );
    },
    target: (c) => c.position,
    plan: (c, target, input) => ({
      kind: "movement",
      mode: Object.hasOwn(BIKE_ITEMS, c.mode) ? "walk" : input.mode,
    }),
  },
  fishing: {
    name: "钓鱼",
    cue: "field-fishing",
    duration: 400,
    schema: objectSchema(
      { rod: { type: "string", enum: ["old", "good", "super"] } },
      ["rod"],
    ),
    allowed: (c, input) =>
      (c.bag[ROD_ITEMS[input.rod]] > 0 &&
        c.party.some((m) => !m.egg && m.hp > 0)) || {
        reason: "需要鱼竿和能够战斗的队伍。",
      },
    target: (c) => {
      const p = front(c),
        tile = behavior(c, p);
      if (tile === null) return null;
      const block = c.map.blocks[p.y * c.map.width + p.x];
      return gen3CanFish({
        mode: c.mode,
        underwater: c.map.underwater,
        elevation: c.position.elevation ?? 0,
        cell: {
          behavior: tile,
          collision: (block >> 10) & 3,
          elevation: (block >> 12) & 15,
        },
      })
        ? p
        : null;
    },
    plan: (c, t, input) => ({ kind: "fishing", rod: input.rod }),
  },
};

export function validateFieldLinks(definitions = {}, catalog) {
  const origins = new Set();
  for (const [id, link] of Object.entries(definitions)) {
    const valid = (p) => {
      const m = catalog.maps[p?.map];
      return (
        m &&
        Number.isInteger(p.x) &&
        Number.isInteger(p.y) &&
        p.x >= 0 &&
        p.y >= 0 &&
        p.x < m.width &&
        p.y < m.height
      );
    };
    if (
      !link ||
      Object.keys(link).some(
        (k) => !["map", "x", "y", "action", "to"].includes(k),
      ) ||
      !["dive", "surface"].includes(link.action) ||
      !valid(link) ||
      !valid(link.to) ||
      !DIRECTIONS[link.to.dir] ||
      Object.keys(link.to).some((k) => !["map", "x", "y", "dir"].includes(k))
    )
      throw new Error(`Invalid field link ${id}`);
    const key = `${link.map}/${link.x}/${link.y}/${link.action}`;
    if (
      origins.has(key) ||
      (link.action === "dive"
        ? !!catalog.maps[link.map].underwater ||
          !catalog.maps[link.to.map].underwater
        : !catalog.maps[link.map].underwater ||
          !!catalog.maps[link.to.map].underwater)
    )
      throw new Error(`Ambiguous field link or wrong environment ${id}`);
    origins.add(key);
  }
}
