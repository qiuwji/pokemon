import { matchesCondition, validateCondition } from "../../engine/conditions.js";
import { openingObjects } from "./opening-objects.js";
import { NATIVE_CAST } from "./native-cast-data.js";
import SOURCE_CAST from "./native-source-data.json" with { type: "json" };
import { TRAINERS } from "./trainers.js";

const roleNames = {
  AquaMemberF: "水舰队手下", AquaMemberM: "水舰队手下", Archie: "赤焰松",
  Azumarill: "玛力露丽", Beauty: "小姐", BlackBelt: "空手道王",
  Boy1: "男孩", Boy2: "男孩", Boy3: "男孩", Brawly: "藤树",
  BreakableRock: "碎岩", BugCatcher: "捕虫少年", Cameraman: "摄影师",
  Camper: "露营少年", Cook: "厨师", CuttableTree: "可砍伐的树",
  DevonEmployee: "得文公司的职员", ExpertF: "专家", ExpertM: "专家",
  FatMan: "男子", Fisherman: "渔夫", GameboyKid: "游戏少年",
  Gentleman: "绅士", Girl1: "女孩", Girl2: "女孩", Girl3: "女孩",
  Hiker: "登山客", ItemBall: "道具球", Lass: "少女", LittleBoy: "男孩",
  LittleGirl: "女孩", Man1: "男子", Man2: "男子", Man3: "男子",
  Man4: "男子", Man5: "男子", Maniac: "怪兽狂", MartEmployee: "店员",
  MrBrineysBoat: "哈奇老人的小船", MudkipDoll: "水跃鱼玩偶",
  MysteryEventDeliveryman: "神秘礼物配送员", NinjaBoy: "忍者少年",
  Nurse: "乔伊", OldMan: "老人", OldWoman: "老妇人", Pikachu: "皮卡丘",
  PikachuDoll: "皮卡丘玩偶", PokefanF: "宝可梦粉丝", PokefanM: "宝可梦粉丝",
  PsychicM: "超能力者", ReporterF: "女记者", ReporterM: "男记者",
  RichBoy: "富家少爷", Roxanne: "杜娟", SSTidal: "海轮",
  Sailor: "水手", SchoolKidM: "男学生", Scientist1: "研究员",
  Scott: "亚希达", Skitty: "向尾喵", SkittyDoll: "向尾喵玩偶",
  Steven: "大吾", SubmarineShadow: "潜水艇的影子", Teala: "记者",
  TorchicDoll: "火稚鸡玩偶", TreeckoDoll: "木守宫玩偶", Twin: "双胞胎",
  Wingull: "长翅鸥", Woman1: "女性", Woman2: "女性", Woman3: "女性",
  Woman4: "女性", Woman5: "女性", Youngster: "短裤小子", Zigzagoon: "蛇纹熊",
};

const defaultLine = (actor) => actor.startsWith("AquaMember")
  ? "我们水舰队正在执行任务，别来妨碍我们！"
  : actor === "Fisherman" ? "钓鱼要有耐心，静下心来等一等吧。"
    : actor === "Scientist1" || actor === "DevonEmployee" ? "得文公司正在研究让生活更方便的产品。"
      : actor === "Sailor" ? "大海另一边一定还有许多没见过的地方。"
        : "在丰缘旅行时，多和宝可梦一起冒险吧。";

function sourceObjects(map, definitions, state, db) {
  const sources = db.maps[map]?.npcs || [];
  const bound = new Set(definitions.flatMap((object) => {
    if (object.sourceLocalId !== undefined) return [String(object.sourceLocalId)];
    const matched = sources.flatMap((source, index) => source.x === object.x && source.y === object.y
      ? [String(source.local_id ?? index + 1)] : []);
    return matched.length === 1 ? matched : [];
  }));
  return sources.flatMap((source, index) => {
    const localId = String(source.local_id ?? index + 1);
    if (bound.has(localId)) return [];
    const symbol = source.graphics_id?.replace("OBJ_EVENT_GFX_", "");
    const actor = SOURCE_CAST.actors[symbol];
    // These source actors are conditionally created by the event program or require
    // a dedicated seasonal berry/variable-graphics implementation.
    if (!actor || symbol === "BERRY_TREE" || symbol === "VAR_0") return [];
    if (String(source.flag || "").startsWith("FLAG_HIDE_")) return [];
    const script = source.script;
    const item = SOURCE_CAST.items[script];
    const trainerId = SOURCE_CAST.trainers?.[script];
    if (source.trainer_type === "TRAINER_TYPE_NORMAL" && !trainerId) return [];
    const kind = trainerId ? "sourceTrainer" : item ? "fieldItem" : actor === "CuttableTree" ? "cutTree" : "talk";
    const receivedFlag = `sourceItem.${map}.${localId}`;
    if (item && state.flags[receivedFlag]) return [];
    const trainer = trainerId && TRAINERS[trainerId];
    return [{
      sourceLocalId: localId,
      actor,
      kind,
      ...(trainerId ? { trainerId } : {}),
      name: item?.itemName || trainer?.name || roleNames[actor] || "路人",
      text: item ? "" : trainerId ? "来吧！让我见识一下你的实力！" : defaultLine(actor),
      ...(item ? { itemId: item.itemId, itemName: item.itemName, receivedFlag } : {}),
    }];
  });
}

/** Project pack data into cast roles; native-object-bindings owns source identity and placement. */
export function projectNativeCast(definitions, state, dialogues) {
  // Native visibility flags historically test presence (starter stores a species ID).
  const visibility = { ...state, flags: Object.fromEntries(Object.entries(state.flags).map(([id, value]) => [id, !!value])) };
  return definitions.filter(d => matchesCondition(d.when, visibility)).map(d => {
    const { when: _when, variants = [], gender = {}, dialogueId, ...base } = d;
    const object = { ...structuredClone(base), ...structuredClone(gender[state.playerGender] || {}) };
    for (const variant of variants)
      if (matchesCondition(variant.when, visibility)) Object.assign(object, structuredClone(variant.changes));
    if (dialogueId === undefined) return object;
    const dialogue = dialogues[dialogueId];
    if (!dialogue) throw new Error(`Unknown native NPC dialogue: ${dialogueId}`);
    return { ...object, name: dialogue.name, text: dialogue.lines[0], dialogue: `emerald:dialogues.${dialogueId}`, dir: object.dir || object.movement?.dir || "down" };
  });
}

export function nativeCast(state, db) {
  if (openingObjects(state)) return openingObjects(state);
  const map = state.position.map;
  const authored = projectNativeCast(
    NATIVE_CAST[map] || [], state, db.stories.dialogues.dialogues,
  );
  // Hidden authored objects still own their source binding. Otherwise a collected
  // item or a departed story actor is recreated by the source fallback.
  return [...authored, ...sourceObjects(map, NATIVE_CAST[map] || [], state, db)];
}

/** Validate all definitions at assembly, including currently invisible roles. */
export function validateNativeCast(db) {
  for (const [map, definitions] of Object.entries(NATIVE_CAST)) {
    if (!db.maps[map]) throw new Error(`Unknown native cast map: ${map}`);
    for (const d of definitions) {
      validateCondition(d.when);
      for (const variant of d.variants || []) validateCondition(variant.when);
      for (const placement of [d.placement, ...(d.variants || []).map(v => v.changes.placement)].filter(Boolean))
        if (!Number.isInteger(placement.x) || !Number.isInteger(placement.y) ||
          placement.x < 0 || placement.y < 0 || placement.x >= db.maps[map].width || placement.y >= db.maps[map].height)
          throw new Error(`Invalid native entry placement: ${map}/${d.id}`);
      for (const actor of [d.actor, ...Object.values(d.gender || {}).map(v => v.actor), ...(d.variants || []).map(v => v.changes.actor)].filter(Boolean))
        if (!db.actors[actor]) throw new Error(`Unknown native cast actor: ${map}/${actor}`);
      if (d.dialogueId !== undefined && !db.stories.dialogues.dialogues[d.dialogueId])
        throw new Error(`Unknown native NPC dialogue: ${d.dialogueId}`);
    }
  }
}
