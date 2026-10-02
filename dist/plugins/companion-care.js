import { objectSchema } from "../engine/extensions/values.js";
const uid = { type: "string", minLength: 1, maxLength: 128 };
/** Example plugin: no Emerald UI or mutable game imports. */
export const companionCare = {
  id: "companion-care",
  apiVersion: 1,
  version: "1.0.0",
  dataVersion: 1,
  permissions: ["friendship", "useItem"],
  validateData(data) {
    for (const value of Object.values(data.partners || {}))
      if (
        !Number.isInteger(value.mood) ||
        value.mood < 0 ||
        value.mood > 100 ||
        !Number.isInteger(value.interactions) ||
        value.interactions < 0
      )
        throw new Error("Invalid partner memory");
  },
  setup(api) {
    const theme = api.ui.theme("warm", {
      background: "#edf0d5",
      foreground: "#455544",
      border: "#78906c",
      accent: "#e2839a",
    });
    const excited = api.states.register("excited", {
      clock: "step",
      schema: objectSchema(
        { mood: { type: "integer", minimum: 0, maximum: 100 } },
        ["mood"],
      ),
    });
    api.rules.register("encouragement", {
      phase: "friendship-modifier",
      modify: (value, c, view) =>
        view.states.list(c.actor?.uid || c.actorUid)[excited]
          ? value + 1
          : value,
    });
    const feedback = api.presentation.register("affection", {
      duration: 900,
      draw(ctx, { progress, payload }) {
        ctx.fillStyle = payload.activity === "play" ? "#edc55d" : "#e2839a";
        for (let i = 0; i < 5; i++) {
          const x = 112 + i * 24,
            y =
              60 -
              Math.round(progress * 44) +
              Math.round(Math.sin(progress * 12 + i) * 4);
          const heart = [
            [1, 0],
            [3, 0],
            [0, 1],
            [2, 1],
            [4, 1],
            [1, 2],
            [2, 2],
            [3, 2],
            [2, 3],
          ];
          for (const [dx, dy] of heart)
            ctx.fillRect(x + dx * 2, y + dy * 2, 2, 2);
        }
      },
    });
    const action = api.actions.register("interact", {
      network: true,
      schema: objectSchema(
        { uid, activity: { type: "string", enum: ["pet", "play", "feed"] } },
        ["uid", "activity"],
      ),
      run(ctx, { uid, activity }) {
        const world = ctx.query(),
          mon = world.party.find((m) => m.uid === uid);
        if (!mon || mon.egg) throw new Error("请先选择队伍里的伙伴。");
        const memory = { ...(ctx.store.get("partners") || {}) },
          previous = memory[uid] || { mood: 50, interactions: 0 };
        if (activity === "feed") {
          if (!(world.bag.blue_pokeblock > 0) || (mon.sheen || 0) >= 255)
            throw new Error("需要蓝色能量方块，而且伙伴不能已经吃饱。");
          ctx.intent({ kind: "useItem", uid, item: "blue_pokeblock" });
        }
        ctx.intent({
          kind: "friendship",
          uid,
          amount: activity === "play" ? 2 : 1,
        });
        memory[uid] = {
          mood: Math.min(
            100,
            previous.mood +
              (activity === "feed" ? 12 : activity === "play" ? 8 : 5),
          ),
          interactions: previous.interactions + 1,
        };
        ctx.store.set("partners", memory);
        ctx.states.attach(excited, uid, {
          duration: 128,
          data: { mood: memory[uid].mood },
        });
        ctx.emit("companion-care:interacted", {
          uid,
          activity,
          mood: memory[uid].mood,
        });
        ctx.feedback(feedback, { uid, activity });
        return {
          ok: true,
          message:
            activity === "pet"
              ? "伙伴开心地靠了过来。"
              : activity === "play"
                ? "伙伴和你玩得很开心！"
                : "伙伴吃下了能量方块。",
        };
      },
    });
    const page = api.ui.page("interaction", {
      title: "伙伴 · 一起玩耍",
      render(view) {
        const { uid } = view.context,
          world = view.query(),
          mon = world.party.find((m) => m.uid === uid);
        if (!mon || mon.egg)
          return { kind: "text", text: "这位伙伴现在不在队伍里。" };
        const memory = view.store.get("partners")?.[uid] || {
          mood: 50,
          interactions: 0,
        };
        return {
          kind: "panel",
          theme,
          children: [
            { kind: "heading", text: mon.name },
            {
              kind: "image",
              src: mon.species + "-front",
              alt: "点击抚摸 " + mon.name,
              action,
              input: { activity: "pet" },
            },
            {
              kind: "text",
              text: `心情 ${memory.mood} / 100 · 亲密度 ${mon.friendship ?? 70} · 相伴互动 ${memory.interactions} 次`,
            },
            { kind: "meter", label: "伙伴心情", value: memory.mood, max: 100 },
            {
              kind: "row",
              children: [
                {
                  kind: "button",
                  text: "抚摸",
                  action,
                  input: { activity: "pet" },
                },
                {
                  kind: "button",
                  text: "一起玩耍",
                  action,
                  input: { activity: "play" },
                },
                {
                  kind: "button",
                  text: "喂能量方块",
                  action,
                  input: { activity: "feed" },
                  disabled:
                    !(world.bag.blue_pokeblock > 0) || (mon.sheen || 0) >= 255,
                },
              ],
            },
            {
              kind: "text",
              text: view.states.list(uid)[excited]
                ? "伙伴很有精神，步行时增加的亲密度也会受到鼓励。"
                : "点击伙伴，和它打个招呼吧。",
            },
          ],
        };
      },
    });
    api.ui.entry("detail-tab", {
      slot: "monster.detail",
      label: "一起玩耍",
      page,
      when: (view) =>
        !view.query().party.find((m) => m.uid === view.context.uid)?.egg,
    });
  },
};
