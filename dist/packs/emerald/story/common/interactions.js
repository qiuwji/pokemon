import { dialog, talkEvent } from "../helpers.js";
import { healingScene } from "../../scenes.js";
export const COMMON_INTERACTIONS_EVENTS = [
  talkEvent("shop.open", "shop", () => [{ type: "shop" }]),
  ...["heal", "healMom"].map((kind) =>
    talkEvent("healing." + kind, kind, (s, { object }) => healingScene(object)),
  ),
  ...["talk", "rescue"].map((kind) =>
    talkEvent("talk." + kind, kind, (_s, { object }) => [
      // The original object script owns its whole dialogue; the first line is only a projection.
      object.dialogue
        ? dialog(object.dialogue)
        : dialog("emerald:dialogues.common.interactions.1", {
            speaker: object.name,
            line0: object.text,
          }),
    ]),
  ),
  talkEvent("sign.read", "sign", (_s, { object }) => [
    dialog("emerald:dialogues.common.interactions.2", {
      line0: object.text || "此告示脚本尚未转写：" + object.script,
    }),
  ]),
].map((event) => ({ ...event, priority: -100 }));
