import { objectSchema } from "../../engine/extensions/values.js";
import { BEHAVIOR } from "../../engine/terrain.js";
const metatile = { type: "integer", minimum: 0, maximum: 1023 };
const destination = objectSchema(
  {
    map: { type: "string" },
    x: { type: "integer", minimum: 0 },
    y: { type: "integer", minimum: 0 },
    dir: { type: "string", enum: ["up", "down", "left", "right"] },
  },
  ["map", "x", "y", "dir"],
);
const config = (ice) =>
  objectSchema(
    {
      holeMetatile: metatile,
      ...(ice ? { crackedMetatile: metatile } : {}),
      to: destination,
    },
    ice ? ["holeMetatile", "crackedMetatile", "to"] : ["holeMetatile", "to"],
  );
const here = (c) =>
  c.position.map === c.device.map &&
  c.position.x === c.device.x &&
  c.position.y === c.device.y &&
  (c.device.elevation === undefined ||
    c.device.elevation === 0 ||
    c.position.elevation === 0 ||
    c.position.elevation === c.device.elevation);
const fall = (c) =>
  here(c)
    ? [{ key: "fall", action: "fall", input: { device: c.device.id } }]
    : [];
const tile = (c, metatile, behavior) => ({
  kind: "tile",
  map: c.device.map,
  x: c.device.x,
  y: c.device.y,
  block: (c.tile.block & ~1023) | metatile,
  behavior,
  scope: "visit",
});
const leave = () => ({ cancelRequests: ["fall"], cancelTimers: ["watch"] });
const settle = (c) =>
  c.tile.behavior === BEHAVIOR.CRACKED_FLOOR_HOLE ? { requests: fall(c) } : {};
/** field_tasks.c: temporary gym ice masks and delayed cracked-floor opening. */
export const EMERALD_FIELD_MECHANISMS = {
  "thin-ice": {
    scope: "visit",
    schema: objectSchema({ visited: { type: "boolean" } }, ["visited"]),
    initialState: { visited: false },
    configSchema: config(true),
    leave,
    settle,
    enter(c) {
      if (
        c.tile.behavior === BEHAVIOR.THIN_ICE ||
        c.tile.behavior === BEHAVIOR.CRACKED_ICE
      ) {
        const cracking = c.tile.behavior === BEHAVIOR.THIN_ICE;
        return {
          timers: [
            {
              key: "change",
              delayMs: 5000 / 60,
              payload: cracking ? "crack" : "break",
            },
          ],
          facts: [
            {
              kind: cracking ? "ice-entered" : "ice-repeated",
              data: { visited: c.state.visited },
            },
          ],
        };
      }
      return settle(c);
    },
    timer(c) {
      const crack = c.event.payload.data === "crack";
      return {
        state: { visited: true },
        operations: [
          tile(
            c,
            crack
              ? c.device.config.crackedMetatile
              : c.device.config.holeMetatile,
            crack ? BEHAVIOR.CRACKED_ICE : BEHAVIOR.CRACKED_FLOOR_HOLE,
          ),
        ],
        requests: crack ? [] : fall(c),
        facts: [{ kind: crack ? "ice-cracked" : "ice-broken" }],
      };
    },
  },
  "cracked-floor": {
    scope: "visit",
    schema: objectSchema({ fastPass: { type: "boolean" } }, ["fastPass"]),
    initialState: { fastPass: false },
    configSchema: config(false),
    leave,
    settle(c) {
      return c.state.fastPass &&
        c.mode === "mach-bike" &&
        c.input.direction &&
        !c.input.blocked
        ? {}
        : settle(c);
    },
    enter(c) {
      return c.tile.behavior === BEHAVIOR.CRACKED_FLOOR
        ? {
            state: {
              fastPass: c.mode === "mach-bike" && c.durationMs <= 4000 / 60,
            },
            timers: [{ key: "open", delayMs: 50 }],
            facts: [
              {
                kind: "floor-entered",
                data: {
                  fastest: c.mode === "mach-bike" && c.durationMs <= 4000 / 60,
                },
              },
            ],
          }
        : settle(c);
    },
    timer(c) {
      if (c.event.payload.key === "watch")
        return !here(c)
          ? {}
          : c.state.fastPass &&
              c.mode === "mach-bike" &&
              c.input.direction &&
              !c.input.blocked
            ? { timers: [{ key: "watch", delayMs: 1000 / 60 }] }
            : { requests: fall(c) };
      const passing =
        c.state.fastPass &&
        c.mode === "mach-bike" &&
        c.input.direction &&
        !c.input.blocked;
      return {
        timers:
          passing && here(c) ? [{ key: "watch", delayMs: 1000 / 60 }] : [],
        operations: [
          tile(c, c.device.config.holeMetatile, BEHAVIOR.CRACKED_FLOOR_HOLE),
        ],
        requests: passing ? [] : fall(c),
        facts: [{ kind: "floor-opened" }],
      };
    },
  },
};
export function validateEmeraldDeviceContent(catalog) {
  for (const d of Object.values(catalog.fieldDevices || {})) {
    if (!["thin-ice", "cracked-floor"].includes(d.mechanism)) continue;
    const to = d.config.to,
      map = catalog.maps[to.map],
      pack = catalog.tilesets[catalog.maps[d.map].tileset];
    if (
      !map ||
      to.x >= map.width ||
      to.y >= map.height ||
      [d.config.holeMetatile, d.config.crackedMetatile]
        .filter((n) => n !== undefined)
        .some((n) => !pack.metatiles[n])
    )
      throw new Error("Invalid Emerald device tile or fall destination");
  }
}
