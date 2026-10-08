import { ITEM_ICONS } from "../../../../generated/assets/ui/item-icons.js";
import { MACHINES } from "../../../../generated/engine/rules/gen3/machine-learning.js";
/** Formatting and temporary focus only. The application remains the only writer of game state. */
export function itemIconURL(id, resources = {}) {
  const machine = MACHINES[id];
  const key = machine
    ? machine.kind + String(machine.number).padStart(2, "0")
    : id;
  return (
    resources[`${id}-icon`] ||
    ITEM_ICONS[key.replaceAll("_", "")] ||
    "generated/assets/ui/items/none.png"
  );
}
export function monsterIconURL(mon, resources = {}) {
  const id = mon.egg ? "egg" : mon.species;
  return resources[`${id}-icon`] || `generated/assets/${id}-icon.png`;
}
export function playTime(seconds) {
  return `${Math.floor(seconds / 3600)}:${String(Math.floor(seconds / 60) % 60).padStart(2, "0")}`;
}
export function listNavigation(root, doc, selector, direction, horizontal) {
  if ((direction === "left" || direction === "right") && horizontal) {
    horizontal(direction === "left" ? -1 : 1);
    return true;
  }
  const buttons = [...root.querySelectorAll(selector)].filter(
    (b) => !b.disabled && !b.closest?.("[hidden]"),
  );
  if (!buttons.length) return false;
  const index = buttons.indexOf(doc.activeElement),
    delta = direction === "up" || direction === "left" ? -1 : 1;
  const next =
    index < 0
      ? delta < 0
        ? buttons.length - 1
        : 0
      : (index + delta + buttons.length) % buttons.length;
  buttons[next].focus();
  buttons[next].scrollIntoView?.({ block: "nearest" });
  return true;
}
/** Native screens and field windows share a shell, without querying content to guess a page type. */
const screens = new Set([
  "options",
  "party",
  "item-target",
  "box-swap",
  "detail",
  "bag",
  "dex",
  "dex-info",
  "box",
  "trainer",
  "starter",
  "clock",
  "flight",
]);
const overlays = new Set([
  "menu",
  "save",
  "shop",
  "pc",
  "surf",
  "field-action",
  "fishing",
  "story-choice",
]);
export function pageLayout(type) {
  return screens.has(type) ? "screen" : overlays.has(type) ? "field" : "tools";
}

export function bagPockets(pockets) {
  const nativeOrder = ["items", "balls", "machines", "berries", "key"];
  const keys = [
    ...nativeOrder.filter((id) => pockets[id]),
    ...Object.keys(pockets).filter((id) => !nativeOrder.includes(id)),
  ];
  return keys.map((id) => [id, pockets[id]]);
}
export function bagPicture(pocket, gender) {
  return `generated/assets/ui/bag-sprite-${gender}-${["items", "balls", "machines", "berries", "key"].includes(pocket) ? pocket : "items"}.png`;
}

export const BADGE_KEYS = Object.freeze([
  "badgeStone",
  "badgeKnuckle",
  "badgeDynamo",
  "badgeHeat",
  "badgeBalance",
  "badgeFeather",
  "badgeMind",
  "badgeRain",
]);
