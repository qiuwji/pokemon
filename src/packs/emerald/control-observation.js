import { objectCapabilities } from "../../engine/world-object-index.js";
import { matchesCondition } from "../../engine/conditions.js";
import { NATURES } from "./pack.js";
/** Read projections only: catalog joins do not calculate or mutate battle rules. */
export function moveDetails(slot, db) {
  const m = db.moves[slot.id];
  return { id: slot.id, name: m.name, type: m.type, power: m.power ?? null,
    accuracy: m.accuracy ?? null, priority: m.priority ?? 0, pp: slot.pp ?? null,
    maxPP: m.pp, target: m.target ?? null, effect: m.effect ?? null };
}
export function monsterDetails(mon, db, effective = mon) {
  const species = db.species[effective.species];
  return { uid: mon.uid, species: effective.species, name: species.name, level: mon.level,
    gender: mon.gender, hp: effective.hp, maxHP: effective.stats.hp, stats: { ...effective.stats },
    types: [...(effective.types || species.types)], status: mon.status || null,
    ability: effective.ability ?? mon.ability, heldItem: mon.heldItem,
    iv: { ...mon.iv }, ev: { ...mon.ev }, nature: mon.nature, natureName: NATURES[mon.nature],
    exp: mon.exp, friendship: mon.friendship, egg: mon.egg || null,
    moves: effective.moves.map(slot => moveDetails(slot, db)) };
}
export function taskDetails(story, state) {
  const tasks = story.quests.map(q => ({ id: q.id, title: q.title, description: q.description,
    status: q.complete && matchesCondition(q.complete, state, story.queries) ? "completed" :
      matchesCondition(q.requires, state, story.queries) ? "available" : "locked",
    destination: q.destination || null,
    objectives: (q.objectives || []).map(o => ({ id: o.id, description: o.description,
      complete: matchesCondition(o.complete, state, story.queries), destination: o.destination || null })) }));
  return { current: tasks.find(t => t.id === story.quest(state)?.id) || null,
    remaining: tasks.filter(t => t.status !== "completed"), completed: tasks.filter(t => t.status === "completed").map(t => t.id) };
}
export function bagDetails(counts, definitions, options) {
  return Object.entries(counts).filter(([, count]) => count > 0).map(([id, count]) => {
    const item = definitions[id];
    return { id, count, name: item.name, description: item.description || "",
      pocket: item.pocket || "items", keyItem: item.pocket === "key",
      battleUsable: item.contexts?.includes("battle") || false,
      fieldUsable: item.contexts?.includes("field") || false, target: item.target ?? null,
      actions: options(id) };
  });
}
export function objectDetails(o, { world, story, state, talked, frontId }) {
  // Runtime occupants can contain optional undefined fields; plugin matchers receive JSON data only.
  const object = JSON.parse(JSON.stringify(o));
  const candidates = story.candidates("interact", state, { map: state.position.map, object, mapTitle: world.map.title });
  const canTalk = candidates.length > 0 || !!o.trainerId;
  return { id: o.id, name: o.name || o.kind || o.id || "对象", kind: o.kind || "npc", x: o.x, y: o.y, dir: o.dir || null,
    actor: o.actor || null, script: o.script || null, dialogue: o.dialogue || null,
    capabilities: objectCapabilities(o), canTalk,
    canInteract: canTalk || ["berryPlot", "daycare"].includes(o.kind),
    interactionReason: canTalk ? null : "no-active-dialogue",
    talkedBefore: talked(o.id), blocksMovement: o.kind !== "sign" && world.occupied(world.map, o, o.x, o.y),
    inFront: frontId === o.id,
    distance: Math.abs(o.x - state.position.x) + Math.abs(o.y - state.position.y) };
}
export function battleDetails(battle, db) {
  if (!battle) return null;
  const snapshot = battle.snapshot();
  return { ...snapshot, information: "complete-local-state",
    combatants: snapshot.combatants.map(seat => {
      const mon = battle.roster.occupant(seat.seatId);
      return { ...seat, monster: mon ? { ...monsterDetails(mon, db, battle.forms.effective(mon)), ...seat.monster,
        stats: { ...battle.forms.effective(mon).stats } } : null };
    }) };
}
