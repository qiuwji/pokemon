import { objectSchema } from "../../engine/extensions/values.js";
/** Read-only control companion. Actions are existing public domain commands, not plugin transactions. */
export const aiControl = {
  id: "ai-control", apiVersion: 1, version: "2.0.0", dataVersion: 1, permissions: [],
  setup(api) {
    api.queries.register("observe", {
      network: true,
      schema: objectSchema({ detail: { type: "string", enum: ["summary", "world", "battle", "party", "bag", "collection", "all"] },
        since: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 256 },
        boxOffset: { type: "integer", minimum: 0 }, boxLimit: { type: "integer", minimum: 1, maximum: 200 } }),
      read(view, { detail = "summary", since, limit = 16, boxOffset = 0, boxLimit = 20 }) {
        const q = view.query(), o = q.control.observation, journal = o.events;
        const cursor = since ?? Math.max(0, journal.cursor - limit);
        const entries = journal.entries.filter(e => e.sequence > cursor).slice(0, limit);
        const events = { cursor: journal.cursor, nextCursor: entries.at(-1)?.sequence ?? Math.min(cursor, journal.cursor),
          gap: cursor > journal.cursor || (journal.entries.length > 0 && cursor < journal.entries[0].sequence - 1),
          hasMore: (entries.at(-1)?.sequence ?? cursor) < journal.cursor, entries };
        const fullParty = ["party", "battle", "all"].includes(detail);
        return { protocol: 1, observationVersion: 2, busy: q.busy, position: q.position, ui: q.control.ui,
          save: q.control.save,
          availability: o.availability, tasks: o.tasks, events,
          party: fullParty ? o.party : o.party.map(m => ({ uid: m.uid, species: m.species, name: m.name,
            level: m.level, hp: m.hp, maxHP: m.maxHP, status: m.status, types: m.types, stats: m.stats })),
          money: q.money, time: q.time,
          battle: ["battle", "all"].includes(detail) ? o.battle : q.battle,
          pendingStory: q.story.session || null,
          ...(["world", "all"].includes(detail) ? { field: q.control.field, objects: o.objects, actors: q.actors,
            movement: q.movement, weather: q.weather, fieldActions: q.fieldActions, encounters: q.encounters } : {}),
          ...(["bag", "all"].includes(detail) ? { bag: o.bag, inventory: q.inventory } : {}),
          ...(["collection", "all"].includes(detail) ? { dex: o.dex,
            box: { total: o.box.length, offset: boxOffset, hasMore: boxOffset + boxLimit < o.box.length,
              monsters: o.box.slice(boxOffset, boxOffset + boxLimit) } } : {}),
          ...(detail === "all" ? { flags: q.flags, story: q.story } : {}),
        };
      },
    });
    api.queries.register("commands", { network: true, schema: objectSchema(),
      read: view => ({ commands: view.query().control.commands, observe: "ai-control:observe",
        move: "core.field.move", walk: "core.control.walk", cancel: "core.control.cancel",
        availability: "core.control.availability", events: "core.control.events", grid: "core.world.cells", input: "core.ui.input" }),
    });
    const page = api.ui.page("guide", { title: "AI 操作接口", render: () => ({ kind: "panel", children: [
      { kind: "heading", text: "AI 操作接口已启用" },
      { kind: "text", text: "以 ?control=1 连接本地通道。observe 查询行动条件与任务；field.move 返回真实结果，control.walk 逐格执行并在事件边界停止。" },
      { kind: "text", text: "插件目录中的 README.md 包含连接、观察、移动、选择、战斗及重试示例。" },
    ] }) });
    api.ui.entry("menu", { slot: "menu", label: "AI 操作接口", page });
  },
};
