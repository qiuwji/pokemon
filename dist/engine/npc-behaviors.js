import { NPCPoseRegistry } from "./npc-poses.js";
import { readOnly, callSync } from "./extensions/values.js";
const choose = (directions, roll) =>
  directions[
    Math.min(directions.length - 1, Math.floor(roll * directions.length))
  ];
const walking = (c) => ({
  dir: choose(
    c.config.mode === "horizontal"
      ? ["left", "right"]
      : c.config.mode === "vertical"
        ? ["up", "down"]
        : c.config.mode === "patrol" && c.config.path?.length
          ? c.config.path
          : ["down", "up", "left", "right"],
    c.rolls[0],
  ),
  move: c.rolls[1] >= 0.22,
  pose: "walk",
});
export const NPC_BEHAVIORS = Object.freeze({
  still: () => ({ move: false, pose: "still" }),
  wander: walking,
  horizontal: walking,
  vertical: walking,
  patrol: walking,
  look: (c) => ({ ...walking(c), move: false, pose: "still" }),
  jog: (c) => ({ dir: c.config.dir || c.dir, move: false, pose: "jog" }),
  hop: (c) => ({ dir: c.dir, move: false, pose: "hop" }),
  spin: (c) => ({
    dir: choose(["down", "left", "up", "right"], (c.now % 1000) / 1000),
    move: false,
    pose: "spin",
  }),
  sleep: (c) => ({ dir: c.dir, move: false, pose: "sleep" }),
  cheer: (c) => ({ dir: c.dir, move: false, pose: "cheer" }),
});
/** Behavior proposes an intent; shared grid collision, reservations and lifecycle remain authoritative. */
export class NPCBehaviorRegistry {
  constructor(definitions = {}, { poses = new NPCPoseRegistry() } = {}) {
    this.poses = poses;
    this.definitions = new Map(
      Object.entries({ ...NPC_BEHAVIORS, ...definitions }),
    );
    for (const [id, definition] of this.definitions)
      if (typeof (definition.decide || definition) !== "function")
        throw new Error(`Invalid NPC behavior ${id}`);
  }
  decide(mode, context) {
    const definition = this.definitions.get(mode);
    if (!definition) throw new Error(`Unknown NPC behavior ${mode}`);
    const intent = readOnly(
      callSync(definition.decide || definition, [readOnly(context)]),
    );
    if (
      typeof intent.move !== "boolean" ||
      (intent.interaction !== undefined &&
        (!intent.interaction ||
          typeof intent.interaction.target !== "string" ||
          !intent.interaction.target ||
          typeof intent.interaction.kind !== "string" ||
          !/^[a-zA-Z0-9_.:-]{1,128}$/.test(intent.interaction.kind) ||
          Object.keys(intent.interaction).some(
            (k) => !["target", "kind"].includes(k),
          ))) ||
      (intent.goal !== undefined &&
        (!intent.goal ||
          typeof intent.goal.map !== "string" ||
          !Number.isInteger(intent.goal.x) ||
          !Number.isInteger(intent.goal.y) ||
          (intent.goal.adjacent !== undefined &&
            typeof intent.goal.adjacent !== "boolean") ||
          Object.keys(intent.goal).some(
            (k) => !["map", "x", "y", "adjacent"].includes(k),
          ))) ||
      !this.poses.definitions.has(intent.pose) ||
      (intent.dir !== undefined &&
        !["up", "down", "left", "right"].includes(intent.dir)) ||
      (intent.duration !== undefined &&
        (!Number.isFinite(intent.duration) ||
          intent.duration < 80 ||
          intent.duration > 2000))
    )
      throw new Error("Invalid NPC movement intent");
    return intent;
  }
}
