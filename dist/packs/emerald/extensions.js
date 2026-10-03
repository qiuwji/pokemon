import { ActorScheduleRegistry } from "../../engine/actor-schedules.js";
import { FieldEffectRegistry } from "../../engine/field-effects.js";
import { EMERALD_FIELD_EFFECTS } from "./field-effects.js";
import { BattleAugmentRegistry } from "../../engine/battle/augments.js";
import { FacilityRegistry } from "../../engine/facilities.js";
import {
  EMERALD_FACILITIES,
  EMERALD_FACILITY_ACTIVITIES,
} from "./facilities.js";
import { validateItemActions } from "../../engine/item-actions.js";
import { GEN3_INVENTORY_POCKETS } from "../../engine/rules/gen3/inventory.js";
import { createEmeraldInventory } from "./inventory.js";
import { WeatherRegistry } from "../../engine/weather.js";
import { BattleWeatherRegistry } from "../../engine/battle/weather.js";
import {
  GEN3_WORLD_WEATHER,
  GEN3_BATTLE_WEATHER,
} from "../../engine/rules/gen3/weather.js";
import { WEATHER_EFFECTS } from "../../presentation/weather-effects.js";
import { validateSpriteAnimations } from "../../engine/extensions/sprite-contracts.js";
import { MovementInputRegistry } from "../../engine/movement-input.js";
import { GEN3_MOVEMENT_INPUTS } from "../../engine/rules/gen3/bike-input.js";
import { FieldDeviceCatalog } from "../../engine/field-devices.js";
import {
  EMERALD_FIELD_MECHANISMS,
  validateEmeraldDeviceContent,
} from "./field-mechanisms.js";
import { NPCPoseRegistry } from "../../engine/npc-poses.js";
import { ActorTemplateRegistry } from "../../engine/actor-repository.js";
import { CropRegistry } from "../../engine/crop-growth.js";
import { EMERALD_CROPS, validateBerryPlots } from "./berries.js";
import { TimeTaskRegistry } from "../../engine/world-schedule.js";
import { CreatureFormRegistry } from "../../engine/creatures/forms.js";
import { emeraldDatabase } from "./database.js";
import { EMERALD_LEARNING_METHODS } from "./machine-learning.js";
import { MoveLearningService } from "../../engine/growth/move-learning.js";
import { validateTrainerSight } from "../../engine/field-triggers.js";
import { BattleStateRegistry } from "../../engine/battle/state-registry.js";
import { GEN3_BATTLE_STATES } from "../../engine/rules/gen3/battle-states.js";
import { ConditionQueries } from "../../engine/condition-queries.js";
import { TRAINERS } from "./trainers.js";
import { validateTrainers } from "../../engine/trainer-encounters.js";
import { EncounterTableRegistry } from "../../engine/encounter-tables.js";
import { BattleStrategyRegistry } from "../../engine/battle/strategy-registry.js";
import { NPCBehaviorRegistry } from "../../engine/npc-behaviors.js";
import { EMERALD_PLUGIN_PERMISSIONS } from "./extension-intents.js";
import { validateWorldExtensions } from "../../engine/extensions/world-content.js";
import { extensionGrowthConditions } from "../../engine/extensions/growth-conditions.js";
import { PluginHost } from "../../engine/extensions/plugin-host.js";
import { assertContent } from "../../engine/content.js";
import { MovementRegistry } from "../../engine/movement.js";
import { FieldActionRegistry } from "../../engine/field-actions.js";
import { FieldTerrainRegistry } from "../../engine/field-terrain.js";
import { EMERALD_TERRAIN_RULES } from "./terrain-rules.js";
import { EMERALD_FIELD_ACTIONS, validateFieldLinks } from "./field-actions.js";
import { FIELD_ACTION_EFFECTS } from "../../presentation/field-action-canvas.js";
import { PIXEL_EFFECTS } from "../../presentation/pixel-effects.js";
import { createItemService } from "../../engine/items.js";
import { MoveEffectRegistry } from "../../engine/move-effects.js";
import { EvolutionService } from "../../engine/growth/evolution.js";
import { AttachedRules } from "../../engine/rules/attachments.js";
import { GEN3_ABILITIES } from "../../engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../../engine/rules/gen3/held-items.js";
import { MOVEMENT_MODES, TRAVEL_DESTINATIONS } from "./movement.js";
import { ITEMS } from "./items.js";
/** Content-pack adapter validates extension content using the same domain contracts as built-ins. */
export function createEmeraldPlugins(db, plugins, onError) {
  db = emeraldDatabase(db);
  const resources = Object.fromEntries(
    Object.keys(db.species).map((id) => [
      id + "-front",
      `assets/${id}-front.png`,
    ]),
  );
  const host = new PluginHost({
    permissions: EMERALD_PLUGIN_PERMISSIONS,
    base: {
      ...db,
      resources,
      weather: GEN3_WORLD_WEATHER,
      battleWeather: GEN3_BATTLE_WEATHER,
      learningMethods: EMERALD_LEARNING_METHODS,
      trainers: TRAINERS,
      facilities: EMERALD_FACILITIES,
      facilityActivities: EMERALD_FACILITY_ACTIVITIES,
      items: ITEMS,
      inventoryPockets: GEN3_INVENTORY_POCKETS,
      crops: EMERALD_CROPS,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
      movement: MOVEMENT_MODES,
      movementInputs: GEN3_MOVEMENT_INPUTS,
      fieldActions: EMERALD_FIELD_ACTIONS,
      fieldEffects: EMERALD_FIELD_EFFECTS,
      terrainRules: EMERALD_TERRAIN_RULES,
      fieldMechanisms: EMERALD_FIELD_MECHANISMS,
      destinations: TRAVEL_DESTINATIONS,
    },
    onError,
  });
  host.load(plugins);
  const catalog = host.seal((c) => {
    assertContent({ ...db, ...c });
    const inventory = createEmeraldInventory(c);
    new TimeTaskRegistry(c.timeTasks);
    new CropRegistry(c.crops, { items: c.items });
    validateBerryPlots(c.berryPlots, c);
    new ConditionQueries(c.conditionQueries);
    const forms = new CreatureFormRegistry(
      c.forms,
      c,
      c.abilities,
      c.heldItems,
    );
    const strategies = new BattleStrategyRegistry(c.battleStrategies);
    validateTrainers(c.trainers, c, strategies, inventory);
    new FacilityRegistry({
      definitions: c.facilities,
      activities: c.facilityActivities,
      references: {
        trainers: c.trainers,
        species: c.species,
        items: c.items,
        battleWeather: c.battleWeather,
      },
      queries: new ConditionQueries(c.conditionQueries),
    });
    new EncounterTableRegistry(c.encounters, c);
    validateWorldExtensions(c, host.catalog.entries.values());
    const battleStates = new BattleStateRegistry({
      ...GEN3_BATTLE_STATES,
      ...c.battleStates,
    });
    const visualIds = new Set([
      ...Object.keys(WEATHER_EFFECTS),
      ...host.visualEffects.keys(),
    ]);
    const weather = new WeatherRegistry(c.weather, {
      defaultWeather: "clear",
      battleKinds: c.battleWeather,
      effects: visualIds,
    });
    weather.validateMaps(c.maps);
    const battleWeather = new BattleWeatherRegistry(c.battleWeather);
    for (const d of Object.values(battleWeather.definitions))
      if (d.visual && !visualIds.has(d.visual))
        throw new Error("Unknown battle weather visual");
    const effects = new MoveEffectRegistry({ definitions: c.moveEffects });
    effects.validateMoves(c.moves);
    new BattleAugmentRegistry(c.battleAugments, c, effects);
    battleWeather.validateEffects(effects, [
      ...Object.values(c.abilities),
      ...Object.values(c.heldItems),
      ...Object.values(c.battleStates),
    ]);
    battleStates.validateEffects(effects);
    forms.validateEffects(effects);
    createItemService(c.items);
    new MoveLearningService({
      db: c,
      methods: c.learningMethods,
      items: c.items,
      inventory,
    });
    for (const actor of Object.values(c.actors))
      validateSpriteAnimations(actor);
    new MovementInputRegistry(c.movementInputs).validateMovement(
      new MovementRegistry(c.movement),
    );
    validateItemActions(c.items, new FieldActionRegistry(c.fieldActions));
    new FieldEffectRegistry(c.fieldEffects);
    new FieldTerrainRegistry(c.terrainRules);
    for (const action of Object.values(c.fieldActions))
      if (
        !FIELD_ACTION_EFFECTS[action.cue] &&
        !PIXEL_EFFECTS[action.cue] &&
        !host.visualEffects.has(action.cue)
      )
        throw new Error(`Unknown field action cue ${action.cue}`);
    validateFieldLinks(c.fieldLinks, c);
    new FieldDeviceCatalog({
      mechanisms: c.fieldMechanisms,
      devices: c.fieldDevices,
      maps: c.maps,
      actions: new FieldActionRegistry(c.fieldActions),
    });
    validateEmeraldDeviceContent(c);
    const npcBehaviors = new NPCBehaviorRegistry(c.npcBehaviors, {
      poses: new NPCPoseRegistry(c.npcPoses, { actors: c.actors }),
    });
    new ActorTemplateRegistry(c.actorTemplates, {
      actors: c.actors,
      behaviors: npcBehaviors,
      schedules:new ActorScheduleRegistry(c.actorSchedules,{maps:c.maps,behaviors:npcBehaviors}),
    });
    new EvolutionService({
      inventory,
      db: { ...db, ...c },
      abilities: c.abilities,
      heldItems: c.heldItems,
      conditions: extensionGrowthConditions(c.growthConditions),
    });
    new AttachedRules({
      definitions: {
        ability: c.abilities,
        heldItem: c.heldItems,
        battleState: battleStates.definitions,
      },
      operations: effects.operations,
      owners: () => [],
      context: (c) => c,
    });
    for (const mode of Object.values(c.movement))
      if (!c.actors[mode.actor]) throw new Error("Unknown movement actor");
    for (const [id, resource] of Object.entries(c.resources))
      if (
        typeof resource !== "string" ||
        !/^(assets\/|plugins\/|https:\/\/)/.test(resource) ||
        resource.length > 4096
      )
        throw new Error(`Invalid resource ${id}`);
    for (const definition of host.moveAnimations.values())
      if (!c.moves[definition.moveId])
        throw new Error("Unknown animation move");
    for (const [id, map] of Object.entries(c.maps)) {
      for (const element of map.elements || []) {
        validateTrainerSight(element);
        if (element.trainerId && !c.trainers[element.trainerId])
          throw new Error("Unknown world trainer");
        if (
          element.movement?.mode &&
          !npcBehaviors.definitions.has(element.movement.mode)
        )
          throw new Error("Unknown NPC behavior");
      }
      if (
        (map.elements || []).some(
          (e) =>
            !e.id ||
            !c.actors[e.actor] ||
            !Number.isInteger(e.x) ||
            !Number.isInteger(e.y) ||
            e.x < 0 ||
            e.x >= map.width ||
            e.y < 0 ||
            e.y >= map.height,
        )
      )
        throw new Error(`Invalid map element ${id}`);
    }
  });
  return { host, catalog, db: { ...db, ...catalog } };
}
