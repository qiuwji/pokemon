import { MOVEMENT_MODES, TRAVEL_DESTINATIONS } from "./movement.js";
import { isWater } from "../../engine/terrain.js";
import { GEN3_ABILITIES } from "../../engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../../engine/rules/gen3/held-items.js";
import { validStoryProgress } from "../../engine/story.js";

/** Current Emerald development save contract. Previous envelopes are rejected by SaveStore. */
export function validateSave(s, db) {
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
      !Object.hasOwn(MOVEMENT_MODES, movement.mode) ||
      movement.mode === "run" ||
      !Array.isArray(movement.visited) ||
      new Set(movement.visited).size !== movement.visited.length ||
      movement.visited.some((id) => !Object.hasOwn(TRAVEL_DESTINATIONS, id))
    )
      return false;
    const water = isWater(
      map.behavior[s.position.y * map.width + s.position.x],
    );
    if (
      water !== (movement.mode === "surf") ||
      (map.indoor && movement.mode.endsWith("bike"))
    )
      return false;
  }
  const identities = new Set();
  for (const m of [...s.party, ...s.box]) {
    if (
      !m ||
      typeof m.uid !== "string" ||
      !m.uid ||
      identities.has(m.uid) ||
      !db.species[m.species] ||
      !Object.hasOwn(GEN3_ABILITIES, m.ability) ||
      (m.heldItem != null && !Object.hasOwn(GEN3_HELD_ITEMS, m.heldItem)) ||
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
  if (s.flags.rescued && !s.party.length) return false;
  if (!validStoryProgress(s.story)) return false;
  return Object.values(s.bag).every((v) => Number.isInteger(v) && v >= 0);
}
