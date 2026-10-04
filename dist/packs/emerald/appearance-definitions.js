import { PACK } from "./pack.js";
import { objectSchema } from "../../engine/extensions/values.js";
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
  const modes = Object.keys(PACK.playerActors),
    playerVariants = Object.fromEntries(
      Object.entries(PACK.playerActors).map(([mode, actor]) => [
        mode,
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
      ]),
    );
  return {
    "emerald-player": {
      name: "默认主角",
      variants: playerVariants,
      defaultVariant: "walk",
      select: (_, c) => (modes.includes(c.mode) ? c.mode : "walk"),
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
