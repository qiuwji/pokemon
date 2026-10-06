import { readOnly } from "../../engine/extensions/values.js";
const flag = key => ({ flag: key });
const not = key => ({ not: flag(key) });
const all = (...conditions) => ({ all: conditions });
const any = (...conditions) => ({ any: conditions });
const talk = (x, y, actor, dialogueId, extra = {}) => ({ x, y, actor, kind: "talk", dialogueId, ...extra });
const rivalGender = { female: { actor: "BrendanNormal" } };

/** Pack-owned cast data. Conditions reuse the story language; no map-specific runtime branches. */
export const NATIVE_CAST = readOnly({
  LittlerootTown: [
    talk(16, 10, "Twin", "npc.talk.1", { id: "littleroot.twin", variants: [
      { when: all(not("rescued"), not("neighborMet")), changes: { movementType: "MOVEMENT_TYPE_FACE_DOWN" } },
      { when: all(not("rescued"), flag("neighborMet")), changes: { movementType: "MOVEMENT_TYPE_FACE_UP" } },
    ] }),
    { id: "littleroot.truck", actor: "Truck", kind: "prop", x: 3, y: 10, sourceLocalId: "5", name: "搬运卡车", text: "", when: not("introDone"), gender: { female: { x: 12, sourceLocalId: "6" } } },
    talk(12, 13, "FatMan", "npc.talk.2", { when: flag("introDone") }),
    talk(5, 8, "Mom", "npc.mom.welcome", { id: "littleroot.mom", sourceLocalId: "LOCALID_LITTLEROOT_MOM", when: any(all(not("introDone"), flag("momOutside")), all(flag("pokedex"), not("runningShoes"))), gender: { female: { x: 14 } } }),
    talk(14, 17, "Boy2", "npc.talk.3"),
  ],
  Route101: [
    talk(16, 8, "Youngster", "npc.practice.4.before", { id: "route101.youngster" }),
    talk(2, 13, "Boy2", "npc.route101.boy", { id: "route101.boy", when: flag("rescued") }),
    talk(9, 13, "ProfBirch", "npc.rescue.7", { id: "birch", kind: "rescue", when: not("rescued") }),
    talk(7, 14, "BirchsBag", "npc.starter.8", { id: "birchBag", kind: "starter", when: not("rescued") }),
    talk(10, 13, "EnemyZigzagoon", "npc.wildobject.9", { id: "pursuer", kind: "wildObject", species: "zigzagoon", when: not("rescued") }),
  ],
  OldaleTown: [
    talk(16, 11, "Girl3", "npc.talk.10"),
    talk(13, 7, "MartEmployee", "npc.giftpotion.11", { id: "oldale.employee", kind: "giftPotion", variants: [{ when: not("potionGift"), changes: { placement: { x: 13, y: 14 }, movementType: "MOVEMENT_TYPE_FACE_DOWN" } }] }),
    talk(8, 9, "Maniac", "npc.talk.12", { id: "oldale.footprints", variants: [{ when: not("pokedex"), changes: { placement: { x: 1, y: 11 }, movementType: "MOVEMENT_TYPE_FACE_LEFT" } }] }),
  ],
  OldaleTown_House1: [talk(6, 4, "Woman2", "npc.oldale.house1.woman")],
  OldaleTown_House2: [talk(4, 4, "PokefanF", "npc.oldale.house2.woman"), talk(7, 4, "SchoolKidM", "npc.oldale.house2.man")],
  Route103: [
    talk(10, 3, "MayNormal", "npc.rival.13", { id: "rival.route103", kind: "rival", when: not("rivalWon"), gender: rivalGender }),
    talk(20, 10, "Boy1", "npc.route103.boy"),
  ],
  Route102: [
    talk(37, 4, "Boy1", "regions.petalburg.route102.boy", { id: "route102.boy", kind: "route102Boy" }),
    talk(18, 11, "LittleBoy", "regions.petalburg.route102.littleboy", { id: "route102.littleboy", kind: "route102LittleBoy" }),
    // Sight trainers: trainerId ties to TRAINERS; sightRange comes from the source object.
    talk(33, 14, "Youngster", "regions.petalburg.calvin", { id: "route102.calvin", kind: "petalburgTrainer", trainerId: "calvin", sightRange: 3 }),
    talk(25, 15, "BugCatcher", "regions.petalburg.rick", { id: "route102.rick", kind: "petalburgTrainer", trainerId: "rick", sightRange: 2 }),
    talk(8, 7, "Lass", "regions.petalburg.tiana", { id: "route102.tiana", kind: "petalburgTrainer", trainerId: "tiana", sightRange: 3 }),
    talk(19, 4, "Youngster", "regions.petalburg.allen", { id: "route102.allen", kind: "petalburgTrainer", trainerId: "allen", sightRange: 3 }),
    // Wally walks to the grass for the catching tutorial; he has no source object here, so he
    // is an authored runtime actor with an explicit movement mode.
    talk(1, 6, "Wally", "regions.petalburg.watch", {
      id: "wally.route102", kind: "petalburgWallyRoute102",
      movement: { mode: "still", dir: "right", rangeX: 0, rangeY: 0 },
      when: all(flag("wallyTutorial"), not("wallyInTown"), not("wallyCaught")),
    }),
  ],
  PetalburgCity: [
    // The reference hides the outdoor mom when the gym hand-off starts (FLAG_HIDE_PETALBURG_CITY_WALLYS_MOM);
    // after that only the mom inside Wally's house remains.
    talk(16, 18, "Woman4", "regions.petalburg.wallysmom", { id: "petalburg.wallysmom", kind: "petalburgWallysMom", when: not("wallyTutorial") }),
    talk(20, 10, "Gentleman", "regions.petalburg.gentleman", { id: "petalburg.gentleman", kind: "petalburgGentleman" }),
    talk(8, 22, "Boy1", "regions.petalburg.boy", { id: "petalburg.boy", kind: "petalburgBoy" }),
    talk(12, 15, "Boy2", "regions.petalburg.gymboy", { id: "petalburg.gymboy" }),
    // Wally walks out of town with the player after Norman loans him the Zigzagoon. He is a
    // town-only and a route-only actor, gated by wallyInTown, so exactly one ever renders.
    talk(16, 10, "Wally", "regions.petalburg.watch", {
      id: "wally.city", kind: "petalburgWallyCity",
      movement: { mode: "still", dir: "right", rangeX: 0, rangeY: 0 },
      when: all(flag("wallyTutorial"), flag("wallyInTown"), not("wallyCaught")),
    }),
  ],
  PetalburgCity_PokemonCenter_1F: [
    talk(7, 2, "Nurse", "npc.heal.17", { kind: "heal" }),
    talk(11, 2, "Man4", "regions.petalburg.center.man", { id: "petalburg.center.man" }),
    talk(2, 3, "FatMan", "regions.petalburg.center.fatman", { id: "petalburg.center.fatman" }),
    talk(9, 6, "Youngster", "regions.petalburg.center.youngster", { id: "petalburg.center.youngster" }),
    talk(5, 4, "Woman5", "regions.petalburg.center.woman", { id: "petalburg.center.woman" }),
  ],
  PetalburgCity_Mart: [
    talk(1, 3, "MartEmployee", "npc.shop.20", { kind: "shop" }),
    talk(9, 4, "Man1", "regions.petalburg.mart.man", { id: "petalburg.mart.man" }),
    talk(6, 3, "Boy1", "regions.petalburg.mart.boy", { id: "petalburg.mart.boy" }),
    talk(5, 5, "Woman2", "regions.petalburg.mart.woman", { id: "petalburg.mart.woman" }),
  ],
  PetalburgCity_House1: [
    talk(7, 4, "Girl1", "regions.petalburg.house1.woman", { id: "petalburg.house1.woman" }),
    talk(4, 4, "ExpertM", "regions.petalburg.house1.man", { id: "petalburg.house1.man" }),
  ],
  PetalburgCity_House2: [
    talk(2, 5, "PokefanF", "regions.petalburg.house2.woman", { id: "petalburg.house2.woman" }),
    talk(7, 5, "SchoolKidM", "regions.petalburg.house2.schoolkid", { id: "petalburg.house2.schoolkid" }),
  ],
  PetalburgCity_WallysHouse: [
    talk(3, 4, "PokefanM", "regions.petalburg.wallyhouse.dad", { id: "petalburg.wallyhouse.dad" }),
    talk(7, 5, "Woman4", "regions.petalburg.wallyhouse.mom", { id: "petalburg.wallyhouse.mom" }),
  ],
  PetalburgCity_Gym: [
    talk(4, 2, "Norman", "regions.petalburg.norman.first", {
      id: "petalburg.norman", kind: "petalburgNorman",
      sourceLocalId: "LOCALID_PETALBURG_GYM_NORMAN", placement: { x: 4, y: 107 },
    }),
    // The gym Wally seen during Norman's hand-off is spawned by the story (addobject), so he
    // is not in the map before the player talks to Norman. Only the return visit is projected.
    talk(4, 111, "Wally", "regions.petalburg.wally.really", {
      id: "wally.gym", kind: "petalburgWallyGym",
      sourceLocalId: "LOCALID_PETALBURG_GYM_WALLY", placement: { x: 5, y: 108 },
      when: all(flag("wallyCaught"), not("wallyDone")),
    }),
  ],
  LittlerootTown_ProfessorBirchsLab: [
    talk(6, 4, "ProfBirch", "npc.professor.14", { id: "birch", kind: "professor", when: flag("rescued") }),
    talk(9, 8, "Scientist1", "npc.practice.15", { id: "lab.aide" }),
    talk(7, 4, "MayNormal", "npc.rival.13", { id: "lab.rival", gender: rivalGender, when: any(flag("pokedex"), flag("rivalWon"), { reward: "rival.prize" }) }),
  ],
  OldaleTown_PokemonCenter_1F: [talk(7, 2, "Nurse", "npc.heal.17", { kind: "heal" }), talk(4, 4, "Gentleman", "npc.talk.18"), talk(10, 6, "Boy1", "npc.talk.19"), talk(3, 7, "Girl3", "npc.center.girl")],
  OldaleTown_Mart: [talk(1, 3, "MartEmployee", "npc.shop.20", { kind: "shop" }), talk(5, 5, "Woman5", "npc.talk.21"), talk(9, 4, "Boy1", "npc.mart.boy")],
});
