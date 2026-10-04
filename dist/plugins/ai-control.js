import { objectSchema } from "../engine/extensions/values.js";
const creature = m => ({ uid: m.uid, species: m.species, name: m.name, level: m.level,
  hp: m.hp, maxHP: m.stats.hp, status: m.status || null,
  moves: m.moves.map(move => ({ ...move })) });
/** Default observer. Control uses the existing network-enabled application commands. */
export const aiControl = {
  id: "ai-control", apiVersion: 1, version: "1.0.0", dataVersion: 1, permissions: [],
  setup(api) {
    api.queries.register("observe", {
      network: true,
      schema: objectSchema({ detail: { type: "string", enum: ["summary", "world", "battle", "all"] } }),
      read(view, { detail = "summary" }) {
        const q = view.query();
        return { protocol: 1, busy: q.busy, position: q.position, ui: q.control.ui,
          party: q.party.map(creature), money: q.money, time: q.time,
          battle: q.battle, pendingStory: q.story.session || null,
          ...(detail === "world" || detail === "all" ? {
            field: q.control.field, objects: q.objects, actors: q.actors, movement: q.movement,
            weather: q.weather, fieldActions: q.fieldActions, encounters: q.encounters,
          } : {}),
          ...(detail === "all" ? { flags: q.flags, bag: q.bag, story: q.story } : {}),
        };
      },
    });
    api.queries.register("commands", { network: true, schema: objectSchema(),
      read: view => ({ commands: view.query().control.commands,
        observe: "ai-control:observe", grid: "core.world.cells", input: "core.ui.input" }),
    });
    const page = api.ui.page("guide", { title: "AI 操作接口", render: () => ({ kind: "panel", children: [
      { kind: "heading", text: "AI 操作接口已启用" },
      { kind: "text", text: "打开扩展连接页连接本地控制通道，或以 ?control=1 启动。观察使用 ai-control:observe；移动、战斗与选择使用公开命令。" },
      { kind: "text", text: "详情与命令行用法见项目 docs/development/AI_CONTROL.md。此插件不发放物品、不跳过剧情。" },
    ] }) });
    api.ui.entry("menu", { slot: "menu", label: "AI 操作接口", page });
  },
};
