import { emptyStoryProgress } from "../../engine/story.js";
import { ITEMS } from "./items.js";
/** Seed ledgers from legacy flags: old gifts must never be granted a second time. */
export const SAVE_MIGRATIONS = {
  1: (state) => {
    state.story = emptyStoryProgress();
    for (const [flag, event, reward] of [
      ["heardBirch", "rescue.intro"],
      ["rescued", "rescue.return"],
      ["rivalWon", "rival.victory", "rival.prize"],
      ["pokedex", "professor.pokedex", "professor.pokedex"],
      ["potionGift", "shop.gift", "shop.gift"],
    ])
      if (state.flags[flag]) {
        state.story.completed.push(event);
        if (reward) state.story.rewards.push(reward);
      }
    for (const id of Object.keys(ITEMS)) state.bag[id] ??= 0;
    return state;
  },
};
