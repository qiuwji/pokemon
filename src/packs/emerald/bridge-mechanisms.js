import { objectSchema } from "../../engine/extensions/values.js";
import { BEHAVIOR as B } from "../../engine/extensions/field-content.js";
const metatile = { type: "integer", minimum: 0, maximum: 1023 };
const frames = (n) => (n * 1000) / 60;
const phases = (names) =>
  objectSchema({ phase: { type: "string", enum: names } }, ["phase"]);
const inside = (device, p) =>
  p &&
  device.map === p.map &&
  device.footprint.some(
    ({ dx, dy }) => device.x + dx === p.x && device.y + dy === p.y,
  );
const onDeck = (c) => ((c.position.elevation ?? 0) & 1) === 0;
const bridgeTile = (c, t, stage, appearance = null) => ({
  kind: "tile",
  map: c.device.map,
  x: t.x,
  y: t.y,
  scope: "visit",
  block: (t.block & ~1023) | stage,
  appearance,
});
const bounceKeys = ["dip-one", "rise-one", "dip-two", "end"];
const fortreeTiles = (c) =>
  c.tiles.filter((t) => t.behavior === B.FORTREE_BRIDGE);
const fortree = (c, stage, appearance = null) =>
  fortreeTiles(c).map((t) =>
    bridgeTile(c, t, c.device.config[stage], appearance),
  );
const press = (c) => ({
  state: { phase: "pressed" },
  operations: fortree(c, "lowered"),
  cancelTimers: bounceKeys,
});
const logTiles = (c, stage, appearance = null) =>
  c.tiles.map((t, i) =>
    bridgeTile(
      c,
      t,
      c.device.config.tiles[i][stage],
      appearance === null ? null : c.device.config.tiles[i][appearance],
    ),
  );
/** field_tasks.c policies; world appearance never changes collision/elevation or metatile behavior. */
export const EMERALD_BRIDGE_MECHANISMS = {
  "fortree-bridge": {
    scope: "visit",
    schema: phases(["raised", "pressed", "bouncing"]),
    initialState: { phase: "raised" },
    configSchema: objectSchema(
      {
        raised: metatile,
        lowered: metatile,
        lowerOnEntry: { type: "boolean" },
      },
      ["raised", "lowered"],
    ),
    activate(c) {
      return onDeck(c) ? press(c) : {};
    },
    enter(c) {
      if (!onDeck(c)) return {};
      // Match the reference without BUGFIX: arriving from ordinary land does not depress a section.
      const pressNow =
        c.device.config.lowerOnEntry ||
        c.event.payload?.fromTile?.behavior === B.FORTREE_BRIDGE;
      return {
        ...(pressNow
          ? press(c)
          : {
              state: { phase: "raised" },
              operations: fortree(c, "raised"),
              cancelTimers: bounceKeys,
            }),
        facts: [{ kind: "bridge-stepped", data: { style: "fortree" } }],
      };
    },
    leave(c) {
      if (!onDeck(c)) return {};
      return {
        state: { phase: "bouncing" },
        operations: fortree(c, "raised"),
        cancelTimers: bounceKeys,
        // The initial callback decrements 16 -> 15. Draw-only dips occur at counters 11 and 4.
        timers: [
          { key: "dip-one", delayMs: frames(4) },
          { key: "rise-one", delayMs: frames(8) },
          { key: "dip-two", delayMs: frames(11) },
          { key: "end", delayMs: frames(15) },
        ],
      };
    },
    timer(c) {
      const key = c.event.payload.key,
        dip = key === "dip-one" || key === "dip-two";
      return {
        operations: fortree(c, "raised", dip ? c.device.config.lowered : null),
        ...(key === "end" ? { state: { phase: "raised" } } : {}),
        facts: [
          {
            kind: "bridge-bounced",
            data: { phase: dip ? "lowered" : "raised" },
          },
        ],
      };
    },
  },
  "log-bridge": {
    scope: "visit",
    schema: phases(["floating", "sinking", "submerged", "rising"]),
    initialState: { phase: "floating" },
    configSchema: objectSchema(
      {
        tiles: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: objectSchema(
            { floating: metatile, half: metatile, submerged: metatile },
            ["floating", "half", "submerged"],
          ),
        },
      },
      ["tiles"],
    ),
    activate(c) {
      return {
        state: { phase: "submerged" },
        operations: logTiles(c, "submerged"),
        cancelTimers: ["sink", "rise"],
      };
    },
    enter(c) {
      const from = c.event.payload?.from;
      const effects =
        inside(c.device, from) ||
        (from?.map !== c.device.map && c.state.phase === "submerged")
          ? {}
          : {
              state: { phase: "sinking" },
              operations: logTiles(c, "half"),
              cancelTimers: ["sink", "rise"],
              timers: [{ key: "sink", delayMs: frames(8) }],
            };
      return {
        ...effects,
        facts: [{ kind: "bridge-stepped", data: { style: "logs" } }],
      };
    },
    leave(c) {
      if (inside(c.device, c.event.payload?.position)) return {};
      return {
        state: { phase: "rising" },
        operations: logTiles(c, "floating", "half"),
        cancelTimers: ["sink", "rise"],
        timers: [{ key: "rise", delayMs: frames(8) }],
      };
    },
    timer(c) {
      const submerged = c.event.payload.key === "sink";
      return {
        state: { phase: submerged ? "submerged" : "floating" },
        operations: logTiles(c, submerged ? "submerged" : "floating"),
        facts: [{ kind: "bridge-settled", data: { submerged } }],
      };
    },
  },
};
export function validateBridgeDeviceContent(catalog) {
  for (const d of Object.values(catalog.fieldDevices || {})) {
    if (!Object.hasOwn(EMERALD_BRIDGE_MECHANISMS, d.mechanism)) continue;
    const footprint = d.footprint || [{ dx: 0, dy: 0 }],
      pack = catalog.tilesets[catalog.maps[d.map].tileset];
    const stages =
      d.mechanism === "fortree-bridge"
        ? [d.config.raised, d.config.lowered]
        : d.config.tiles.flatMap((t) => [t.floating, t.half, t.submerged]);
    if (stages.some((n) => !pack.metatiles[n]))
      throw new Error("Unknown bridge metatile");
    if (d.mechanism === "fortree-bridge" && footprint.length !== 1)
      throw new Error("Fortree section must occupy one cell");
    if (
      d.mechanism === "log-bridge" &&
      (footprint.length !== 2 ||
        Math.abs(footprint[0].dx - footprint[1].dx) +
          Math.abs(footprint[0].dy - footprint[1].dy) !==
          1)
    )
      throw new Error("Log bridge needs two adjacent cells");
  }
}
