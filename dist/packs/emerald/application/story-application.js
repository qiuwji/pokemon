import {
  changeStoryVariable,
  validateVariableCommand,
} from "../../../engine/story-variables.js";
import { createMonster, healMonster } from "../../../engine/model.js";
import { CommandRunner, STORY_SUSPENDED } from "../../../engine/commands.js";
import {
  storyResources,
  validateFieldCommand,
} from "../../../engine/field-director.js";
import {
  grantReward,
  grantRewardResult,
  completeEvent,
  validateReward,
  validateStoryFlag,
} from "../../../engine/story.js";
import {
  matchesCondition,
  validateCondition,
} from "../../../engine/conditions.js";
import { bindApplicationPorts } from "./ports.js";
import { dialogueHistory } from "../../../engine/dialogue-history.js";
import { validateChoicePolicy } from "../../../engine/story-choice.js";
import {
  StorySession,
  validStoryActors,
} from "../../../engine/story-session.js";
import { changeMoney, settleMoney } from "../../../engine/currency.js";
import { trainerRewardId } from "../trainers.js";
import { createStoryDialoguePorts } from "./story-dialogue-ports.js";
export const STORY_PORTS = Object.freeze([
  "control",
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
  "partyStorage",
  "performStoryFieldAction",
  "rng",
  "save",
  "sceneDirector",
  "seen",
  "startBattle",
  "startTrainerBattle",
  "resultPlan",
  "state",
  "story",
  "storyCatalog",
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
    this.mapQueue = [];
    const dialogue = createStoryDialoguePorts({
      catalog: this.storyCatalog,
      queries: this.conditionQueries,
      readState: () => this.state,
      readUI: () => this.ui,
      validateDialogue: (c) => this.validateDialogue(c),
      readInteraction: () => this.control.interaction,
    });
    this.commands = new CommandRunner(
      {
        presentation: (c) => this.sceneDirector.play(c.id, c.payload || {}),
        script: async (c) => {
          if (this.storyCatalog.script(c.id).durable) {
            await this.sessions.run(() => this.state.story, c);
            return this.state.story.session ? STORY_SUSPENDED : undefined;
          }
          if (
            (await this.commands.run(
              this.storyCatalog.commands(c.id, c.input),
            )) === STORY_SUSPENDED
          )
            return STORY_SUSPENDED;
          if (c.event) completeEvent(this.state, c.event);
        },
        checkpoint: () => {},
        screen: (c) => {
          const screens = {
            clock: () => this.ui.showTime(),
            berry: () => this.ui.showBerryPlot(c.input?.plotId),
            daycare: () => this.ui.showDaycare(),
          };
          return screens[c.id]();
        },
        dialog: dialogue.dialog,
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
          validateStoryFlag(c.key, c.value);
          this.state.flags[c.key] = c.value;
          this.ui?.updateSide();
        },
        heal: () => {
          this.state.party.forEach((m) => healMonster(m, this.db));
          this.ui?.updateSide();
        },
        reward: (c) =>
          (c.onResult ? grantRewardResult : grantReward)(this.state, c, {
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
          if (!this.partyStorage.receive(this.state, mon))
            throw new Error("Capture storage unavailable");
          this.seen(mon.species, true);
        },
        lossPenalty: () => {
          const delta = -Math.max(0, ...this.state.party.map((m) => m.level)) * 8;
          settleMoney(this.state, changeMoney(this.state.money, delta, {
            clamp: true, message: "Invalid loss currency settlement",
          }));
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
        choose: dialogue.choose,
        validateCommand: (c) => {
          validateFieldCommand(c, this.db.maps);
          if (c.type === "script") {
            const commands = this.storyCatalog.commands(c.id, c.input);
            this.commands.validate(commands);
            if (this.storyCatalog.script(c.id).durable)
              this.storyCatalog.program(c.id, c.input);
          }
          if (
            c.type === "screen" &&
            !["clock", "berry", "daycare"].includes(c.id)
          )
            throw new Error("Unknown story screen");
          if (c.type === "dialog")
            this.validateDialogue(
              this.storyCatalog.resolveDialogue(c, this.state),
            );
          if (c.type === "choice")
            validateChoicePolicy(
              c,
              new Set(this.story.events.map((e) => e.id)),
              this.conditionQueries,
            );
          if (c.type === "if")
            validateCondition(
              c.condition,
              new Set(this.story.events.map((e) => e.id)),
              "story.if",
              this.conditionQueries,
            );
          if (c.type === "weather") this.validateWeatherCommand(c);
          if (c.type === "setVariable") validateVariableCommand(c);
          if (c.type === "flag") validateStoryFlag(c.key, c.value);
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
    this.sessions = new StorySession({
      catalog: this.storyCatalog,
      execute: (c) =>
        c.type === "parallel"
          ? this.commands.execute(c)
          : this.commands.handlers[c.type](c),
      choose: (c) => this.commands.choose(c),
      testCondition: (c) =>
        matchesCondition(c, this.state, this.conditionQueries),
      checkpoint: () => this.checkpoint(),
      startBattle: (c, token) => this.startSessionBattle(c, token),
      complete: (id) => completeEvent(this.state, id),
    });
  }
  dialogueHistory() {
    return dialogueHistory(this.state.story);
  }
  storyMapEntered(map, reason) {
    // Earlier-map arrivals become stale; only the current destination may acquire control.
    this.mapQueue = [{ map, reason }];
  }
  async flushStoryQueue() {
    if (
      !this.ui ||
      this.storyBusy ||
      this.battle ||
      this.fieldDirector.active ||
      this.ui.blocked ||
      this.ui.dialog
    )
      return;
    const entry = this.mapQueue.shift();
    if (!entry || entry.map !== this.state.position.map) return;
    try {
      if (this.state.story.session) {
        if (
          this.state.story.session.status === "ready" &&
          entry.reason === "restore"
        )
          await this.resumeStory();
        return;
      }
      const commands = this.story.resolve("mapEnter", this.state, entry);
      if (commands.length) await this.playStory(commands);
    } catch (error) {
      this.ui.toast("地图剧情未能启动，请检查剧情绑定。");
      console.error(error);
    }
  }
  async checkpoint() {
    const actors = this.fieldDirector.snapshotActors();
    if (!validStoryActors(actors))
      throw new Error("Invalid story checkpoint actors");
    this.state.story.session.actors = actors;
    if (this.fieldDirector.active)
      await this.fieldDirector.end({ failed: false });
    this.storyBusy = false;
    try {
      this.save();
    } finally {
      this.storyBusy = true;
      this.fieldDirector.begin();
    }
  }
  async startSessionBattle(command, token) {
    const waiting = this.state.story.session;
    const recover = () => this.sessions.cancelBattle(this.state.story, waiting);
    const owner = (battle) => {
      const base = this.resultPlan(battle, { story: false });
      return {
        commit: () => {
          // Validate the continuation before committing currency/custody.
          const record = structuredClone(this.state.story);
          if (!this.sessions.battleResult(record, token, battle.result))
            throw new Error("Story battle receipt rejected");
          base.commit();
          if (battle.trainerId && battle.result === "win") {
            const trainer = this.trainerDefinitions[battle.trainerId];
            grantReward(
              this.state,
              {
                id: trainerRewardId(battle.trainerId),
                money: trainer.prize * (battle.prizeMultiplier || 1),
              },
              { items: this.itemDefinitions, inventory: this.inventory },
            );
          }
          if (!this.sessions.battleResult(this.state.story, token, battle.result))
            throw new Error("Story battle receipt rejected");
        },
        after: () => {
          this.save();
          void this.resumeStory()?.catch((error) => {
            this.ui?.toast("剧情暂停，可从菜单继续剧情或读取检查点。");
            console.error(error);
          });
        },
      };
    };
    if (command.trainerId)
      return this.startTrainerBattle(command.trainerId, owner, recover);
    return this.startBattle(
      createMonster(command.species, command.level, this.db, this.rng),
      command.options || {},
      null,
      owner,
      recover,
    );
  }
  resumeStory() {
    if (
      !this.state.story.session ||
      this.state.story.session.status !== "ready" ||
      this.storyBusy ||
      this.battle
    )
      return;
    return this.runStory([{ type: "resumeScript" }]);
  }
  async runStory(commands) {
    if (this.storyBusy) return;
    if (this.state.story.session && commands[0]?.type !== "resumeScript")
      throw new Error("Resume the pending story before starting another");
    this.storyBusy = true;
    this.clearInput();
    let failed = true;
    try {
      if (commands[0]?.type === "resumeScript") {
        this.sessions.validate(this.state.story.session);
        this.commands.validate(
          this.storyCatalog.commands(
            this.state.story.session.script,
            this.state.story.session.input,
          ),
        );
      } else this.commands.validate(commands);
      this.fieldDirector.begin();
      if (commands[0]?.type === "resumeScript") {
        const actors = this.state.story.session.actors || [];
        if (actors.length)
          await this.transitions.run("door", () => {
            this.fieldDirector.stage(actors);
            for (const actor of actors)
              if (actor.hidden) this.fieldDirector.hide({ actor: actor.id });
          });
        await this.sessions.run(() => this.state.story);
      } else await this.commands.run(commands);
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
