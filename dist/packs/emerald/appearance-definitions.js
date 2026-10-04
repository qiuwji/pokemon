import { PACK } from "./pack.js";
import { objectSchema } from "../../engine/extensions/values.js";
// field_special_scene.c resting sprite offsets; these never change grid occupancy.
const truckBoxes = { 'truck.box.top': [3, 3], 'truck.box.left': [0, -3], 'truck.box.right': [-3, 0] };
export function emeraldDefaultAppearance(target, context) {
  if (target.kind === 'object' && target.map === 'InsideOfTruck' && Object.hasOwn(truckBoxes, target.id))
    return { appearance: 'emerald-truck-box', data: { box: target.id } };
  return context.species
    ? { appearance: 'emerald-species', data: { species: context.species } }
    : context.actor ? { appearance: 'emerald-actor', data: { actor: context.actor } } : undefined;
}
/** Asset naming, default avatar modes and the original scene art are pack content, not renderer rules. */
export function emeraldAppearanceResources(db) {
  return {
    ...Object.fromEntries(
      Object.keys(db.species).map((id) => [
        id + "-front",
        `assets/${id}-front.png`,
      ]),
    ),
    ...(db.resources || {}),
  };
}
export function emeraldAppearances(db) {
  const actorVariants = Object.fromEntries(
    Object.entries(db.actors).map(([actor, d]) => [
      actor,
      {
        shadow: actor !== "BirchsBag",
        layers: [{ kind: "actor", actor, x: 0, y: 16 - d.h }],
      },
    ]),
  );
  const speciesVariants = Object.fromEntries(
    Object.keys(db.species).map((species) => [
      species,
      {
        layers: [
          {
            kind: "image",
            resource: species + "-front",
            rect: { x: 0, y: 0, width: 64, height: 64 },
            size: { width: 20, height: 20 },
            x: -1,
            y: -6,
          },
        ],
      },
    ]),
  );
  const avatars = { male: PACK.playerActors, female: Object.fromEntries(Object.entries(PACK.playerActors).map(([mode, actor]) => [mode, actor.replace("Brendan", "May")])) };
  const modes = Object.keys(PACK.playerActors),
    playerVariants = Object.fromEntries(
      Object.entries(avatars).flatMap(([gender, actors]) => Object.entries(actors).map(([mode, actor]) => [
        `${gender}:${mode}`,
        {
          layers: [
            {
              kind: "actor",
              actor,
              y: -16,
              ...(mode === "surf"
                ? { bob: { amplitude: 1.5, periodMs: Math.PI * 360 } }
                : {}),
            },
          ],
        },
      ])),
    );
  return {
    "emerald-truck-box": {
      name: "搬家纸箱",
      schema: objectSchema({ box: { type: "string", enum: Object.keys(truckBoxes) } }, ["box"]),
      initialData: { box: "truck.box.top" },
      variants: Object.fromEntries(Object.entries(truckBoxes).map(([id, [x, y]]) => [id, {
        shadow: false, layers: [{ kind: "actor", actor: "MovingBox", x, y: 16 - db.actors.MovingBox.h + y }],
      }])),
      defaultVariant: "truck.box.top",
      select: (data) => data.box,
    },
    "emerald-player": {
      name: "默认主角",
      variants: playerVariants,
      defaultVariant: "male:walk",
      select: (_, c) => `${c.gender || "male"}:${modes.includes(c.mode) ? c.mode : "walk"}`,
    },
    "emerald-actor": {
      name: "场景角色",
      schema: objectSchema(
        { actor: { type: "string", enum: Object.keys(db.actors) } },
        ["actor"],
      ),
      initialData: { actor: Object.keys(db.actors)[0] },
      variants: actorVariants,
      defaultVariant: Object.keys(db.actors)[0],
      select: (p) => p.actor,
    },
    "emerald-species": {
      name: "物种画面",
      schema: objectSchema(
        { species: { type: "string", enum: Object.keys(db.species) } },
        ["species"],
      ),
      initialData: { species: Object.keys(db.species)[0] },
      variants: speciesVariants,
      defaultVariant: Object.keys(db.species)[0],
      select: (p) => p.species,
    },
  };
}
