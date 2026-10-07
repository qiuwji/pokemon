import { readOnly } from "../../engine/extensions/values.js";
const flag = key => ({ flag: key });
const not = key => ({ not: flag(key) });
const all = (...conditions) => ({ all: conditions });
const any = (...conditions) => ({ any: conditions });
const talk = (x, y, actor, dialogueId, extra = {}) => ({ x, y, actor, kind: "talk", dialogueId, ...extra });
const schoolTeacherChecks = {"right":[{"type":"move","path":["right","right","down","down","left","left"]},{"type":"face","dir":"down"},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":266.6666666666667},{"type":"move","path":["down"]},{"type":"face","dir":"left"},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":266.6666666666667},{"type":"move","path":["right"]},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":133.33333333333334},{"type":"move","path":["up","right","up","up","left","left"]}],"left":[{"type":"move","path":["left","down","down","right"]},{"type":"face","dir":"down"},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":266.6666666666667},{"type":"move","path":["down"]},{"type":"face","dir":"left"},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":266.6666666666667},{"type":"move","path":["right"]},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":266.6666666666667},{"type":"wait","ms":133.33333333333334},{"type":"move","path":["up","left","left","up","up","right"]}]};
const rivalGender = { female: { actor: "BrendanNormal" } };

/** Pack-owned cast data. Conditions reuse the story language; no map-specific runtime branches. */
export const NATIVE_CAST = readOnly({
  RustboroCity_PokemonCenter_1F: [
    { sourceLocalId:"LOCALID_RUSTBORO_NURSE", actor:"Nurse", kind:"heal", name:"乔伊", text:"" },
  ],
  SlateportCity_PokemonCenter_1F: [
    { sourceLocalId:"LOCALID_SLATEPORT_NURSE", actor:"Nurse", kind:"heal", name:"乔伊", text:"" },
  ],
  DewfordTown_PokemonCenter_1F: [
    { sourceLocalId:"LOCALID_DEWFORD_NURSE", actor:"Nurse", kind:"heal", name:"乔伊", text:"" },
  ],
  RustboroCity_Mart: [
    { sourceLocalId:"LOCALID_RUSTBORO_MART_CLERK", actor:"MartEmployee", kind:"shop", name:"店员", text:"" },
  ],
  SlateportCity_Mart: [
    { sourceLocalId:"LOCALID_SLATEPORT_MART_CLERK", actor:"MartEmployee", kind:"shop", name:"店员", text:"" },
  ],
  RustboroCity_PokemonSchool: [
    { id:"rustboro.teacher", sourceLocalId:"6", actor:"Gentleman", kind:"nativeGift", name:"老师", text:"",
      dialogue:"emerald:native-interactions.gift.quick-claw", itemId:"quick_claw", receivedFlag:"receivedQuickClaw",
      repeatDialogue:"emerald:native-interactions.gift.quick-claw-after", afterGiftFacing:"down", giftPreludeByFacing:schoolTeacherChecks },
  ],
  RustboroCity_CuttersHouse: [
    { id:"rustboro.cutter", sourceLocalId:"1", actor:"PokefanM", kind:"nativeGift", name:"居合斩师傅", text:"",
      dialogue:"emerald:native-interactions.gift.cut", itemId:"hm_cut", receivedFlag:"receivedHmCut",
      repeatDialogue:"emerald:native-interactions.gift.cut-after", afterDialogue:"emerald:native-interactions.gift.cut-after" },
  ],
  RustboroCity_Flat2_2F: [
    { id:"rustboro.premier-ball", sourceLocalId:"2", actor:"NinjaBoy", kind:"nativeGift", name:"少年", text:"",
      dialogue:"emerald:native-interactions.gift.premier", itemId:"premier_ball", receivedFlag:"rustboroPremierBall",
      repeatDialogue:"emerald:native-interactions.gift.premier-after" },
  ],
  Route104_PrettyPetalFlowerShop: [
    { id:"flower-shop.owner", sourceLocalId:"LOCALID_FLOWER_SHOP_OWNER", actor:"Woman2", kind:"flowerShopOwner", name:"花店店主", text:"", placement:{x:4,y:6} },
    { id:"flower-shop.pail", sourceLocalId:"2", actor:"Girl3", kind:"flowerShopPail", name:"花店姐姐", text:"" },
    { id:"flower-shop.berry", sourceLocalId:"3", actor:"Girl1", kind:"flowerShopBerry", name:"花店妹妹", text:"" },
  ],
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
    { id: "oldale.rival", sourceLocalId: "LOCALID_OLDALE_RIVAL", x: 11, y: 19,
      actor: "MayNormal", kind: "oldaleRival", name: "小遥", text: "在这里！我们快回家吧！",
      gender: { female: { actor: "BrendanNormal", name: "小悠", text: "我正要回爸爸的研究所，你也赶快回来吧。" } },
      when: all(any(flag("rivalWon"), { reward: "rival.prize" }), not("oldaleRivalDone"), not("pokedex")),
    },
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
  Route104: [
    { id:"route104.boat", sourceLocalId:"LOCALID_ROUTE104_BOAT", actor:"MrBrineysBoat", kind:"prop", x:12,y:54, name:"哈奇老人的小船", text:"", when:not("brineyBoatAway") },
    { id:"route104.briney", sourceLocalId:"LOCALID_ROUTE104_BRINEY", actor:"ExpertM", kind:"prop", x:12,y:51, name:"哈奇老人", text:"", when:flag("brineyBoarding") },
    talk(8,19,"Woman5","route104.people.white-herb", { id:"route104.florist", sourceLocalId:"22", kind:"route104Gift", when:all(flag("prettyPetalOwnerMet"),flag("badgeDynamo")), itemId:"white_herb", itemName:"白色香草", receivedFlag:"route104WhiteHerbGift", repeatDialogue:"emerald:dialogues.route104.people.white-herb-repeat" }),
    talk(17,50,"MayNormal","route104.people.rival", { id:"route104.rival", sourceLocalId:"LOCALID_ROUTE104_RIVAL", when:flag("route104RivalVisible"), gender:rivalGender }),
    talk(15, 60, "BugCatcher", "route104.people.sea", { id: "route104.bug-catcher", sourceLocalId: "1" }),
    talk(25, 49, "Girl2", "route104.people.briney", { id: "route104.girl1", sourceLocalId: "2" }),
    talk(31, 24, "Lass", "route104.trainers.haley.intro", {
      id: "route104.haley", kind: "route104Trainer", trainerId: "haley", sightRange: 7, sourceLocalId: "3",
    }),
    talk(27, 63, "Boy1", "route104.people.weaken", { id: "route104.boy1", sourceLocalId: "4" }),
    talk(30, 50, "Woman2", "route104.people.wild-only", { id: "route104.woman", sourceLocalId: "5" }),
    talk(28, 74, "Girl3", "route104.people.not-trainer", { id: "route104.girl2", sourceLocalId: "6" }),
    {
      id: "route104.item.pp-up", sourceLocalId: "21", actor: "ItemBall", kind: "fieldItem",
      x: 39, y: 15, itemId: "pp_up", itemName: "PP提升剂", receivedFlag: "route104ItemPPUp",
      when: not("route104ItemPPUp"), name: "PP提升剂", text: "",
    },
    talk(29, 8, "Fisherman", "route104.trainers.ivan.intro", {
      id: "route104.ivan", kind: "route104Trainer", trainerId: "ivan", sourceLocalId: "9",
    }),
    talk(37, 8, "ExpertF", "route104.people.chesto", {
      id: "route104.expert", kind: "route104Gift", itemId: "chesto_berry",
      itemName: "醒睡果", receivedFlag: "route104ChestoGift", sourceLocalId: "16",
      repeatDialogue: "emerald:dialogues.route104.people.chesto-repeat",
      afterDialogue: "emerald:dialogues.route104.people.chesto-repeat",
    }),
    {
      id: "route104.item.pokeball", sourceLocalId: "27", actor: "ItemBall", kind: "fieldItem",
      x: 29, y: 53, itemId: "pokeball", itemName: "精灵球", receivedFlag: "route104ItemPokeBall",
      when: not("route104ItemPokeBall"), name: "精灵球", text: "",
    },
    talk(27, 15, "Twin", "route104.trainers.gina.intro", {
      id: "route104.gina", kind: "route104Trainer", trainerId: "ginaAndMia", sightRange: 1, sourceLocalId: "23",
    }),
    talk(28, 15, "Twin", "route104.trainers.mia.intro", {
      id: "route104.mia", kind: "route104Trainer", trainerId: "ginaAndMia", sightRange: 1, sourceLocalId: "24",
    }),
    talk(21, 25, "RichBoy", "route104.trainers.winston.intro", {
      id: "route104.winston", kind: "route104Trainer", trainerId: "winston", sightRange: 3, sourceLocalId: "25",
    }),
    talk(11, 44, "Woman2", "route104.trainers.cindy.intro", {
      id: "route104.cindy", kind: "route104Trainer", trainerId: "cindy", sightRange: 3, sourceLocalId: "26",
    }),
    {
      id: "route104.item.x-accuracy", sourceLocalId: "29", actor: "ItemBall", kind: "fieldItem",
      x: 37, y: 22, itemId: "x_accuracy", itemName: "命中强化", receivedFlag: "route104ItemXAccuracy",
      when: not("route104ItemXAccuracy"), name: "命中强化", text: "",
    },
    { id: "route104.cut-tree", sourceLocalId: "30", actor: "CuttableTree", kind: "cutTree", x: 35, y: 22, name: "可砍伐的树", text: "" },
    {
      id: "route104.item.potion", sourceLocalId: "31", actor: "ItemBall", kind: "fieldItem",
      x: 5, y: 8, itemId: "potion", itemName: "伤药", receivedFlag: "route104ItemPotion",
      when: not("route104ItemPotion"), name: "伤药", text: "",
    },
    talk(5, 26, "Boy2", "route104.people.bullet-seed", {
      id: "route104.boy2", kind: "route104Gift", itemId: "tm_bullet_seed", itemName: "招式学习器09（种子机关枪）",
      receivedFlag: "route104BulletSeedGift", sourceLocalId: "32",
      repeatDialogue: "emerald:dialogues.route104.people.bullet-seed-repeat",
      afterDialogue: "emerald:dialogues.route104.people.bullet-seed-repeat",
    }),
    talk(15, 59, "Fisherman", "route104.trainers.darian.intro", {
      id: "route104.darian", kind: "route104Trainer", trainerId: "darian", sourceLocalId: "33",
    }),
  ],
  Route102: [
    talk(37, 4, "Boy1", "regions.petalburg.route102.boy", { id: "route102.boy", kind: "route102Boy" }),
    talk(18, 11, "LittleBoy", "regions.petalburg.route102.littleboy", { id: "route102.littleboy", kind: "route102LittleBoy" }),
    // Sight trainers: trainerId ties to TRAINERS; sightRange comes from the source object.
    talk(33, 14, "Youngster", "regions.petalburg.calvin", { id: "route102.calvin", kind: "petalburgTrainer", trainerId: "calvin", sightRange: 3 }),
    talk(25, 15, "BugCatcher", "regions.petalburg.rick", { id: "route102.rick", kind: "petalburgTrainer", trainerId: "rick", sightRange: 2 }),
    talk(8, 7, "Lass", "regions.petalburg.tiana", { id: "route102.tiana", kind: "petalburgTrainer", trainerId: "tiana", sightRange: 3 }),
    talk(19, 4, "Youngster", "regions.petalburg.allen", { id: "route102.allen", kind: "petalburgTrainer", trainerId: "allen", sightRange: 3 }),
    // The tutorial walks one scene actor across the connection; this rest pose owns the battle aftermath.
    talk(6, 5, "Wally", "regions.petalburg.watch", {
      id: "wally.route102", kind: "petalburgWallyRoute102",
      movement: { mode: "still", dir: "right", rangeX: 0, rangeY: 0 },
      when: all(flag("wallyTutorial"), not("wallyInTown"), not("wallyCaught")),
    }),
  ],
  PetalburgCity: [
    // The reference hides the outdoor mom when the gym hand-off starts (FLAG_HIDE_PETALBURG_CITY_WALLYS_MOM);
    // after that only the mom inside Wally's house remains.
    talk(16, 18, "Woman4", "regions.petalburg.wallysmom", {
      id: "petalburg.wallysmom", kind: "petalburgWallysMom",
      when: { not: { any: [
        flag("wallyMomHidden"), flag("wallyTutorial"), flag("petalburgScottMet"),
        flag("petalburgWoodsSaved"), flag("devonGoodsStolen"), flag("devonGoodsRecovered"),
        flag("devonGoodsReturned"),
      ] } },
    }),
    talk(20, 10, "Gentleman", "regions.petalburg.gentleman", { id: "petalburg.gentleman", kind: "petalburgGentleman" }),
    talk(8, 22, "Boy1", "regions.petalburg.boy", { id: "petalburg.boy", kind: "petalburgBoy" }),
    talk(12, 15, "Boy2", "regions.petalburg.gymboy", { id: "petalburg.gymboy" }),
    // Wally walks out of town with the player after Norman loans him the Zigzagoon. He is a
    // town-only and a route-only actor, gated by wallyInTown, so exactly one ever renders.
    talk(15, 10, "Wally", "regions.petalburg.watch", {
      id: "wally.city", kind: "petalburgWallyCity",
      movement: { mode: "still", dir: "up", rangeX: 0, rangeY: 0 },
      when: all(flag("wallyTutorial"), flag("wallyInTown"), not("wallyCaught")),
    }),
  ],
  PetalburgWoods: [
    { id: "woods.cut-tree.1", sourceLocalId: "1", actor: "CuttableTree", kind: "cutTree", x: 19, y: 10, name: "可砍伐的树", text: "" },
    { id: "woods.cut-tree.2", sourceLocalId: "2", actor: "CuttableTree", kind: "cutTree", x: 19, y: 11, name: "可砍伐的树", text: "" },
    {
      id: "petalburg.woods.researcher",
      sourceLocalId: "LOCALID_PETALBURG_WOODS_DEVON_EMPLOYEE",
      actor: "Man2",
      kind: "prop",
      name: "得文公司的研究员",
      text: "",
      when: not("petalburgWoodsSaved"),
    },
    {
      id: "petalburg.woods.aqua",
      sourceLocalId: "LOCALID_PETALBURG_WOODS_GRUNT",
      actor: "AquaMemberM",
      kind: "prop",
      name: "水舰队手下",
      text: "",
      when: not("petalburgWoodsSaved"),
    },
    {
      id: "woods.item.great-ball", sourceLocalId: "5", actor: "ItemBall", kind: "fieldItem",
      x: 45, y: 7, itemId: "great_ball", itemName: "超级球", receivedFlag: "woodsItemGreatBall",
      when: not("woodsItemGreatBall"), name: "超级球", text: "",
    },
    {
      id: "woods.item.x-attack", sourceLocalId: "6", actor: "ItemBall", kind: "fieldItem",
      x: 35, y: 20, itemId: "x_attack", itemName: "力量强化", receivedFlag: "woodsItemXAttack",
      when: not("woodsItemXAttack"), name: "力量强化", text: "",
    },
    {
      id: "woods.item.ether", sourceLocalId: "7", actor: "ItemBall", kind: "fieldItem",
      x: 4, y: 8, itemId: "ether", itemName: "PP单项小补剂", receivedFlag: "woodsItemEther",
      when: not("woodsItemEther"), name: "PP单项小补剂", text: "",
    },
    talk(15, 19, "Boy2", "woods.people.tall-grass", { id: "woods.boy1", sourceLocalId: "8" }),
    talk(7, 32, "BugCatcher", "woods.trainers.lyle.intro", {
      id: "woods.lyle", kind: "route104Trainer", trainerId: "lyle", sightRange: 3, sourceLocalId: "9",
    }),
    talk(4, 14, "BugCatcher", "woods.trainers.james.intro", {
      id: "woods.james", kind: "route104Trainer", trainerId: "james", sightRange: 3, sourceLocalId: "10",
    }),
    talk(30, 34, "Boy3", "woods.people.hidden-items", { id: "woods.boy2", sourceLocalId: "11" }),
    {
      id: "woods.item.paralyze-heal", sourceLocalId: "12", actor: "ItemBall", kind: "fieldItem",
      x: 4, y: 26, itemId: "paralyze_heal", itemName: "解麻药", receivedFlag: "woodsItemParalyzeHeal",
      when: not("woodsItemParalyzeHeal"), name: "解麻药", text: "",
    },
    talk(33, 5, "Girl2", "woods.people.miracle-seed", {
      id: "woods.girl", kind: "woodsMiracleSeed", itemId: "miracle_seed", itemName: "奇迹种子",
      receivedFlag: "woodsMiracleSeedGift", sourceLocalId: "13",
      repeatDialogue: "emerald:dialogues.woods.people.miracle-seed-repeat",
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
