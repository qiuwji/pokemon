import { objectSchema } from "../engine/extensions/values.js";
/** Explicit test-environment fixture content; no private game access or arbitrary state editing. */
export function createTestHarness(baseMap) {
  return {
    id: "test-harness", apiVersion: 1, version: "1.0.0", dataVersion: 1,
    permissions: ["reward", "createMonster"],
    setup(api) {
      const map = api.content.register("maps", "room", {
        id: "test-harness:room", title: "自动化测试室", width: 8, height: 8,
        tileset: baseMap.tileset, indoor: true,
        blocks: Array(64).fill(baseMap.blocks[4 * baseMap.width + 5]), behavior: Array(64).fill(0),
        border: baseMap.border, connections: [], npcs: [], signs: [],
        warps: [{ x: 3, y: 7, elevation: 0, dest_map: baseMap.id, dest_warp_id: String(baseMap.warps.length) }],
        elements: [{ id: "test-harness:guide", x: 3, y: 3, actor: "Boy1", dir: "down",
          kind: "talk", name: "测试员", text: "测试", movement: { mode: "still", rangeX: 0, rangeY: 0 } }],
      });
      api.content.register("mapExtensions", "entrance", { map: baseMap.id,
        warps: [{ x: 12, y: 9, elevation: 0, dest_map: map, dest_warp_id: "0" }],
      });
      api.story.registerBundle("dialogue", { version: 1,
        scripts: { guide: { commands: [
          { type: "dialog", name: "测试员", lines: ["这是自动化测试室。"] },
          { type: "choice", name: "测试员", prompt: "领取测试奖励吗？", cancel: "leave", options: [
            { id: "yes", label: "领取", commands: [{ type: "reward", id: "test-harness:dialogue-gift", money: 10 }] },
            { id: "leave", label: "离开", commands: [] },
          ] },
        ] } }, entries: { guide: { trigger: "interact", selector: { objectId: "test-harness:guide" }, script: "guide" } },
      });
      api.actions.register("prepare", { network: true, schema: objectSchema(), run(ctx) {
        if (ctx.query().story.rewards.includes("test-harness:prepare")) return { prepared: false, reason: "already-prepared" };
        ctx.intent({ kind: "reward", reward: { id: "test-harness:prepare", items: { potion: 3, pokeball: 5 } } });
        ctx.intent({ kind: "createMonster", species: "treecko", level: 15, placement: "party" });
        ctx.store.set("prepared", true);
        return { prepared: true };
      } });
      api.queries.register("report", { network: true, schema: objectSchema(), read(view) {
        const q = view.query();
        return { prepared: view.store.get("prepared") === true, location: q.position,
          receivedGift: q.story.rewards.includes("test-harness:dialogue-gift"),
          partyCount: q.party.length, potions: q.bag.potion || 0, room: map };
      } });
    },
  };
}
