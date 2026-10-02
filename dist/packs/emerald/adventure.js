import { composeApplications } from "./application/composition.js";
import { exposeCompatibilityFields } from "./application/compatibility.js";
import { ConditionQueries } from "../../engine/condition-queries.js";
import { EncounterTableRegistry } from "../../engine/encounter-tables.js";
import { BattleStrategyRegistry } from "../../engine/battle/strategy-registry.js";
import { StoryEngine } from "../../engine/story.js";
import { CameraRig } from "../../engine/camera.js";
import { ITEMS } from "./pack.js";
import { EMERALD_STORY } from "./story.js";
import { MoveEffectRegistry } from "../../engine/move-effects.js";
import { validateCondition } from "../../engine/conditions.js";
import { GEN3_ABILITIES } from "../../engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../../engine/rules/gen3/held-items.js";
import { MOVEMENT_MODES, TRAVEL_DESTINATIONS } from "./movement.js";
import { TRAINERS } from "./trainers.js";
/** Composition root and compatibility facade. Use cases live behind explicitly scoped ports. */
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
    clearInput = () => {},
    plugins = null,
    catalog = {
      items: ITEMS,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
      movement: MOVEMENT_MODES,
      destinations: TRAVEL_DESTINATIONS,
      moveEffects: {},
    },
  }) {
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
      clearInput,
      plugins,
      catalog,
    });
    this.conditionQueries = new ConditionQueries(catalog.conditionQueries);
    this.itemDefinitions = catalog.items;
    this.trainerDefinitions = catalog.trainers || TRAINERS;
    this.battleStrategies = new BattleStrategyRegistry(
      catalog.battleStrategies,
    );
    this.encounterTables = new EncounterTableRegistry(catalog.encounters, db);
    this.story = new StoryEngine(
      [...(plugins?.story.values() || []), ...EMERALD_STORY.events],
      EMERALD_STORY.quests,
      { queries: this.conditionQueries },
    );
    for (const event of this.story.events)
      if (event.where) {
        const m = db.maps[event.where.map];
        if (
          !m ||
          event.where.x + event.where.width > m.width ||
          event.where.y + event.where.height > m.height
        )
          throw new Error(`Story region outside map: ${event.id}`);
      }
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
    exposeCompatibilityFields(this, this.applications);
    const read = (name) => {
      const value = this[name];
      return typeof value === "function" ? value.bind(this) : value;
    };
    composeApplications(this.applications, read, { storage });
    this.bindField();
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
    this.applications.world.bind();
  }
  timeView(...args) {
    return this.applications.time.timeView(...args);
  }
  startClock(...args) {
    return this.applications.time.startClock(...args);
  }
  tickTime(...args) {
    return this.applications.time.tick(...args);
  }
  pausePlayTime(...args) {
    return this.applications.time.pausePlayTime(...args);
  }
  syncTime(...args) {
    return this.applications.time.syncTime(...args);
  }
  scheduleTimeTask(...args) {
    return this.applications.time.scheduleTimeTask(...args);
  }
  cancelTimeTask(...args) {
    return this.applications.time.cancelTimeTask(...args);
  }
  advanceWorldTime(...args) {
    return this.applications.time.advanceWorldTime(...args);
  }
  setLead(...args) {
    return this.applications.inventory.setLead(...args);
  }
  usePotion(...args) {
    return this.applications.inventory.usePotion(...args);
  }
  itemPlan(...args) {
    return this.applications.inventory.itemPlan(...args);
  }
  useItem(...args) {
    return this.applications.inventory.useItem(...args);
  }
  equipItem(...args) {
    return this.applications.inventory.equipItem(...args);
  }
  canBuyItem(...args) {
    return this.applications.inventory.canBuyItem(...args);
  }
  buyItem(...args) {
    return this.applications.inventory.buyItem(...args);
  }
  withdrawBox(...args) {
    return this.applications.inventory.withdrawBox(...args);
  }
  exchangeBox(...args) {
    return this.applications.inventory.exchangeBox(...args);
  }
  depositBox(...args) {
    return this.applications.inventory.depositBox(...args);
  }
  seen(...args) {
    return this.applications.party.seen(...args);
  }
  chooseStarter(...args) {
    return this.applications.party.chooseStarter(...args);
  }
  canManageParty(...args) {
    return this.applications.party.canManageParty(...args);
  }
  learnMove(...args) {
    return this.applications.party.learnMove(...args);
  }
  restoreForm(...args) {
    return this.applications.forms.restoreForm(...args);
  }
  changeForm(...args) {
    return this.applications.forms.changeForm(...args);
  }
  evolutionPlan(...args) {
    return this.applications.growth.evolutionPlan(...args);
  }
  evolve(...args) {
    return this.applications.growth.evolve(...args);
  }
  canUseDaycare(...args) {
    return this.applications.growth.canUseDaycare(...args);
  }
  daycareView(...args) {
    return this.applications.growth.daycareView(...args);
  }
  depositDaycare(...args) {
    return this.applications.growth.depositDaycare(...args);
  }
  withdrawDaycare(...args) {
    return this.applications.growth.withdrawDaycare(...args);
  }
  collectEgg(...args) {
    return this.applications.growth.collectEgg(...args);
  }
  hatchReady(...args) {
    return this.applications.growth.hatchReady(...args);
  }
  animateEvolution(...args) {
    return this.applications.growth.animateEvolution(...args);
  }
  prepareTradePartner(...args) {
    return this.applications.growth.prepareTradePartner(...args);
  }
  performTrade(...args) {
    return this.applications.growth.performTrade(...args);
  }
  startTrainerBattle(...args) {
    return this.applications.battle.startTrainerBattle(...args);
  }
  startBattle(...args) {
    return this.applications.battle.startBattle(...args);
  }
  turn(...args) {
    return this.applications.battle.turn(...args);
  }
  encounterService(...args) {
    return this.applications.battle.encounterService(...args);
  }
  resultPlan(...args) {
    return this.applications.battle.resultPlan(...args);
  }
  runStory(...args) {
    return this.applications.story.runStory(...args);
  }
  playStory(...args) {
    return this.applications.story.playStory(...args);
  }
  visitMap(...args) {
    return this.applications.movement.visitMap(...args);
  }
  fieldCapabilities(...args) {
    return this.applications.movement.fieldCapabilities(...args);
  }
  claimFieldEquipment(...args) {
    return this.applications.movement.claimFieldEquipment(...args);
  }
  movementOptions(...args) {
    return this.applications.movement.movementOptions(...args);
  }
  setMovementMode(...args) {
    return this.applications.movement.setMovementMode(...args);
  }
  movementTechniqueOptions(...args) {
    return this.applications.movement.movementTechniqueOptions(...args);
  }
  setMovementTechnique(...args) {
    return this.applications.movement.setMovementTechnique(...args);
  }
  boardSurf(...args) {
    return this.applications.movement.boardSurf(...args);
  }
  flyTo(...args) {
    return this.applications.movement.flyTo(...args);
  }
  waitForMovement(...args) {
    return this.applications.movement.waitForMovement(...args);
  }
  baseWorldObjects(...args) {
    return this.applications.world.baseWorldObjects(...args);
  }
  patchWorld(...args) {
    return this.applications.world.patchWorld(...args);
  }
  prepareWorldPatch(...args) {
    return this.applications.world.prepareWorldPatch(...args);
  }
  fieldActionOptions(...args) {
    return this.applications.fieldActions.options(...args);
  }
  performFieldAction(...args) {
    return this.applications.fieldActions.perform(...args);
  }
  reelFishing(...args) {
    return this.applications.fieldActions.reelFishing(...args);
  }
  validateFieldActionCommand(...args) {
    return this.applications.fieldActions.validateCommand(...args);
  }
  performStoryFieldAction(...args) {
    return this.applications.fieldActions.performFromStory(...args);
  }
  enter(...args) {
    return this.applications.world.enter(...args);
  }
  move(...args) {
    return this.applications.world.move(...args);
  }
  interact(...args) {
    return this.applications.world.interact(...args);
  }
  advanceTravelClocks(...args) {
    return this.applications.triggers.advanceTravelClocks(...args);
  }
  step(...args) {
    return this.applications.triggers.step(...args);
  }
  trainerScene(...args) {
    return this.applications.triggers.trainerScene(...args);
  }
  newState(...args) {
    return this.applications.save.newState(...args);
  }
  save(...args) {
    return this.applications.save.save(...args);
  }
  loadDocument(...args) {
    return this.applications.save.loadDocument(...args);
  }
  exportDocument(...args) {
    return this.applications.save.exportDocument(...args);
  }
  reset(...args) {
    return this.applications.save.reset(...args);
  }
  tick(...args) {
    return this.applications.frame.tick(...args);
  }
  inspect(...args) {
    return this.applications.inspection.inspect(...args);
  }
  playPresentation(...args) {
    return this.applications.presentation.playPresentation(...args);
  }
}
