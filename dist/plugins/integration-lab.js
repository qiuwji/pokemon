import { objectSchema } from "../engine/extensions/values.js";

/** Optional integration example: authored entirely through public content/story/query ports. */
export function createIntegrationLab(baseMap) {
  const room = "integration-lab:room",
    gate = "integration-lab:gate",
    guide = "integration-lab:guide",
    opponent = "integration-lab:opponent",
    lever = "integration-lab:lever",
    trainer = "integration-lab:researcher",
    prize = `trainer.${trainer}.prize`;
  return {
    id: "integration-lab",
    apiVersion: 1,
    version: "1.0.0",
    dataVersion: 1,
    permissions: [],
    setup(api) {
      const floor = baseMap.blocks[8 * baseMap.width + 10],
        marker = baseMap.blocks.find(
          (b) => ((b >> 10) & 3) === 0 && (b & 1023) !== (floor & 1023),
        ),
        blocks = Array.from({ length: 64 }, (_, i) => {
          const x = i % 8,
            y = Math.floor(i / 8);
          return x === 0 || x === 7 || y === 0 || y === 7 || y === 4
            ? floor | 1024
            : floor;
        });
      blocks[7 * 8 + 3] = floor;
      blocks[4 * 8 + 3] = floor;
      blocks[5 * 8 + 1] = ((marker ?? floor) & 1023) | (floor & 61440);
      api.content.register("maps", "room", {
        id: room,
        title: "组合接口研究区",
        width: 8,
        height: 8,
        tileset: baseMap.tileset,
        indoor: true,
        blocks,
        behavior: Array(64).fill(0),
        border: baseMap.border,
        connections: [],
        npcs: [],
        signs: [],
        warps: [
          {
            x: 3,
            y: 7,
            elevation: 0,
            dest_map: baseMap.id,
            dest_warp_id: String(baseMap.warps.length),
          },
        ],
        elements: [
          {
            id: gate,
            x: 3,
            y: 4,
            actor: "BirchsBag",
            dir: "down",
            kind: "obstacle",
          },
          {
            id: guide,
            x: 5,
            y: 5,
            actor: "Boy1",
            dir: "left",
            kind: "talk",
            name: "向导",
            text: "异色地格是开关。",
          },
          {
            id: opponent,
            x: 3,
            y: 2,
            actor: "Youngster",
            dir: "down",
            kind: "talk",
            name: "研究员",
            text: "完成挑战后领取研究点心。",
          },
        ],
      });
      api.content.register("mapExtensions", "entrance", {
        map: baseMap.id,
        warps: [
          { x: 10, y: 8, elevation: 0, dest_map: room, dest_warp_id: "0" },
        ],
      });
      const mechanism = api.content.register("fieldMechanisms", "open-gate", {
        scope: "permanent",
        schema: objectSchema({ open: { type: "boolean" } }, ["open"]),
        initialState: { open: false },
        interact: () => ({
          state: { open: true },
          operations: [{ kind: "object", map: room, id: gate, hidden: true }],
          facts: [{ kind: "gate-opened", data: {} }],
        }),
      });
      api.content.register("fieldDevices", "lever", {
        map: room,
        x: 1,
        y: 5,
        mechanism,
      });
      const open = api.content.register("conditionQueries", "gate-open", {
        schema: objectSchema(),
        read: () => api.query().devices.records[lever]?.open ?? false,
      });
      const biscuit = api.content.register("items", "biscuit", {
        name: "研究点心",
        price: 0,
        contexts: ["field"],
        target: "party",
        effects: [{ op: "restoreHP", amount: 10 }],
        icon: "◇",
        description: "组合接口挑战的一次性奖励。",
      });
      const strategy = api.content.register("battleStrategies", "first-move", {
        decide: (v) =>
          v.candidates.findIndex((a) => a.kind === "move" && a.index === 0),
      });
      api.content.register("trainers", "researcher", {
        name: "研究员",
        script: trainer,
        prize: 120,
        strategy,
        party: [
          { species: "zigzagoon", level: 2, moves: ["tackle"] },
          { species: "poochyena", level: 2, moves: ["tackle"] },
        ],
      });
      api.story.register("guide", {
        trigger: "interact",
        match: ({ object }) => object?.id === guide,
        commands: [
          {
            type: "if",
            condition: {
              compare: { query: { id: open }, op: "eq", value: true },
            },
            then: [
              {
                type: "dialog",
                name: "向导",
                lines: ["通道已打开，可以挑战北侧研究员。"],
              },
            ],
            else: [
              {
                type: "dialog",
                name: "向导",
                lines: ["先面向西侧异色地格确认，打开通道。"],
              },
            ],
          },
        ],
      });
      api.story.register("challenge", {
        trigger: "interact",
        match: ({ object }) => object?.id === opponent,
        requires: { not: { reward: prize } },
        commands: [
          {
            type: "choice",
            name: "研究员",
            prompt: "开始两只伙伴的训练家挑战？",
            variable: "integration-lab.choice",
            cancel: "later",
            options: [
              {
                id: "challenge",
                label: "开始",
                commands: [{ type: "battle", trainerId: trainer }],
              },
              { id: "later", label: "稍后", commands: [] },
            ],
          },
        ],
      });
      api.story.register("victory", {
        trigger: "battleResult",
        once: true,
        match: ({ battle }) =>
          battle.trainerId === trainer && battle.result === "win",
        commands: [
          {
            type: "dialog",
            name: "研究员",
            lines: ["挑战完成，研究点心送给你。"],
          },
          { type: "reward", id: prize, money: 120, items: { [biscuit]: 1 } },
        ],
      });
      api.story.register("finished", {
        trigger: "interact",
        match: ({ object }) => object?.id === opponent,
        requires: { reward: prize },
        commands: [
          { type: "dialog", name: "研究员", lines: ["这次挑战已经完成。"] },
        ],
      });
      api.ui.hud("directions", {
        when: (v) => v.query().position.map === room,
        render: (v) => ({
          kind: "text",
          text: v.query().devices.records[lever]?.open
            ? "◇ 通道已打开，北侧研究员提供挑战。"
            : "◇ 面向西侧异色格确认开启通道；东侧向导提供说明。",
        }),
      });
    },
  };
}
