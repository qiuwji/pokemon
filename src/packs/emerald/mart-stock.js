import { readOnly } from "../../engine/extensions/values.js";

// Native clerk lists from the four imported *_Mart/scripts.inc files.
// FLAG_MET_DEVON_EMPLOYEE is the Route116 Repeat Ball meeting, not the Woods rescue.
export const EMERALD_MARTS = readOnly({
  OldaleTown_Mart: {
    basic: ["potion", "antidote", "paralyze_heal", "awakening"],
    expandedFlag: "pokedex",
    expanded: ["pokeball", "potion", "antidote", "paralyze_heal", "awakening"],
  },
  PetalburgCity_Mart: {
    basic: ["pokeball", "potion", "antidote", "paralyze_heal", "awakening", "escape_rope", "repel", "x_speed", "x_attack", "x_defend", "orange_mail"],
    expandedFlag: "petalburgMartExpanded",
    expanded: ["pokeball", "great_ball", "potion", "super_potion", "antidote", "paralyze_heal", "awakening", "escape_rope", "repel", "x_speed", "x_attack", "x_defend", "orange_mail"],
  },
  RustboroCity_Mart: {
    basic: ["pokeball", "potion", "super_potion", "antidote", "paralyze_heal", "escape_rope", "repel", "x_speed", "x_attack", "x_defend"],
    expandedFlag: "metDevonEmployee",
    expanded: ["pokeball", "timer_ball", "repeat_ball", "potion", "super_potion", "antidote", "paralyze_heal", "escape_rope", "repel", "x_speed", "x_attack", "x_defend"],
  },
  SlateportCity_Mart: {
    basic: ["pokeball", "great_ball", "potion", "super_potion", "antidote", "paralyze_heal", "escape_rope", "repel", "harbor_mail"],
  },
});

/** Null leaves the existing shop policy available to other content/plugin shops. */
export function emeraldMartStock(state) {
  const shop = EMERALD_MARTS[state.position?.map];
  if (!shop) return null;
  return shop.expandedFlag && state.flags[shop.expandedFlag] ? shop.expanded : shop.basic;
}
