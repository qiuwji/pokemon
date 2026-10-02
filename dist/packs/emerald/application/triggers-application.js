import { findWatchingTrainer } from "../../../engine/field-triggers.js";
import { isWater } from "../../../engine/terrain.js";
import { isGrass } from "../../../engine/terrain.js";
import { bindApplicationPorts } from "./ports.js";
export const TRIGGERS_PORTS = Object.freeze([
  "encounterService",
  "encounterTables",
  "field",
  "growth",
  "playStory",
  "plugins",
  "save",
  "startBattle",
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
    this.lastEncounterSteps = -5;
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
      position: s.position,
      objects: (map) => this.field.npcs.objects(map),
      eligible: (o) =>
        !s.story.rewards.includes(`trainer.${o.trainerId}.prize`) &&
        s.party.filter((m) => m.hp > 0 && !m.egg).length >=
          (this.trainerDefinitions[o.trainerId]?.format === "doubles" ? 2 : 1),
    });
    if (watching) {
      void this.playStory(this.trainerScene(watching, true));
      return;
    }
    const water =
      this.state.movement.mode === "surf" && isWater(cell?.behavior);
    const area = water ? "water" : "land";
    const registered = this.encounterTables.select(s.position.map, area, s);
    const entries =
      registered?.entries ||
      (water ? this.world.map.waterEncounters : this.world.map.encounters);
    if (
      s.party.some((m) => !m.egg) &&
      s.flags.rescued &&
      (water || isGrass(cell?.behavior)) &&
      entries &&
      this.world.steps - this.lastEncounterSteps > 3 &&
      !this.ui.dialog
    ) {
      const monster = this.encounterService().attempt({
        party: s.party,
        entries,
        rate:
          registered?.rate ??
          (water
            ? this.world.map.waterEncounterRate
            : this.world.map.encounterRate),
        area: water ? "water" : "land",
        mode: this.state.movement.mode,
      });
      if (monster) {
        this.lastEncounterSteps = this.world.steps;
        void this.startBattle(monster);
      }
    }

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
    this.lastEncounterSteps = -5;
  }
}
