import {
  GEN3_WORLD_WEATHER,
  GEN3_BATTLE_WEATHER,
} from "../../engine/rules/gen3/weather.js";
import { emeraldDatabase } from "./database.js";
import { EMERALD_LEARNING_METHODS } from "./machine-learning.js";
import { composeApplications } from "./application/composition.js";
import { exposeApplicationPorts } from "./application/public-ports.js";
import { ConditionQueries } from "../../engine/condition-queries.js";
import { EncounterTableRegistry } from "../../engine/encounter-tables.js";
import { BattleStrategyRegistry } from "../../engine/battle/strategy-registry.js";
import { createEmeraldStory } from "./story/runtime.js";
import { CameraRig } from "../../engine/camera.js";
import { ITEMS } from "./pack.js";
import { MoveEffectRegistry } from "../../engine/move-effects.js";
import { validateCondition } from "../../engine/conditions.js";
import { GEN3_ABILITIES } from "../../engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../../engine/rules/gen3/held-items.js";
import { MOVEMENT_MODES, TRAVEL_DESTINATIONS } from "./movement.js";
import { TRAINERS } from "./trainers.js";
/** Composition root and current host API. Use cases live behind explicitly scoped ports. */
export class EmeraldAdventure {
  constructor({
    db,
    storage,
    motion,
    director,
    sceneDirector = null,
    transitions,
    timeline,
    camera = new CameraRig(timeline),
    reducedMotion = () => false,
    onMap = () => {},
    onSave = () => {},
    wallNow = Date.now,
    playActive = () => true,
    clearInput = () => {},
    plugins = null,
    catalog = {
      items: ITEMS,
      weather: GEN3_WORLD_WEATHER,
      battleWeather: GEN3_BATTLE_WEATHER,
      learningMethods: EMERALD_LEARNING_METHODS,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
      movement: MOVEMENT_MODES,
      destinations: TRAVEL_DESTINATIONS,
      moveEffects: {},
    },
  }) {
    db = emeraldDatabase(db);
    Object.assign(this, {
      db,
      motion,
      director,
      sceneDirector,
      transitions,
      timeline,
      camera,
      reducedMotion,
      onMap,
      onSave,
      wallNow,
      playActive,
      clearInput,
      plugins,
      catalog,
    });
    this.conditionQueries = new ConditionQueries(catalog.conditionQueries, {
      inventory: { preview: (...args) => this.inventory.preview(...args) },
    });
    this.itemDefinitions = catalog.items;
    this.trainerDefinitions = catalog.trainers || TRAINERS;
    this.battleStrategies = new BattleStrategyRegistry(
      catalog.battleStrategies,
    );
    this.encounterTables = new EncounterTableRegistry(catalog.encounters, db);
    Object.assign(this, createEmeraldStory({
      db, plugins, queries: this.conditionQueries,
    }));
    this.moveEffects = new MoveEffectRegistry({
      definitions: catalog.moveEffects,
    });
    this.ruleHooks = plugins?.hooks(this.moveEffects.operations) || [];
    this.moveEffects.validateMoves(db.moves);
    for (const item of Object.values(this.itemDefinitions))
      validateCondition(
        item.purchaseRequires,
        new Set(),
        "purchaseRequires",
        this.conditionQueries,
      );
    this.applications = {};
    exposeApplicationPorts(this, this.applications);
    const read = (name) => {
      const value = this[name];
      return typeof value === "function" ? value.bind(this) : value;
    };
    composeApplications(this.applications, read, { storage });
    this.camera.baseFocus = (player) => this.cameraFocus(player);
    this.bindField();
  }
  /** The host owns the audio device; stories may only request a registered cue by id. */
  attachSound(play) {
    this.playSound = typeof play === "function" ? play : null;
  }
  playStorySound(cue) {
    if (typeof cue !== "string" || !cue) throw new Error("Invalid story sound cue");
    this.playSound?.(cue);
  }
  attachUI(ui) {
    this.ui = ui;
    ui.updateSide();
    this.onSave(this.lastSave, true);
    if (this.saveWarning) ui.toast(this.saveWarning);
  }
  get world() {
    return this.field.world;
  }
  get battle() {
    return this.combat.battle;
  }
  get busy() {
    return (
      this.storyBusy ||
      this.combat.busy ||
      this.field.busy ||
      this.travelDirector.busy ||
      this.growthDirector.busy ||
      this.growthBusy ||
      this.actionBusy ||
      !!this.sceneDirector?.busy
    );
  }
  bindField() {
    this.applications.save.reseed();
    this.applications.forms.bind();
    this.applications.growth.bind();
    this.applications.time.bind();
    this.applications.weather.bind();
    this.applications.crops.bind();
    this.applications.actors.bind();
    this.applications.world.bind();
    this.applications.facilities.bind();
  }
}
