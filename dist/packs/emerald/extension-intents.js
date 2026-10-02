export const EMERALD_PLUGIN_PERMISSIONS = Object.freeze([
  "time",
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
const schemas = Object.fromEntries(
  Object.entries({
    friendship: objectSchema(
      {
        kind: { type: "string", enum: ["friendship"] },
        uid: id,
        amount: { type: "integer", minimum: -20, maximum: 20 },
      },
      ["kind", "uid", "amount"],
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
  const schema = schemas[intent.kind];
  if (!schema) throw new Error("Unknown core intent");
  validateValue(schema, intent, "intent");
  if (
    intent.kind === "equip" &&
    (intent.remove === true ? intent.item !== undefined : !intent.item)
  )
    throw new Error("Specify an item or remove equipment");
}
