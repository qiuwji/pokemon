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
    { id: "littleroot.truck", actor: "Truck", kind: "talk", x: 3, y: 10, sourceLocalId: "5", name: "搬运卡车", text: "", when: not("introDone"), gender: { female: { x: 12, sourceLocalId: "6" } } },
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
  LittlerootTown_ProfessorBirchsLab: [
    talk(6, 4, "ProfBirch", "npc.professor.14", { id: "birch", kind: "professor", when: flag("rescued") }),
    talk(9, 8, "Scientist1", "npc.practice.15", { id: "lab.aide" }),
    talk(7, 4, "MayNormal", "npc.rival.13", { id: "lab.rival", gender: rivalGender, when: any(flag("pokedex"), flag("rivalWon"), { reward: "rival.prize" }) }),
  ],
  OldaleTown_PokemonCenter_1F: [talk(7, 2, "Nurse", "npc.heal.17", { kind: "heal" }), talk(4, 4, "Gentleman", "npc.talk.18"), talk(10, 6, "Boy1", "npc.talk.19"), talk(3, 7, "Girl3", "npc.center.girl")],
  OldaleTown_Mart: [talk(1, 3, "MartEmployee", "npc.shop.20", { kind: "shop" }), talk(5, 5, "Woman5", "npc.talk.21"), talk(9, 4, "Boy1", "npc.mart.boy")],
});
