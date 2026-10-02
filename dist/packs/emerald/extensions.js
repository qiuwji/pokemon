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
      trainers: TRAINERS,
      items: ITEMS,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
      movement: MOVEMENT_MODES,
      destinations: TRAVEL_DESTINATIONS,
    },
    onError,
  });
  host.load(plugins);
  const catalog = host.seal((c) => {
    assertContent({ ...db, ...c });
    new ConditionQueries(c.conditionQueries);
    const strategies = new BattleStrategyRegistry(c.battleStrategies);
    validateTrainers(c.trainers, c, strategies);
    new EncounterTableRegistry(c.encounters, c);
    validateWorldExtensions(c, host.catalog.entries.values());
    const battleStates = new BattleStateRegistry({
      ...GEN3_BATTLE_STATES,
      ...c.battleStates,
    });
    const effects = new MoveEffectRegistry({ definitions: c.moveEffects });
    effects.validateMoves(c.moves);
    battleStates.validateEffects(effects);
    createItemService(c.items);
    new MovementRegistry(c.movement);
    const npcBehaviors = new NPCBehaviorRegistry(c.npcBehaviors);
    new EvolutionService({
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
        map.presentation?.weather &&
        !["rain", "sun", "sand", "hail"].includes(map.presentation.weather)
      )
        throw new Error("Unknown field weather");
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
