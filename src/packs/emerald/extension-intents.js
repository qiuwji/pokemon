export const EMERALD_PLUGIN_PERMISSIONS = Object.freeze([
  "encounters",
  "appearance",
  "camera",
  "environment",
  "random",
  "facilities",
  "time",
  "weather",
  "crops",
  "actors",
  "timeControl",
  "presentation",
  "world",
  "forms",
  "friendship",
  "useItem",
  "equip",
  "setLead",
  "reward",
  "createMonster",
  "movement",
  "uiControl",
  "battle",
  "starter",
  "buyItem",
  "storage",
  "daycare",
  "trade",
  "learnMove",
  "evolution",
  "save",
]);
import {
  objectSchema,
  validateSchema,
  validateValue,
} from "../../engine/extensions/values.js";
import { validateReward } from "../../engine/story.js";
const id = { type: "string", minLength: 1, maxLength: 128 };
const actorPosition = objectSchema({
  map: id, x: { type: "integer", minimum: 0 }, y: { type: "integer", minimum: 0 },
  dir: { type: "string", enum: ["up", "down", "left", "right"] },
  elevation: { type: "integer", minimum: 0, maximum: 14 },
  previousElevation: { type: "integer", minimum: 0, maximum: 14 },
}, ["map", "x", "y", "dir"]);
const actorSchemas = Object.fromEntries(Object.entries({
  spawn: objectSchema({ kind: { type: "string", enum: ["actors"] }, operation: { type: "string", enum: ["spawn"] }, template: id, position: actorPosition }, ["kind", "operation", "template", "position"]),
  update: objectSchema({ kind: { type: "string", enum: ["actors"] }, operation: { type: "string", enum: ["update"] }, uid: id,
    position: actorPosition, data: { type: "string", maxLength: 8192 }, pose: id, hidden: { type: "boolean" } }, ["kind", "operation", "uid"]),
  remove: objectSchema({ kind: { type: "string", enum: ["actors"] }, operation: { type: "string", enum: ["remove"] }, uid: id }, ["kind", "operation", "uid"]),
}).map(([operation, schema]) => [operation, validateSchema(schema)]));
const schemas = Object.fromEntries(
  Object.entries({
    weather: objectSchema(
      {
        kind: { type: "string", enum: ["weather"] },
        map: id,
        weather: id,
        clear: { type: "boolean" },
        durationMs: { type: "integer", minimum: 1, maximum: 31536000000 },
      },
      ["kind", "map"],
    ),
    friendship: objectSchema(
      {
        kind: { type: "string", enum: ["friendship"] },
        uid: id,
        amount: { type: "integer", minimum: -20, maximum: 20 },
      },
      ["kind", "uid", "amount"],
    ),
    learnMove: objectSchema(
      {
        kind: { type: "string", enum: ["learnMove"] },
        method: id,
        uid: id,
        index: { type: "integer", minimum: 0, maximum: 3 },
      },
      ["kind", "method", "uid"],
    ),
    useItem: objectSchema(
      { kind: { type: "string", enum: ["useItem"] }, uid: id, item: id },
      ["kind", "uid", "item"],
    ),
    equip: objectSchema(
      {
        kind: { type: "string", enum: ["equip"] },
        uid: id,
        item: id,
        remove: { type: "boolean" },
      },
      ["kind", "uid"],
    ),
    setLead: objectSchema(
      { kind: { type: "string", enum: ["setLead"] }, uid: id },
      ["kind", "uid"],
    ),
    createMonster: objectSchema(
      {
        kind: { type: "string", enum: ["createMonster"] },
        species: id,
        level: { type: "integer", minimum: 1, maximum: 100 },
        placement: { type: "string", enum: ["party", "box"] },
      },
      ["kind", "species", "level", "placement"],
    ),
  }).map(([kind, schema]) => [kind, validateSchema(schema)]),
);
/** Core intent shapes are pack contracts; the generic runtime only stages and commits them. */
export function validateEmeraldIntent(intent, owner, items) {
  if (intent.kind === "actors") {
    const schema = actorSchemas[intent.operation];
    if (!Object.hasOwn(actorSchemas, intent.operation)) throw new Error("Unknown actor operation");
    validateValue(schema, intent, "intent");
    return;
  }
  if (intent.kind === "reward") {
    if (
      Object.keys(intent).some((k) => !["kind", "reward"].includes(k)) ||
      !intent.reward ||
      Object.keys(intent.reward).some(
        (k) => !["id", "money", "items", "flags"].includes(k),
      )
    )
      throw new Error("Invalid reward intent shape");
    if (!intent.reward.id?.startsWith(owner + ":"))
      throw new Error("Plugin reward requires namespace");
    validateReward(intent.reward, items);
    return;
  }
  if (
    intent.kind === "weather" &&
    (intent.clear === true
      ? intent.weather !== undefined || intent.durationMs !== undefined
      : !intent.weather)
  )
    throw new Error("Specify a weather selection or clear the override");
  const schema = schemas[intent.kind];
  if (!schema) throw new Error("Unknown core intent");
  validateValue(schema, intent, "intent");
  if (
    intent.kind === "equip" &&
    (intent.remove === true ? intent.item !== undefined : !intent.item)
  )
    throw new Error("Specify an item or remove equipment");
}
