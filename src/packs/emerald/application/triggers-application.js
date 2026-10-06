import { trainerRewardId } from "../trainers.js";
import { findWatchingTrainer } from "../../../engine/field-triggers.js";
import { bindApplicationPorts } from "./ports.js";
export const TRIGGERS_PORTS = Object.freeze([
  "encounterStep",
  "resetEncounters",
  "field",
  "growth",
  "playStory",
  "plugins",
  "save",
  "state",
  "story",
  "storyBusy",
  "trainerDefinitions",
  "ui",
  "world",
]);
/** triggers use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class TriggersApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, TRIGGERS_PORTS);
  }
  advanceTravelClocks() {
    this.growth.advance();
    this.plugins?.runtime?.advance("step");
    this.plugins?.events.emit("core:field-step", {
      position: { ...this.state.position },
    });
  }
  step(cell) {
    if (this.storyBusy) return;
    const s = this.state;
    const scene = this.story.resolve("step", s, {
      map: s.position.map,
      position: { ...s.position },
      cell,
    });
    if (scene.length) {
      void this.playStory(scene);
      return;
    }
    const watching = findWatchingTrainer({
      maps: this.world.maps,
      elevation: this.world.elevation,
      position: s.position,
      objects: (map) => this.field.npcs.objects(map),
      eligible: (o) =>
        !s.story.rewards.includes(trainerRewardId(o.trainerId)) &&
        s.party.filter((m) => m.hp > 0 && !m.egg).length >=
          (this.trainerDefinitions[o.trainerId]?.format === "doubles" ? 2 : 1),
    });
    if (watching) {
      void this.playStory(this.trainerScene(watching, true));
      return;
    }
    this.encounterStep(cell);

    if (this.world.steps % 20 === 0) this.save();
  }
  trainerScene(object, approach = false) {
    return [
      ...(approach
        ? [
            { type: "emote", actor: object.id, kind: "exclamation", ms: 450 },
            { type: "approach", actor: object.id },
          ]
        : []),
      {
        type: "dialog",
        name: object.name || this.trainerDefinitions[object.trainerId].name,
        lines: [object.text || "让我们来一场宝可梦对战吧！"],
      },
      { type: "battle", trainerId: object.trainerId },
    ];
  }
  reset() {
    this.resetEncounters();
  }
}
