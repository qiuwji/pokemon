import { matchesCondition, validateCondition } from "../../engine/conditions.js";
import { openingObjects } from "./opening-objects.js";
import { NATIVE_CAST } from "./native-cast-data.js";

/** Project pack data into cast roles; native-object-bindings owns source identity and placement. */
export function projectNativeCast(definitions, state, dialogues) {
  // Native visibility flags historically test presence (starter stores a species ID).
  const visibility = { ...state, flags: Object.fromEntries(Object.entries(state.flags).map(([id, value]) => [id, !!value])) };
  return definitions.filter(d => matchesCondition(d.when, visibility)).map(d => {
    const { when: _when, variants = [], gender = {}, dialogueId, ...base } = d;
    const object = { ...structuredClone(base), ...structuredClone(gender[state.playerGender] || {}) };
    for (const variant of variants)
      if (matchesCondition(variant.when, visibility)) Object.assign(object, structuredClone(variant.changes));
    if (dialogueId === undefined) return object;
    const dialogue = dialogues[dialogueId];
    if (!dialogue) throw new Error(`Unknown native NPC dialogue: ${dialogueId}`);
    return { ...object, name: dialogue.name, text: dialogue.lines[0], dialogue: `emerald:dialogues.${dialogueId}`, dir: "down" };
  });
}

export function nativeCast(state, db) {
  return openingObjects(state) ?? projectNativeCast(
    NATIVE_CAST[state.position.map] || [], state, db.stories.dialogues.dialogues,
  );
}

/** Validate all definitions at assembly, including currently invisible roles. */
export function validateNativeCast(db) {
  for (const [map, definitions] of Object.entries(NATIVE_CAST)) {
    if (!db.maps[map]) throw new Error(`Unknown native cast map: ${map}`);
    for (const d of definitions) {
      validateCondition(d.when);
      for (const variant of d.variants || []) validateCondition(variant.when);
      for (const placement of [d.placement, ...(d.variants || []).map(v => v.changes.placement)].filter(Boolean))
        if (!Number.isInteger(placement.x) || !Number.isInteger(placement.y) ||
          placement.x < 0 || placement.y < 0 || placement.x >= db.maps[map].width || placement.y >= db.maps[map].height)
          throw new Error(`Invalid native entry placement: ${map}/${d.id}`);
      for (const actor of [d.actor, ...Object.values(d.gender || {}).map(v => v.actor), ...(d.variants || []).map(v => v.changes.actor)].filter(Boolean))
        if (!db.actors[actor]) throw new Error(`Unknown native cast actor: ${map}/${actor}`);
      if (d.dialogueId !== undefined && !db.stories.dialogues.dialogues[d.dialogueId])
        throw new Error(`Unknown native NPC dialogue: ${d.dialogueId}`);
    }
  }
}
