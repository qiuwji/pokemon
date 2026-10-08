import { PACK } from "./pack.js";
import { DETAIL_SPRITE_FRAMES } from "../../../generated/packs/emerald/detail-sprite-frames.js";
import { TRAINER_PICTURES, REFLECTION_PICTURES } from "../../../generated/presentation/battle-assets.js";
import { NATIVE_BATTLE_ASSETS } from "../../../generated/packs/emerald/battle-animation-assets.js";
import { objectSchema } from "../../engine/extensions/values.js";
// field_special_scene.c resting sprite offsets; these never change grid occupancy.
const truckBoxes = { 'truck.box.top': [3, 3], 'truck.box.left': [0, -3], 'truck.box.right': [-3, 0] };
const berryPictures = ["empty", "planted", "sprouted", ...["oran", "cheri", "pecha", "leppa", "chesto", "rawst", "aspear", "persim", "pinap"].flatMap(kind => ["taller", "flowering", "ripe"].map(stage => `${kind}-${stage}`))];
export function emeraldDefaultAppearance(target, context) {
  if (context.nativeInvisible) return { appearance:"emerald-invisible", data:{} };
  if (context.berry) {
    const key = ["empty", "planted", "sprouted"].includes(context.berry.stage) ? context.berry.stage : `${context.berry.kind.replace("_berry", "")}-${context.berry.stage}`;
    if (berryPictures.includes(key)) return { appearance: "emerald-berry", data: { picture: key } };
  }
  if (target.kind === 'object' && target.map === 'InsideOfTruck' && Object.hasOwn(truckBoxes, target.id))
    return { appearance: 'emerald-truck-box', data: { box: target.id } };
  // An explicitly authored actor sheet takes precedence over the inferred species image.
  return context.actor
    ? { appearance: 'emerald-actor', data: { actor: context.actor } }
    : context.species ? { appearance: 'emerald-species', data: { species: context.species } } : undefined;
}
/** Asset naming, default avatar modes and the original scene art are pack content, not renderer rules. */
export function emeraldAppearanceResources(db) {
  return {
    ...Object.fromEntries(Object.values(NATIVE_BATTLE_ASSETS.assets).map(asset => [asset.resource, asset.path])),
    "actor-BerryTreeLateStages": "generated/assets/ui/actor-BerryTreeLateStages.png",
    ...Object.fromEntries(berryPictures.filter(key => key !== "empty").map(key => ["berry-" + key, `generated/assets/ui/berry-${key}.png`])),
    ...Object.fromEntries(Object.values(TRAINER_PICTURES).map(p => [p.resource, `generated/assets/ui/${p.resource}.png`])),
    ...Object.fromEntries(Object.values(REFLECTION_PICTURES).map(id => [id, `generated/assets/ui/${id}.png`])),
    ...Object.fromEntries(['grass','long_grass','pond','water','cave','sand','mountain','indoor','underwater','plain'].map(id => [
      `battle-background-${id}`, `generated/assets/ui/battle-background-${id}.png`,
    ])),
    ...Object.fromEntries(
      Object.keys(db.species).map((id) => [
        id + "-front",
        `generated/assets/${id}-front.png`,
      ]),
    ),
    ...Object.fromEntries(Object.keys(db.species).filter(id => Object.hasOwn(DETAIL_SPRITE_FRAMES, id)).map(id => [
      id + "-detail", `generated/assets/${id}-detail.png`,
    ])),
    ...Object.fromEntries(["poke","great","safari","ultra","master","net","dive","nest","repeat","timer","luxury","premier"].map(ball => ["battle-ball-" + ball, "generated/assets/ui/ball-" + ball + ".png"])),
    "battle-transition-pokeball": "generated/assets/battle-transition-pokeball.png",
    "battle-transition-aqua": "generated/assets/battle-transition-aqua.png",
    "battle-transition-magma": "generated/assets/battle-transition-magma.png",
    // Running Shoes are a story flag in the original (no bag icon), so the item's icon is authored here.
    "running_shoes-icon": "generated/assets/ui/items/running_shoes.png",
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
    "emerald-invisible": { name:"原作隐形交互对象", defaultVariant:"default", variants:{default:{shadow:false,layers:[{kind:"image",resource:"berry-planted",opacity:0,size:{width:16,height:16}}]}} },
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
    "emerald-berry": {
      name: "原作树果树", schema: objectSchema({ picture: { type: "string", enum: berryPictures } }, ["picture"]),
      initialData: { picture: "planted" }, defaultVariant: "planted", select: p => p.picture,
      variants: Object.fromEntries(berryPictures.map(key => {
        const height = ["empty", "planted", "sprouted"].includes(key) ? 16 : 32;
        return [key, { shadow: false, layers: [{ kind: "image", resource: "berry-" + (key === "empty" ? "planted" : key), opacity: key === "empty" ? 0 : 1,
          rect: { x:0,y:0,width:16,height }, size:{width:16,height}, x:0,y:16-height }] }];
      })),
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
