import { validItemShortcut } from "../../engine/item-shortcut.js";
import { WeatherRegistry, WorldWeather } from "../../engine/weather.js";
import {
  GEN3_WORLD_WEATHER,
  GEN3_BATTLE_WEATHER,
} from "../../engine/rules/gen3/weather.js";
import { emeraldDatabase } from "./database.js";
import {
  FieldDeviceCatalog,
  FieldDevices,
} from "../../engine/field-devices.js";
import { FieldActionRegistry } from "../../engine/field-actions.js";
import { EMERALD_FIELD_ACTIONS } from "./field-actions.js";
import { EMERALD_FIELD_MECHANISMS } from "./field-mechanisms.js";
import { GEN3_ELEVATION } from "../../engine/rules/gen3/elevation.js";
import { NPCPoseRegistry } from "../../engine/npc-poses.js";
import {
  ActorRepository,
  ActorTemplateRegistry,
} from "../../engine/actor-repository.js";
import { NPCBehaviorRegistry } from "../../engine/npc-behaviors.js";
import { CropRegistry, CropService } from "../../engine/crop-growth.js";
import {
  EMERALD_CROPS,
  EMERALD_CROP_POLICY,
  emeraldBerryYield,
} from "./berries.js";
import { validateWorldClock } from "../../engine/world-clock.js";
import {
  WorldSchedule,
  TimeTaskRegistry,
} from "../../engine/world-schedule.js";
import {
  CreatureFormRegistry,
  CreatureForms,
} from "../../engine/creatures/forms.js";
import { WorldStateService } from "../../engine/world-state.js";
import { validCreatureValues } from "../../engine/creature-contract.js";
import { PluginState } from "../../engine/extensions/plugin-state.js";
import { readOnly, localId } from "../../engine/extensions/values.js";
import { jsonValue, callSync } from "../../engine/extensions/values.js";
import { MOVEMENT_MODES, TRAVEL_DESTINATIONS } from "./movement.js";
import { emeraldFieldCapabilities } from "./field-capabilities.js";
import { isWater } from "../../engine/terrain.js";
import { movementFitsMap } from "../../engine/movement.js";
import { ITEMS } from "./items.js";
import { GEN3_ABILITIES } from "../../engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../../engine/rules/gen3/held-items.js";
import { validStoryProgress } from "../../engine/story.js";

/** Current Emerald development save contract. Previous envelopes are rejected by SaveStore. */
export function validateSave(
  s,
  db,
  catalog = {
    items: ITEMS,
    abilities: GEN3_ABILITIES,
    heldItems: GEN3_HELD_ITEMS,
    movement: MOVEMENT_MODES,
    destinations: TRAVEL_DESTINATIONS,
  },
  plugins = null,
) {
  try {
    jsonValue(s, 2 * 1024 * 1024);
    if (!validItemShortcut(s.registeredItem, catalog.items)) return false;
    db = emeraldDatabase(db);
    new WorldWeather({
      state: s.weather,
      maps: db.maps,
      registry: new WeatherRegistry(catalog.weather || GEN3_WORLD_WEATHER, {
        defaultWeather: "clear",
        battleKinds: catalog.battleWeather || GEN3_BATTLE_WEATHER,
      }),
    });
    if (s.weather.active && s.weather.active.map !== s.position?.map)
      return false;
    GEN3_ELEVATION.validate(s.position || {});
    if (s.devices !== undefined)
      new FieldDevices({
        state: s.devices,
        catalog: new FieldDeviceCatalog({
          mechanisms: catalog.fieldMechanisms || EMERALD_FIELD_MECHANISMS,
          devices: catalog.fieldDevices,
          maps: db.maps,
          actions: new FieldActionRegistry(
            catalog.fieldActions || EMERALD_FIELD_ACTIONS,
          ),
        }),
      });
    if (s.actors !== undefined)
      new ActorRepository({
        state: s.actors,
        maps: db.maps,
        elevation: GEN3_ELEVATION,
        registry: new ActorTemplateRegistry(catalog.actorTemplates, {
          actors: db.actors,
          behaviors: new NPCBehaviorRegistry(catalog.npcBehaviors, {
            poses: new NPCPoseRegistry(catalog.npcPoses, { actors: db.actors }),
          }),
        }),
      });
    if (s.clock !== undefined) {
      validateWorldClock(s.clock);
      if (s.playSeconds !== Math.floor(s.clock.playMs / 1000)) return false;
    }
    if (s.crops !== undefined) {
      new CropService({
        registry: new CropRegistry(catalog.crops || EMERALD_CROPS, {
          items: catalog.items,
        }),
        state: s.crops,
        policy: EMERALD_CROP_POLICY,
        calculateYield: emeraldBerryYield,
      });
      if (Object.keys(s.crops.trees).some((id) => !catalog.berryPlots?.[id]))
        return false;
    }
    if (s.schedule !== undefined)
      new WorldSchedule({
        state: s.schedule,
        registry: new TimeTaskRegistry(catalog.timeTasks),
      });
    if (s.forms !== undefined)
      new CreatureForms({
        registry: new CreatureFormRegistry(
          catalog.forms,
          db,
          catalog.abilities,
          catalog.heldItems,
        ),
        records: s.forms,
        creatures: () => [
          ...(s.party || []),
          ...(s.box || []),
          ...(s.daycare?.slots || []).map((s) => s.mon),
          ...(s.daycare?.egg ? [s.daycare.egg] : []),
        ],
      });
    if (
      [
        ...Object.values(s.worldState?.maps || {}),
        ...Object.values(s.worldState?.visits || {}),
      ].some((m) =>
        Object.keys(m.objects || {}).some((id) => /^core:actor\.\d+$/.test(id)),
      )
    )
      return false;
    if (s.worldState !== undefined)
      new WorldStateService({ db, state: s.worldState });
  } catch {
    return false;
  }
  try {
    for (const [owner, record] of Object.entries(s?.extensions || {})) {
      if (
        !localId(owner) ||
        !Number.isInteger(record.version) ||
        !record.data ||
        !record.states ||
        typeof record.data !== "object" ||
        typeof record.states !== "object" ||
        Array.isArray(record.data) ||
        Array.isArray(record.states)
      )
        return false;
      const manifest = plugins?.manifests.get(owner);
      if (manifest) {
        if (record.version !== manifest.dataVersion) return false;
        new PluginState(plugins.states).validate(record, owner);
        callSync(manifest.validateData, [readOnly(record.data)]);
      }
    }
  } catch {
    return false;
  }
  if (
    s?.contentDependencies !== undefined &&
    (!Array.isArray(s.contentDependencies) ||
      s.contentDependencies.some((id) => !plugins?.manifests.has(id)))
  )
    return false;
  if (
    !s ||
    !db.maps[s.position?.map] ||
    !Number.isInteger(s.position.x) ||
    !Number.isInteger(s.position.y)
  )
    return false;
  const map = db.maps[s.position.map];
  if (
    s.position.x < 0 ||
    s.position.x >= map.width ||
    s.position.y < 0 ||
    s.position.y >= map.height ||
    !["up", "down", "left", "right"].includes(s.position.dir)
  )
    return false;
  if (
    !Array.isArray(s.party) ||
    s.party.length > 6 ||
    !Array.isArray(s.box) ||
    s.box.length > 200 ||
    !s.flags ||
    !s.bag ||
    !Number.isSafeInteger(s.money) ||
    s.money < 0 ||
    !Array.isArray(s.seen) ||
    (s.friendshipSteps !== undefined &&
      (!Number.isInteger(s.friendshipSteps) ||
        s.friendshipSteps < 0 ||
        s.friendshipSteps >= 128)) ||
    !Array.isArray(s.caught)
  )
    return false;
  if (s.movement !== undefined) {
    const movement = s.movement;
    if (
      !movement ||
      !Object.hasOwn(catalog.movement, movement.mode) ||
      movement.mode === "run" ||
      !Array.isArray(movement.visited) ||
      new Set(movement.visited).size !== movement.visited.length ||
      movement.visited.some((id) => !Object.hasOwn(catalog.destinations, id))
    )
      return false;
    const water = isWater(
      map.behavior[s.position.y * map.width + s.position.x],
    );
    try {
      if (
        (catalog.movement[movement.mode].surface === "both"
          ? false
          : water !==
            (catalog.movement[movement.mode].surface === "water" ||
              movement.mode === "surf")) ||
        callSync(catalog.movement[movement.mode].allowed, [
          readOnly({
            map,
            scripted: false,
            capabilities: emeraldFieldCapabilities(s),
          }),
        ]) !== true
      )
        return false;
    } catch {
      return false;
    }
    if (!movementFitsMap(catalog.movement[movement.mode], map)) return false;
  }
  if (
    s.growth !== undefined &&
    (!Number.isInteger(s.growth.hatchTick) ||
      s.growth.hatchTick < 0 ||
      s.growth.hatchTick > 255)
  )
    return false;
  if (
    s.daycare !== undefined &&
    (!s.daycare ||
      !Array.isArray(s.daycare.slots) ||
      s.daycare.slots.length > 2 ||
      !Number.isInteger(s.daycare.steps) ||
      s.daycare.steps < 0 ||
      s.daycare.steps > 255 ||
      s.daycare.slots.some(
        (slot) =>
          !slot.mon ||
          slot.mon.egg ||
          !Number.isInteger(slot.steps) ||
          slot.steps < 0 ||
          slot.steps > 0xffffffff ||
          !Number.isInteger(slot.initialLevel) ||
          slot.initialLevel !== slot.mon.level,
      ))
  )
    return false;
  if (
    s.tradePartner !== undefined &&
    (!Array.isArray(s.tradePartner) || s.tradePartner.length > 6)
  )
    return false;
  const owned = [
    ...s.party,
    ...s.box,
    ...(s.daycare?.slots.map((slot) => slot.mon) || []),
    ...(s.daycare?.egg ? [s.daycare.egg] : []),
    ...(s.tradePartner || []),
  ];
  const identities = new Set();
  for (const m of owned) {
    if (
      !validCreatureValues(m) ||
      typeof m.uid !== "string" ||
      !m.uid ||
      identities.has(m.uid) ||
      !db.species[m.species] ||
      !Object.hasOwn(catalog.abilities, m.ability) ||
      (m.heldItem != null && !Object.hasOwn(catalog.heldItems, m.heldItem)) ||
      (m.friendship !== undefined &&
        (!Number.isInteger(m.friendship) ||
          m.friendship < 0 ||
          m.friendship > 255)) ||
      !Number.isInteger(m.level) ||
      m.level < 1 ||
      m.level > 100 ||
      !m.stats ||
      !Number.isInteger(m.stats.hp) ||
      m.stats.hp <= 0 ||
      !Number.isInteger(m.hp) ||
      m.hp < 0 ||
      m.hp > m.stats.hp ||
      (m.egg &&
        (!Number.isInteger(m.egg.cycles) ||
          m.egg.cycles < 0 ||
          m.egg.cycles > 255 ||
          typeof m.egg.ready !== "boolean" ||
          !Array.isArray(m.egg.parents) ||
          m.egg.parents.length !== 2 ||
          m.egg.parents.some((id) => typeof id !== "string" || !id) ||
          m.heldItem != null ||
          m.status != null)) ||
      (m.pendingEvolution !== undefined && m.pendingEvolution !== m.level) ||
      m.pendingMoves?.some((id) => !db.moves[id]) ||
      ["cool", "beauty", "cute", "smart", "tough", "sheen"].some(
        (key) =>
          m[key] !== undefined &&
          (!Number.isInteger(m[key]) || m[key] < 0 || m[key] > 255),
      ) ||
      !m.iv ||
      !m.ev ||
      !Array.isArray(m.moves) ||
      m.moves.length > 4 ||
      m.moves.some(
        (v) =>
          !db.moves[v.id] ||
          !Number.isInteger(v.pp) ||
          v.pp < 0 ||
          v.pp > db.moves[v.id].pp,
      )
    )
      return false;
    identities.add(m.uid);
  }
  for (const mon of owned)
    if (
      mon.growthCompanions?.some(
        (uid) => uid === mon.uid || !identities.has(uid),
      )
    )
      return false;
  if (
    s.seen.some((id) => !db.species[id]) ||
    s.caught.some((id) => !db.species[id] || !s.seen.includes(id)) ||
    new Set(s.seen).size !== s.seen.length ||
    new Set(s.caught).size !== s.caught.length
  )
    return false;
  if (s.daycare?.egg && !s.daycare.egg.egg) return false;
  if (s.flags.rescued && !s.party.some((m) => !m.egg)) return false;
  if (!validStoryProgress(s.story)) return false;
  return Object.entries(s.bag).every(
    ([id, v]) =>
      (v === 0 || Object.hasOwn(catalog.items || db.items || {}, id)) &&
      Number.isSafeInteger(v) &&
      v >= 0,
  );
}
