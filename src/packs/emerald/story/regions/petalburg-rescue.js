import { not, all } from "../helpers.js";
import { fieldGift } from "../common/gifts.js";
import { TRAINERS, trainerRewardId } from "../../trainers.js";

const text = (key) => `emerald:petalburg-rescue.${key}`;
const steps = (direction, count) => Array(count).fill(direction);
const waitFrames = (count) => ({ type: "wait", ms: count * 1000 / 60 });
const move = (actor, path, extra = {}) => ({ type: "move", actor, path, ...extra });
// Return an interrupted scene's existing actors by walking; normal entries are already here.
const woodsStart = (actor, x, y) => ({ type: "move", actor, to: { x, y } });
const parallel = (...commands) => ({
  type: "parallel",
  commands: commands.map((commands) => ({ type: "sequence", commands })),
});

function scottScene(row) {
  const exitByRow = {
    10: { path: ["down", "down", ...steps("left", 11)], watch: "down", pause: 40 },
    11: { path: ["down", ...steps("left", 11)], watch: "down", pause: 32 },
    12: { path: ["down", ...steps("left", 11)], watch: "down", pause: 32 },
    13: { path: ["up", ...steps("left", 11)], watch: "up", pause: 32 },
  }[row];
  const y = row;
  return [
    {
      type: "spawn",
      def: {
        id: "petalburg.scott.scene",
        actor: "Scott",
        kind: "petalburgScottScene",
        name: "亚希达",
        text: "",
        x: 13,
        y,
        dir: "left",
        movement: { mode: "still", dir: "left", rangeX: 0, rangeY: 0 },
      },
    },
    move("petalburg.scott.scene", steps("left", 4)),
    { type: "sound", cue: "emerald-audio:se_pin" },
    { type: "emote", actor: "petalburg.scott.scene", kind: "exclamation", ms: 450 },
    waitFrames(48),
    move("petalburg.scott.scene", steps("left", 4)),
    { type: "face", actor: "player", dir: "right" },
    { type: "dialog", dialogue: text("scott.opening") },
    { type: "face", actor: "petalburg.scott.scene", dir: "right" },
    waitFrames(30),
    { type: "dialog", dialogue: text("scott.maybe-not") },
    { type: "face", actor: "petalburg.scott.scene", dir: "left" },
    waitFrames(30),
    { type: "dialog", dialogue: text("scott.searching") },
    parallel(
      [move("petalburg.scott.scene", exitByRow.path), { type: "hide", actor: "petalburg.scott.scene" }],
      [waitFrames(16), { type: "face", actor: "player", dir: exitByRow.watch }, waitFrames(exitByRow.pause), { type: "face", actor: "player", dir: "left" }],
    ),
    { type: "flag", key: "petalburgScottMet", value: true },
  ];
}

function woodsApproach({ side }) {
  const employee = "petalburg.woods.researcher";
  const aqua = "petalburg.woods.aqua";
  const right = side === "right";
  const flee = right ? ["down", "right"] : ["right", "down", "down", "left"];
  const aquaToEmployee = steps("down", right ? 3 : 2);
  return [
    woodsStart(employee, 26, 20),
    woodsStart(aqua, 26, 17),
    { type: "face", actor: employee, dir: "up" }, waitFrames(20),
    { type: "face", actor: employee, dir: "right" }, waitFrames(24),
    { type: "face", actor: employee, dir: "left" }, waitFrames(24),
    { type: "face", actor: employee, dir: "down" }, waitFrames(16),
    { type: "face", actor: employee, dir: "right" }, waitFrames(24),
    { type: "face", actor: employee, dir: "up" }, waitFrames(16),
    { type: "dialog", dialogue: text("woods.searching") },
    waitFrames(16),
    { type: "face", actor: employee, target: "player" },
    move(employee, steps("down", right ? 3 : 2)),
    ...(right ? [
      { type: "face", actor: employee, dir: "right" },
      { type: "face", actor: "player", dir: "left" },
    ] : []),
    { type: "dialog", dialogue: text("woods.shroomish") },
    { type: "music", cue: "emerald-audio:mus_encounter_aqua" },
    move(aqua, ["down", "down"]), waitFrames(32),
    { type: "dialog", dialogue: text("woods.aqua-ambush") },
    move(aqua, aquaToEmployee, { running: true }),
    { type: "face", actor: employee, dir: "up" },
    { type: "dialog", dialogue: text("woods.papers") },
    move(employee, flee, { running: true }),
    { type: "face", actor: employee, dir: "up" },
    { type: "dialog", dialogue: text("woods.help") },
    ...(right ? [{ type: "face", actor: "player", dir: "up" }] : []),
    ...(!right ? [move(aqua, ["down"])] : []),
    { type: "dialog", dialogue: text("woods.challenge") },
    { type: "battle", trainerId: "aquaPetalburgWoods" },
  ];
}

const aquaReward = trainerRewardId("aquaPetalburgWoods");

function finishRescue({ side = "left", resume = false } = {}) {
  const right = side === "right";
  const researcherExit = [side === "right" ? "left" : "right", ...steps("up", 7)];
  return [
    // This continuation is selected only by a confirmed win or its persisted receipt.
    // If a replay's later dialogue fails, subsequent entry must resume rather than fight again.
    { type: "flag", key: "petalburgWoodsReplayRequested", value: false },
    ...(resume ? [
      woodsStart("petalburg.woods.researcher", right ? 27 : 26, 24),
      { type: "face", actor: "petalburg.woods.researcher", dir: "up" },
      woodsStart("petalburg.woods.aqua", 26, 22),
      { type: "face", actor: "petalburg.woods.aqua", dir: "down" },
    ] : []),
    { type: "music" },
    { type: "reward", id: aquaReward, money: 180 },
    move("petalburg.woods.aqua", ["up"], { keepFacing: true }),
    { type: "dialog", dialogue: text("woods.aqua-retreat") },
    move("petalburg.woods.aqua", steps("up", 5), { running: true }),
    waitFrames(32),
    { type: "hide", actor: "petalburg.woods.aqua" },
    { type: "face", actor: "player", dir: "down" },
    { type: "dialog", dialogue: text("woods.thanks") },
    {
      type: "reward",
      id: "petalburg.woods.great-ball",
      items: { great_ball: 1 },
      onResult: {
        ok: [
          { type: "sound", cue: "emerald-audio:mus_obtain_item", channel: "fanfare" },
          { type: "waitSound", channel: "fanfare" },
        ],
        alreadyGranted: [],
        inventoryFull: [{ type: "dialog", dialogue: text("woods.bag-full") }],
      },
    },
    { type: "dialog", dialogue: text("woods.rustboro-clue") },
    { type: "face", actor: "petalburg.woods.researcher", dir: "down" },
    waitFrames(80),
    { type: "face", actor: "petalburg.woods.researcher", dir: "up" },
    { type: "dialog", dialogue: text("woods.crisis") },
    parallel(
      [move("petalburg.woods.researcher", researcherExit, { running: true })],
      [waitFrames(32), { type: "face", actor: "player", dir: "up" }],
    ),
    { type: "hide", actor: "petalburg.woods.researcher" },
    { type: "flag", key: "petalburgWoodsSaved", value: true },
  ];
}

export const REGIONS_PETALBURG_RESCUE_EVENTS = [
  {
    id: "region.field-item.collect",
    trigger: "interact",
    priority: 10,
    match: ({ object }, state) => object?.kind === "fieldItem" && !state.flags[object.receivedFlag],
    build: (_state, { object }) => [{
      type: "reward",
      id: `field-item.${object.id}`,
      items: { [object.itemId]: 1 },
      onResult: {
        ok: [
          { type: "dialog", name: "", lines: [`获得了${object.itemName}！`] },
          { type: "flag", key: object.receivedFlag, value: true },
        ],
        alreadyGranted: [{ type: "flag", key: object.receivedFlag, value: true }],
        inventoryFull: [
          { type: "dialog", name: "", lines: [`背包已经装满了，没法再放入${object.itemName}。`] },
        ],
      },
    }],
  },
  {
    id: "region.item-gift.receive",
    trigger: "interact",
    priority: 10,
    match: ({ object }) => ["route104Gift", "woodsMiracleSeed"].includes(object?.kind),
    build: (state, { object }) => fieldGift(state, object),
  },
  {
    id: "route104.trainer.interact",
    trigger: "interact",
    priority: 10,
    selector: { kind: "route104Trainer" },
    build: (state, { object }) => {
      if (state.story.rewards.includes(trainerRewardId(object.trainerId)))
        return [{ type: "dialog", dialogue: object.afterDialogue || `emerald:dialogues.${object.trainerId === "ginaAndMia" ? "route104.trainers.gina-mia.after" : ["lyle", "james"].includes(object.trainerId) ? `woods.trainers.${object.trainerId}.after` : `route104.trainers.${object.trainerId}.after`}` }];
      const teamSize = state.party.filter((mon) => mon.hp > 0 && !mon.egg).length;
      if (object.trainerId === "ginaAndMia" && teamSize < 2)
        return [{ type: "dialog", name: object.name, lines: ["要进行双打对战，队伍里至少需要两只可以战斗的宝可梦。"] }];
      return [
        { type: "dialog", dialogue: object.dialogue },
        { type: "battle", trainerId: object.trainerId },
      ];
    },
  },
  {
    id: "route104.trainer.result",
    priority: 10,
    trigger: "battleResult",
    match: ({ battle }) => battle.result === "win" && ["haley", "ivan", "billy", "ginaAndMia", "winston", "cindy", "darian", "lyle", "james"].includes(battle.trainerId),
    build: (_state, { battle: result }) => [{
      type: "reward",
      id: trainerRewardId(result.trainerId),
      money: TRAINERS[result.trainerId].prize * (result.prizeMultiplier || 1),
    }, { type: "dialog", dialogue: `emerald:dialogues.${result.trainerId === "ginaAndMia" ? "route104.trainers.gina-mia.after" : ["lyle", "james"].includes(result.trainerId) ? `woods.trainers.${result.trainerId}.after` : `route104.trainers.${result.trainerId}.after`}` }],
  },
  {
    id: "petalburg.scott.departure",
    trigger: "step",
    priority: 20,
    requires: not("petalburgScottMet"),
    match: ({ map, position }) => map === "PetalburgCity" && position.x === 4 && [10, 11, 12, 13].includes(position.y),
    build: (_state, { position }) => scottScene(position.y),
  },
  {
    id: "petalburg.woods.rescue.left",
    trigger: "step",
    requires: all(not("petalburgWoodsSaved"), { any: [{ not: { reward: aquaReward } }, { flag: "petalburgWoodsReplayRequested" }] }),
    match: ({ map, position }) => map === "PetalburgWoods" && position.x === 26 && position.y === 23,
    build: () => woodsApproach({ side: "left" }),
  },
  {
    id: "petalburg.woods.rescue.right",
    trigger: "step",
    requires: all(not("petalburgWoodsSaved"), { any: [{ not: { reward: aquaReward } }, { flag: "petalburgWoodsReplayRequested" }] }),
    match: ({ map, position }) => map === "PetalburgWoods" && position.x === 27 && position.y === 23,
    build: () => woodsApproach({ side: "right" }),
  },
  {
    id: "petalburg.woods.rescue.resume",
    trigger: "step",
    priority: 20,
    requires: all(not("petalburgWoodsSaved"), not("petalburgWoodsReplayRequested"), { reward: aquaReward }),
    match: ({ map, position }) => map === "PetalburgWoods" && [26, 27].includes(position.x) && position.y === 23,
    build: (_state, { position }) => finishRescue({ side: position.x === 27 ? "right" : "left", resume: true }),
  },
  {
    id: "petalburg.woods.rescue.result",
    priority: 20,
    trigger: "battleResult",
    requires: not("petalburgWoodsSaved"),
    match: ({ battle: result }) => result.trainerId === "aquaPetalburgWoods" && result.result === "win",
    build: (state) => finishRescue({ side: state.position.x === 27 ? "right" : "left" }),
  },
];
