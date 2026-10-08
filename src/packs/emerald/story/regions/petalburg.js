import { dialog, battle, flag, not, all, talkEvent } from "../helpers.js";
import { TRAINERS, trainerRewardId } from "../../trainers.js";
const steps = (dir, count) => Array(count).fill(dir);
const walk = (actor, path, ignoreActors = []) => ({ type: "move", actor, path, ...(ignoreActors.length ? { ignoreActors } : {}) });
const wait = (frames) => ({ type: "wait", ms: frames * 1000 / 60 });
const parallel = (...commands) => ({ type: "parallel", commands: commands.map(commands => ({ type: "sequence", commands })) });
const gymExit = (dir) => {
  const player = dir === "up" ? steps("down", 3) : dir === "down" ? ["right", ...steps("down", 5)] : dir === "left" ? steps("down", 4) : [...steps("down", 3), "right", "down"];
  const wally = dir === "up" ? steps("down", 4) : dir === "left" ? ["down", "down", "right", "down"] : steps("down", 3);
  return [parallel(
    [walk("wally.gym.arrive", wally, ["player"]), { type: "face", actor: "wally.gym.arrive", dir: "up" }, wait(16), { type: "face", actor: "wally.gym.arrive", dir: "down" }],
    [wait(dir === "up" ? 48 : 32), walk("player", player, ["wally.gym.arrive"]), wait(8)],
  ), { type: "hide", actor: "wally.gym.arrive" }];
};
const text = (name) => `emerald:dialogues.regions.petalburg.${name}`;
/** Route 102 sight trainers keep the reference post-battle line, keyed by opponent id. */
const ROUTE102_TRAINERS = ["calvin", "rick", "tiana", "allen"];

/**
 * Petalburg City arrival and Norman's gym hand-off into Wally's catching tutorial.
 * The catch itself happens on Route 102 grass, so the gym scene transitions the player and
 * Wally there; the aftermath of the scripted battle is a durable `battleResult` event.
 */
export const REGIONS_PETALBURG_EVENTS = [
  talkEvent(
    "petalburg.norman.first",
    "petalburgNorman",
    (s) => [
      { type: "face", actor: "petalburg.norman", target: "player" },
      dialog(text("norman.first")),
      // Wally enters from the gym door only now, then walks to Norman (reference addobject).
      {
        type: "spawn",
        def: {
          id: "wally.gym.arrive",
          actor: "Wally",
          kind: "petalburgWallyGym",
          name: "小光",
          text: "",
          x: 4,
          y: 111,
          dir: "up",
          movement: { mode: "still", dir: "up", rangeX: 0, rangeY: 0 },
        },
      },
      { type: "sound", cue: "emerald-audio:se_door" },
      wait(16), walk("wally.gym.arrive", ["up"], ["player"]), wait(24),
      walk("wally.gym.arrive", s.position.dir === "up" ? ["up", "right", "up", "up"] : ["up", "up"], ["player"]),
      { type: "face", actor: "player", dir: s.position.dir === "up" ? "right" : "down" },
      { type: "face", actor: "petalburg.norman", dir: s.position.dir === "up" ? "right" : "down" },
      { type: "face", actor: "wally.gym.arrive", target: "petalburg.norman" },
      dialog(text("wally.request")),
      dialog(text("norman.wally")),
      { type: "face", actor: "petalburg.norman", target: "wally.gym.arrive" },
      dialog(text("wally.story")),
      dialog(text("norman.isee")),
      { type: "face", actor: "petalburg.norman", target: "player" },
      dialog(text("norman.go")),
      dialog(text("norman.loan")),
      { type: "face", actor: "wally.gym.arrive", target: "player" },
      dialog(text("wally.wow")),
      dialog(text("norman.ball")),
      dialog(text("wally.really")),
      ...gymExit(s.position.dir),
      { type: "flag", key: "wallyInTown", value: true },
      { type: "flag", key: "wallyTutorial", value: true },
      // The source sets FLAG_HIDE_PETALBURG_CITY_WALLYS_MOM as Wally leaves the gym.
      // Keep the hide fact separate so chapter presets can reset the tutorial stage
      // without accidentally respawning her outside in later story slices.
      { type: "flag", key: "wallyMomHidden", value: true },
      {
        type: "scene",
        kind: "door",
        position: { map: "PetalburgCity", x: 15, y: 9, dir: "down" },
      },
    ],
    all(flag("pokedex"), not("wallyTutorial")),
  ),
  talkEvent(
    "petalburg.norman.after",
    "petalburgNorman",
    () => [dialog(text("norman.after"))],
    flag("wallyTutorial"),
  ),
  {
    id: "petalburg.tutorial",
    trigger: "mapEnter",
    selector: { map: "PetalburgCity" },
    requires: all(flag("wallyTutorial"), flag("wallyInTown"), not("wallyCaught")),
    build: () => [
      // One pinned actor keeps the original lead, stride and world position across the connection.
      parallel(
        [wait(8), walk("player", [...steps("down", 8), ...steps("right", 20), "up", "up"], ["wally.city"]), { type: "face", actor: "player", dir: "right" }],
        [wait(8), walk("wally.city", [...steps("down", 7), ...steps("right", 20), "up", "up", "right"], ["player"]), wait(16), { type: "face", actor: "wally.city", dir: "up" }, wait(32), { type: "face", actor: "wally.city", dir: "right" }],
      ),
      { type: "hide", actor: "wally.city" },
      { type: "flag", key: "wallyInTown", value: false },
      dialog(text("watch")),
      // Reference battle_controller_wally.c drives Wally's Zigzagoon itself: attack, attack,
      // then throw the ball. The player only watches.
      battle("ralts", 5, {
        script: "wally",
        borrowedParty: [{ species: "zigzagoon", level: 7 }],
        capture: "cinematic",
        autoActions: [
          { kind: "move", index: 0 },
          { kind: "move", index: 0 },
          { kind: "item", item: "pokeball" },
        ],
      }),
    ],
  },
  {
    id: "petalburg.wally.result",
    priority: 10,
    trigger: "battleResult",
    match: ({ battle: b }) => b.script === "wally",
    build: () => [
      dialog(text("caught")),
      { type: "face", actor: "wally.route102", dir: "left" },
      dialog(text("letsgo")),
      { type: "flag", key: "wallyCaught", value: true },
      {
        type: "scene",
        kind: "door",
        position: { map: "PetalburgCity_Gym", x: 4, y: 108, dir: "up" },
      },
    ],
  },
  {
    id: "petalburg.gym.return",
    trigger: "mapEnter",
    selector: { map: "PetalburgCity_Gym" },
    requires: all(flag("wallyCaught"), not("wallyDone")),
    build: () => [
      dialog(text("dad.return")),
      dialog(text("wally.bye")),
      { type: "face", actor: "player", dir: "down" },
      walk("wally.gym", steps("down", 3)), wait(16),
      { type: "sound", cue: "emerald-audio:se_exit" },
      { type: "hide", actor: "wally.gym" },
      { type: "flag", key: "wallyDone", value: true }, wait(30),
      { type: "face", actor: "player", dir: "up" },
      dialog(text("dad.badges")),
    ],
  },
  talkEvent(
    "petalburg.wallysmom",
    "petalburgWallysMom",
    () => [dialog(text("wallysmom"))],
  ),
  talkEvent(
    "petalburg.gentleman",
    "petalburgGentleman",
    () => [dialog(text("gentleman"))],
  ),
  talkEvent("petalburg.boy", "petalburgBoy", () => [dialog(text("boy"))]),
  // Route 102 sight trainers: challenge once, then show a post-battle line. Sight itself is
  // resolved by the field trigger, so this only covers approaching them from outside view.
  {
    id: "petalburg.trainer.result",
    priority: 10,
    trigger: "battleResult",
    match: ({ battle: b }) =>
      b.result === "win" && ROUTE102_TRAINERS.includes(b.trainerId),
    build: (s, { battle: b }) => [
      dialog(text(`${b.trainerId}.after`)),
      {
        type: "reward",
        id: trainerRewardId(b.trainerId),
        money: TRAINERS[b.trainerId].prize * (b.prizeMultiplier || 1),
      },
    ],
  },
  talkEvent(
    "petalburg.trainer",
    "petalburgTrainer",
    (s, { object }) =>
      s.story.rewards.includes(trainerRewardId(object.trainerId))
        ? [dialog(text(`${object.trainerId}.after`))]
        : [
            dialog(text(object.trainerId)),
            { type: "battle", trainerId: object.trainerId },
          ],
    flag("rescued"),
  ),
  talkEvent(
    "petalburg.route102.boy",
    "route102Boy",
    () => [dialog(text("route102.boy"))],
  ),
  talkEvent(
    "petalburg.route102.littleboy",
    "route102LittleBoy",
    () => [dialog(text("route102.littleboy"))],
  ),
];
