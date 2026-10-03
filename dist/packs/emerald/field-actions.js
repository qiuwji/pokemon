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
      (o) => o.kind === kind && o.x === p.x && o.y === p.y,
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
  fishing: {
    name: "钓鱼",
    cue: "field-fishing",
    duration: 400,
    schema: objectSchema(
      { rod: { type: "string", enum: ["old", "good", "super"] } },
      ["rod"],
    ),
    allowed: (c, input) =>
      (!!c.flags[input.rod + "Rod"] &&
        c.party.some((m) => !m.egg && m.hp > 0)) || {
        reason: "需要鱼竿和能够战斗的队伍。",
      },
    target: (c) => {
      const p = front(c);
      return isWater(behavior(c, p)) && behavior(c, p) !== BEHAVIOR.WATERFALL
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
