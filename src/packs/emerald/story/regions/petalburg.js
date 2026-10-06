import { dialog, battle, flag, not, all, talkEvent } from "../helpers.js";
import { TRAINERS, trainerRewardId } from "../../trainers.js";
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
    () => [
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
          x: 5,
          y: 110,
          dir: "up",
          movement: { mode: "still", dir: "up", rangeX: 0, rangeY: 0 },
        },
      },
      { type: "sound", cue: "emerald-audio:se_door" },
      { type: "emote", actor: "wally.gym.arrive", kind: "exclamation", ms: 450 },
      { type: "move", actor: "wally.gym.arrive", to: { x: 5, y: 108 }, ignoreActors: ["player"] },
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
      { type: "flag", key: "wallyInTown", value: true },
      { type: "flag", key: "wallyTutorial", value: true },
      {
        type: "scene",
        kind: "door",
        position: { map: "PetalburgCity", x: 15, y: 10, dir: "right" },
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
      // The reference walks the player and Wally east out of town and into the Route 102 grass.
      // The step off the town edge is a normal connection crossing (no scene transition); the
      // town Wally is hidden as the player crosses and the route Wally takes over.
      {
        type: "parallel",
        commands: [
          {
            type: "sequence",
            commands: [
              { type: "move", actor: "player", to: { x: 29, y: 16 }, ignoreActors: ["wally.city"] },
            ],
          },
          {
            type: "sequence",
            commands: [
              { type: "move", actor: "wally.city", to: { x: 28, y: 16 }, ignoreActors: ["player"] },
            ],
          },
        ],
      },
      { type: "face", actor: "player", dir: "right" },
      { type: "face", actor: "wally.city", dir: "right" },
      { type: "hide", actor: "wally.city" },
      { type: "flag", key: "wallyInTown", value: false },
      { type: "move", actor: "player", path: ["right"] },
      {
        type: "parallel",
        commands: [
          {
            type: "sequence",
            commands: [
              { type: "move", actor: "player", to: { x: 6, y: 5 }, ignoreActors: ["wally.route102"] },
            ],
          },
          {
            type: "sequence",
            commands: [
              { type: "move", actor: "wally.route102", to: { x: 5, y: 5 }, ignoreActors: ["player"] },
            ],
          },
        ],
      },
      { type: "face", actor: "player", dir: "up" },
      { type: "face", actor: "wally.route102", target: "player" },
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
      { type: "flag", key: "wallyDone", value: true },
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
