import { manifest, objectSchema } from "../../helpers/session.js";
const uid = { type: "string", minLength: 1, maxLength: 128 };
const input = objectSchema({ uid, activity: { type: "string", enum: ["pet", "play", "feed"] } }, ["uid", "activity"]);
/** Test-only consumer of transactions, state lifetime, rules, UI and feedback. */
export const interactionFixture = {
  ...manifest("fixture-interaction", (api) => {
    const theme = api.ui.theme("warm", { background: "#edf0d5", foreground: "#455544", border: "#78906c", accent: "#e2839a" });
    const state = api.states.register("excited", {
      clock: "step", schema: objectSchema({ mood: { type: "integer", minimum: 0, maximum: 100 } }, ["mood"]),
    });
    api.rules.register("modifier", { phase: "friendship-modifier", modify: (value, c, view) =>
      view.states.list(c.actor?.uid || c.actorUid)[state] ? value + 1 : value });
    const feedback = api.presentation.register("feedback", { duration: 900, schema: input, draw() {} });
    const action = api.actions.register("interact", { network: true, schema: input, run(ctx, { uid, activity }) {
      const view = ctx.query(), mon = view.party.find(m => m.uid === uid);
      if (!mon || mon.egg) throw new Error("Missing fixture creature");
      if (activity === "feed") {
        if (!(view.bag.blue_pokeblock > 0) || (mon.sheen || 0) >= 255) throw new Error("Fixture item unavailable");
        ctx.intent({ kind: "useItem", uid, item: "blue_pokeblock" });
      }
      ctx.intent({ kind: "friendship", uid, amount: activity === "play" ? 2 : 1 });
      const memory = { ...(ctx.store.get("partners") || {}) }, previous = memory[uid] || { mood: 50, interactions: 0 };
      memory[uid] = { mood: Math.min(100, previous.mood + 5), interactions: previous.interactions + 1 };
      ctx.store.set("partners", memory);
      ctx.states.attach(state, uid, { duration: 128, data: { mood: memory[uid].mood } });
      ctx.emit("fixture-interaction:interacted", { uid, activity });
      ctx.feedback(feedback, { uid, activity });
      return { ok: true };
    } });
    const page = api.ui.page("interaction", { title: "Transaction fixture", render: (view) => ({
      kind: "panel", theme, children: [{ kind: "image", src: view.query().party.find(m => m.uid === view.context.uid)?.species + "-front", action, input: { activity: "pet" } }],
    }) });
    api.ui.entry("detail", { slot: "monster.detail", label: "Fixture", page });
  }, ["friendship", "useItem"]),
  validateData(data) {
    for (const v of Object.values(data.partners || {}))
      if (!Number.isInteger(v.mood) || v.mood < 0 || v.mood > 100 || !Number.isInteger(v.interactions) || v.interactions < 0)
        throw new Error("Invalid fixture memory");
  },
};
