import { PluginState } from "../../engine/extensions/plugin-state.js";
import { readOnly, localId } from "../../engine/extensions/values.js";
import { jsonValue, callSync } from "../../engine/extensions/values.js";
import { MOVEMENT_MODES, TRAVEL_DESTINATIONS } from "./movement.js";
import { isWater } from "../../engine/terrain.js";
import { GEN3_ABILITIES } from "../../engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../../engine/rules/gen3/held-items.js";
import { validStoryProgress } from "../../engine/story.js";

/** Current Emerald development save contract. Previous envelopes are rejected by SaveStore. */
export function validateSave(
  s,
  db,
  catalog = {
    abilities: GEN3_ABILITIES,
    heldItems: GEN3_HELD_ITEMS,
    movement: MOVEMENT_MODES,
    destinations: TRAVEL_DESTINATIONS,
  },
  plugins = null,
) {
  try {
    if (s?.extensions !== undefined) jsonValue(s.extensions, 1024 * 1024);
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
      if (
        manifest &&
        record.version !== manifest.dataVersion &&
        manifest.migrate
      ) {
        const migrated = jsonValue(
          callSync(manifest.migrate, [readOnly(record), manifest.dataVersion]),
        );
        if (migrated.version !== manifest.dataVersion) return false;
        s.extensions[owner] = migrated;
        new PluginState(plugins.states).validate(migrated, owner);
        callSync(manifest.validateData, [readOnly(migrated.data)]);
        continue;
      }
      if (manifest && record.version === manifest.dataVersion) {
        new PluginState(plugins.states).validate(record, owner);
        callSync(manifest.validateData, [readOnly(record.data)]);
      } else if (manifest && typeof manifest.migrate !== "function")
        return false;
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
    !Number.isInteger(s.money) ||
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
    if (
      (catalog.movement[movement.mode].surface === "both"
        ? false
        : water !==
          (catalog.movement[movement.mode].surface === "water" ||
            movement.mode === "surf")) ||
      (map.indoor && movement.mode.endsWith("bike"))
    )
      return false;
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
      !m ||
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
  if (s.daycare?.egg && !s.daycare.egg.egg) return false;
  if (s.flags.rescued && !s.party.some((m) => !m.egg)) return false;
  if (!validStoryProgress(s.story)) return false;
  return Object.values(s.bag).every((v) => Number.isInteger(v) && v >= 0);
}
