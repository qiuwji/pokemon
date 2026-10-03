/** Project burst example: no core imports; not a full generation-specific Z-Move ruleset. */
export const battleBurst = {
  id: "battle-burst",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: ["battle"],
  setup(api) {
    const move = api.content.register("moves", "burst", {
      name: "爆发示例",
      power: 100,
      accuracy: 0,
      pp: 1,
      type: "normal",
      effect: "hit",
      priority: 1,
      chance: 0,
      target: "selected",
      contact: false,
    });
    api.content.register("battleAugments", "burst", {
      name: "招式爆发",
      moves: [move],
      select: () => move,
      requires: (context) =>
        context.sourceMove.power > 0 && context.actor.hp > 0,
      limit: { scope: "controller", max: 1 },
      cost: { pp: 1 },
    });
    api.presentation.battle("burst-cue", {
      kind: "augment",
      match: { augmentId: "battle-burst:burst" },
      mode: "append",
      priority: 0,
      animation: {
        duration: 320,
        tracks: [{ effect: "status", anchor: "actor", start: 0, end: 1 }],
      },
    });
  },
};
