import {
  changeStoryVariable,
  validateVariableCommand,
} from "../../../engine/story-variables.js";
import { createMonster, healMonster } from "../../../engine/model.js";
import { CommandRunner } from "../../../engine/commands.js";
import {
  storyResources,
  validateFieldCommand,
} from "../../../engine/field-director.js";
import {
  grantReward,
  completeEvent,
  validateReward,
} from "../../../engine/story.js";
import {
  matchesCondition,
  validateCondition,
} from "../../../engine/conditions.js";
import { bindApplicationPorts } from "./ports.js";
export const STORY_PORTS = Object.freeze([
  "validateDialogue",
  "battle",
  "validateWeatherCommand",
  "performStoryWeather",
  "camera",
  "clearInput",
  "conditionQueries",
  "db",
  "enter",
  "fieldDirector",
  "itemDefinitions",
  "inventory",
  "patchWorld",
  "performStoryFieldAction",
  "rng",
  "save",
  "sceneDirector",
  "seen",
  "startBattle",
  "startTrainerBattle",
  "state",
  "story",
  "timeline",
  "trainerDefinitions",
  "transitions",
  "ui",
  "worldState",
  "validateFieldActionCommand",
]);
/** story use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class StoryApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, STORY_PORTS);
    this.storyBusy = false;
    this.commands = new CommandRunner(
      {
        presentation: (c) => this.sceneDirector.play(c.id, c.payload || {}),
        dialog: (c) =>
          this.ui.say(c.name, c.lines, null, {
            speed: c.speed ?? 30,
            mode: c.mode ?? "typewriter",
          }),
        starter: () => this.ui.starterPicker(),
        shop: () => this.ui.showShop(),
        battle: (c) => {
          if (c.trainerId) return this.startTrainerBattle(c.trainerId);
          return this.startBattle(
            createMonster(c.species, c.level, this.db, this.rng, {
              trainer: c.options?.trainer,
            }),
            c.options,
          );
        },
        teleport: (c) =>
          this.transitions.run("door", () => {
            if (!this.enter(c.position))
              throw new Error("Story destination cannot be entered");
          }),
        scene: (c) =>
          this.transitions.run(c.kind || "door", () => {
            if (!this.enter(c.position))
              throw new Error("Story destination cannot be entered");
            this.camera.reset();
            this.fieldDirector.stage(c.actors);
          }),
        wait: (c) => this.timeline.wait(c.ms),
        weather: (c) => this.performStoryWeather(c),
        worldPatch: (c) => this.patchWorld(c.operations),
        fieldAction: async (c) => {
          const result = await this.performStoryFieldAction(
            c.id,
            c.input || {},
          );
          if (c.variable)
            changeStoryVariable(this.state.story, {
              name: c.variable,
              value: result.ok,
            });
          else if (!result.ok) throw new Error(result.reason);
          return result;
        },
        setVariable: (c) => changeStoryVariable(this.state.story, c),
        move: (c) => this.fieldDirector.move(c),
        approach: (c) => this.fieldDirector.approach(c),
        face: (c) => this.fieldDirector.face(c),
        escort: (c) => this.fieldDirector.escort(c),
        emote: (c) => this.fieldDirector.emote(c),
        hide: (c) => this.fieldDirector.hide(c),
        cameraTo: (c) => this.fieldDirector.cameraTo(c),
        cameraFollow: (c) => this.fieldDirector.cameraFollow(c),
        flag: (c) => {
          this.state.flags[c.key] = c.value;
          this.ui?.updateSide();
        },
        heal: () => {
          this.state.party.forEach((m) => healMonster(m, this.db));
          this.ui?.updateSide();
        },
        reward: (c) =>
          grantReward(this.state, c, {
            items: this.itemDefinitions,
            inventory: this.inventory,
          }),
        completeEvent: (c) => completeEvent(this.state, c.id),
        captureMonster: (c) => {
          if (
            [...this.state.party, ...this.state.box].some(
              (m) => m.uid === c.monster.uid,
            )
          )
            return;
          const mon = structuredClone(c.monster);
          (this.state.party.length < 6
            ? this.state.party
            : this.state.box
          ).push(mon);
          this.seen(mon.species, true);
        },
        lossPenalty: () => {
          this.state.money = Math.max(
            0,
            this.state.money -
              Math.max(...this.state.party.map((m) => m.level)) * 8,
          );
        },
      },
      {
        resources: (c) => {
          if (c.type === "weather") return ["weather"];
          const scene =
            c.type === "presentation" &&
            this.sceneDirector?.definitions.get(c.id);
          return scene?.field && !scene.draw
            ? ["field-presentation"]
            : storyResources(c);
        },
        testCondition: (c) =>
          matchesCondition(c, this.state, this.conditionQueries),
        choose: async (c) => {
          const value = await this.ui.choose(
            c.name,
            c.prompt,
            c.options.map(({ id, label }) => ({ id, label })),
            c.cancel,
          );
          if (!c.options.some((o) => o.id === value))
            throw new Error("Invalid story choice result");
          if (c.variable)
            changeStoryVariable(this.state.story, { name: c.variable, value });
          return value;
        },
        validateCommand: (c) => {
          validateFieldCommand(c, this.db.maps);
          if (c.type === "dialog") this.validateDialogue(c);
          if (c.type === "if")
            validateCondition(
              c.condition,
              new Set(this.story.events.map((e) => e.id)),
              "story.if",
              this.conditionQueries,
            );
          if (c.type === "weather") this.validateWeatherCommand(c);
          if (c.type === "setVariable") validateVariableCommand(c);
          if (c.type === "choice" && c.variable)
            validateVariableCommand({ name: c.variable, value: "" });
          if (c.type === "worldPatch")
            this.worldState.validateOperations(c.operations);
          if (c.type === "fieldAction") {
            this.validateFieldActionCommand(c);
            if (c.variable)
              validateVariableCommand({ name: c.variable, value: false });
          }
          if (c.type === "presentation")
            this.sceneDirector?.validate(c.id, c.payload || {}) ||
              (() => {
                throw new Error("Scene presentation unavailable");
              })();
          if (
            c.type === "battle" &&
            !(c.trainerId
              ? this.trainerDefinitions[c.trainerId]
              : this.db.species[c.species] &&
                Number.isInteger(c.level) &&
                c.level >= 1 &&
                c.level <= 100)
          )
            throw new Error("Invalid battle content reference");
          if (c.type === "reward") validateReward(c, this.itemDefinitions);
          if (
            c.type === "completeEvent" &&
            !this.story.events.some((e) => e.id === c.id)
          )
            throw new Error(`Unknown event ${c.id}`);
          if (
            c.type === "captureMonster" &&
            (!this.db.species[c.monster?.species] || !c.monster.uid)
          )
            throw new Error("Invalid captured monster");
        },
      },
    );
  }
  async runStory(commands) {
    if (this.storyBusy) return;
    this.storyBusy = true;
    this.clearInput();
    let failed = true;
    try {
      this.commands.validate(commands);
      this.fieldDirector.begin();
      await this.commands.run(commands);
      failed = false;
    } finally {
      try {
        if (this.fieldDirector.active) await this.fieldDirector.end({ failed });
      } finally {
        this.storyBusy = false;
        this.clearInput();
        this.ui?.updateSide();
        if (this.battle) this.ui?.drawBattleHUD();
        if (!failed) this.save();
      }
    }
  }
  playStory(commands) {
    return this.runStory(commands).catch((error) => {
      this.ui?.toast("剧情未能继续，请读取最近的存档。");
      console.error(error);
    });
  }
}
