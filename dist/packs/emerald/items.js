import { HELD_ITEMS } from "./held-items.js";
import { DEFAULT_ITEMS } from "../../engine/items.js";
export const ITEMS = {
  ...HELD_ITEMS,
  pokeball: {
    ...DEFAULT_ITEMS.pokeball,
    icon: "◉",
    purchaseRequires: { flag: "pokedex" },
    description: "捕捉野生宝可梦。降低对方体力更容易成功。",
  },
  potion: {
    ...DEFAULT_ITEMS.potion,
    icon: "✚",
    description: "为一只宝可梦恢复 20 点 HP。",
  },
  super_potion: {
    name: "好伤药",
    price: 700,
    icon: "✚",
    contexts: ["field", "battle"],
    target: "party",
    effects: [{ op: "restoreHP", amount: 50 }],
    description: "为一只宝可梦恢复 50 点 HP。",
  },
  antidote: {
    name: "解毒药",
    price: 100,
    icon: "✚",
    contexts: ["field", "battle"],
    target: "party",
    effects: [{ op: "cureStatus", status: "poison" }],
    description: "解除一只宝可梦的中毒状态。",
  },
  great_ball: {
    name: "超级球",
    price: 600,
    icon: "◉",
    contexts: ["battle"],
    target: "enemy",
    effects: [{ op: "capture", bonus: 1.5 }],
    purchaseRequires: { flag: "pokedex" },
    description: "比精灵球更容易捕捉野生宝可梦。",
  },
};
