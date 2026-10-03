/** Daily worker template. Spawn through the public actor command; no game/DOM imports. */
export const actorDayCycle = {
  id: "actor-day-cycle",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: ["actors"],
  setup(api) {
    const schedule = api.content.register("actorSchedules", "worker", {
      offscreen: "relocate",
      entries: [
        {
          id: "rest",
          start: 0,
          position: {
            map: "LittlerootTown_ProfessorBirchsLab",
            x: 8,
            y: 3,
            dir: "down",
          },
          behavior: "sleep",
          pose: "sleep",
        },
        {
          id: "work",
          start: 480,
          position: { map: "LittlerootTown", x: 8, y: 10, dir: "up" },
          behavior: "look",
          radius: 1,
        },
        {
          id: "return",
          start: 1080,
          position: {
            map: "LittlerootTown_ProfessorBirchsLab",
            x: 8,
            y: 3,
            dir: "down",
          },
          behavior: "still",
          pose: "still",
        },
      ],
    });
    api.content.register("actorTemplates", "worker", {
      name: "作息研究员",
      actor: "ProfBirch",
      behavior: "still",
      schedule,
    });
    const page = api.ui.page("schedule", {
      title: "Actor作息模板",
      render: (view) => {
        const query = view.query(),
          actors = Object.entries(query.actors).filter(
            ([, r]) => r.template === "actor-day-cycle:worker",
          );
        return {
          kind: "panel",
          children: [
            {
              kind: "text",
              text: "通过公开actor.spawn命令生成研究员。当前模板演示08:00工作、18:00返回。",
            },
            {
              kind: "table",
              columns: ["身份", "时段", "地图", "到达"],
              rows: actors.map(([uid, r]) => [
                uid,
                query.actorRoutines[uid]?.id || "时钟未设置",
                r.map,
                query.actorRoutines[uid]?.arrived ? "是" : "否",
              ]),
            },
          ],
        };
      },
    });
    api.ui.entry("schedule", { slot: "menu", label: "作息模板", page });
  },
};
