import { openingObjects } from "./opening-objects.js";

/** Native story cast; source placement and movement are bound separately. */
export function nativeCast(state, db) {
  const opening = openingObjects(state);
  if (opening) return opening;
  const map = state.position.map,
    flag = state.flags;
  const obj = (x, y, actor, kind, dialogueId) => {
    const definition = db.stories.dialogues.dialogues[dialogueId];
    if (!definition)
      throw new Error(`Unknown native NPC dialogue: ${dialogueId}`);
    return {
      x,
      y,
      actor,
      kind,
      name: definition.name,
      text: definition.lines[0],
      dialogue: `emerald:dialogues.${dialogueId}`,
      dir: "down",
    };
  };
  if (map === "LittlerootTown")
    return [
      { ...obj(16, 10, "Twin", "talk", "npc.talk.1"), id: "littleroot.twin",
        ...(!flag.rescued ? { movementType: flag.neighborMet ? "MOVEMENT_TYPE_FACE_UP" : "MOVEMENT_TYPE_FACE_DOWN" } : {}) },
      ...(!flag.introDone ? [{ id: 'littleroot.truck', actor: 'Truck', kind: 'talk',
        x: state.playerGender === 'female' ? 12 : 3, y: 10,
        sourceLocalId: state.playerGender === 'female' ? '6' : '5', name: '搬运卡车', text: '' }] : []),
      // The original keeps mom inside until the truck scene reveals her, and the fat man
      // stays hidden until that scene finishes (LittlerootTown_EventScript_GoInsideWithMom).
      ...(flag.introDone ? [obj(12, 13, "FatMan", "talk", "npc.talk.2")] : []),
      ...((!flag.introDone && flag.momOutside) || (flag.pokedex && !flag.runningShoes) ? [
            {
              ...obj(state.playerGender === "female" ? 14 : 5, 8, "Mom", "talk", "npc.mom.welcome"),
              id: "littleroot.mom",
              sourceLocalId: "LOCALID_LITTLEROOT_MOM",
            },
          ] : []),
      obj(14, 17, "Boy2", "talk", "npc.talk.3"),
    ];
  if (map === "Route101")
    return [
      { ...obj(16, 8, "Youngster", "talk", "npc.practice.4.before"), id: "route101.youngster" },
      ...(flag.rescued ? [{ ...obj(2, 13, "Boy2", "talk", "npc.route101.boy"), id: "route101.boy" }] : []),
      ...(!flag.rescued
        ? [
            {
              ...obj(9, 13, "ProfBirch", "rescue", "npc.rescue.7"),
              id: "birch",
            },
            {
              ...obj(7, 14, "BirchsBag", "starter", "npc.starter.8"),
              id: "birchBag",
            },
            {
              ...obj(10, 13, "EnemyZigzagoon", "wildObject", "npc.wildobject.9"),
              species: "zigzagoon",
              id: "pursuer",
            },
          ]
        : []),
    ];
  if (map === "OldaleTown")
    return [
      obj(16, 11, "Girl3", "talk", "npc.talk.10"),
      { ...obj(13, 7, "MartEmployee", "giftPotion", "npc.giftpotion.11"), id: "oldale.employee",
        ...(!flag.potionGift ? { movementType: "MOVEMENT_TYPE_FACE_DOWN" } : {}) },
      { ...obj(8, 9, "Maniac", "talk", "npc.talk.12"), id: "oldale.footprints",
        ...(!flag.pokedex ? { movementType: "MOVEMENT_TYPE_FACE_LEFT" } : {}) },
    ];
  if (map === "Route103")
    return [
      ...(!flag.rivalWon ? [{ ...obj(10, 3, state.playerGender === "female" ? "BrendanNormal" : "MayNormal", "rival", "npc.rival.13"), id: "rival.route103" }] : []),
      obj(20, 10, "Boy1", "talk", "npc.route103.boy"),
    ];
  if (map === "LittlerootTown_ProfessorBirchsLab")
    return [
      ...(flag.rescued ? [{
        ...obj(6, 4, "ProfBirch", "professor", "npc.professor.14"),
        id: "birch",
      }] : []),
      { ...obj(9, 8, "Scientist1", "talk", "npc.practice.15"), id: "lab.aide" },
      ...((flag.pokedex || flag.rivalWon || state.story.rewards.includes("rival.prize")) ? [{ ...obj(7, 4, state.playerGender === "female" ? "BrendanNormal" : "MayNormal", "talk", "npc.rival.13"), id: "lab.rival" }] : []),
    ];
  if (map === "OldaleTown_PokemonCenter_1F")
    return [
      obj(7, 2, "Nurse", "heal", "npc.heal.17"),
      obj(4, 4, "Gentleman", "talk", "npc.talk.18"),
      obj(10, 6, "Boy1", "talk", "npc.talk.19"),
      obj(3, 7, "Girl3", "talk", "npc.center.girl"),
    ];
  if (map === "OldaleTown_Mart")
    return [
      obj(1, 3, "MartEmployee", "shop", "npc.shop.20"),
      obj(5, 5, "Woman5", "talk", "npc.talk.21"),
      obj(9, 4, "Boy1", "talk", "npc.mart.boy"),
    ];
  return [];
}
