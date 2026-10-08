import { objectSchema } from "../../engine/extensions/values.js";
import { isWater } from "../../engine/extensions/terrain-utils.js";

const DELTAS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const OPPOSITE = { up: "down", down: "up", left: "right", right: "left" };
const PHASES = { started: "起步", settled: "落步", blocked: "受阻", cancelled: "取消" };
const same = (a, b) => a && b && a.map === b.map && a.x === b.x && a.y === b.y &&
  (a.elevation === undefined || b.elevation === undefined || a.elevation === b.elevation);
const goal = p => ({ map: p.map, x: p.x, y: p.y, ...(p.elevation !== undefined ? { elevation: p.elevation } : {}) });

/** Following is plugin policy. The host still owns every grid move, reservation and save. */
export const patrolLab = {
  id: "patrol-lab", apiVersion: 1, version: "1.1.0", dataVersion: 2,
  permissions: ["actors"],
  validateData(data) {
    if (Object.keys(data).some(key => key !== "member") || (data.member !== undefined && data.member !== null &&
      (typeof data.member !== "string" || !/^core:actor\.[1-9]\d*$/.test(data.member))))
      throw new Error("Invalid companion memory");
  },
  setup(api) {
    let trail = [], records = [], player = null, companion = null, lastSequence = 0, playerMoving = false;
    let needsRejoin = false, rejoining = false;
    const reset = () => { trail = []; records = []; player = null; companion = null; lastSequence = 0; playerMoving = false; };
    const memberOf = view => {
      const uid = view.store.get("member"), actor = uid ? view.query().actors[uid] : null;
      if (actor && actor.template !== template) throw new Error("Companion identity mismatch");
      return actor ? { ...actor, uid } : null;
    };
    const standing = q => {
      const uid = api.store.get("member");
      const directions = [OPPOSITE[q.position.dir], "left", "right", "up", "down"];
      for (const direction of new Set(directions)) {
        const [dx, dy] = DELTAS[direction], x = q.position.x + dx, y = q.position.y + dy;
        const cell = q.control.field.region.cells.find(c => c.x === x && c.y === y);
        if (cell && cell.collision === 0 && !cell.warp && !isWater(cell.behavior) &&
          (cell.elevation === 0 || cell.elevation === 15 || cell.elevation === q.position.elevation) &&
          !cell.occupants.some(o => o.id !== uid))
          return { map: q.position.map, x, y, dir: q.position.dir };
      }
      throw new Error("身边没有可站立的空地，请换个位置再叫伙伴。");
    };
    const behavior = api.content.register("npcBehaviors", "follow", {
      timing: { intervalMs: 100, afterMove: "settled" },
      decide(c) {
        if (c.state.paused) return { move: false, pose: "still" };
        const seen = c.perception.find(p => p.uid === "player");
        const location = { ...c.position, map: companion?.map || seen?.map };
        const target = trail.find(p => !same(location, p));
        if (target) {
          const dx = target.x - c.position.x, dy = target.y - c.position.y;
          if (target.map === location.map && Math.abs(dx) + Math.abs(dy) === 1) {
            const dir = dx ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
            return { move: true, dir, pose: "walk", duration: 160 };
          }
          return { move: false, pose: "walk", duration: 160, goal: goal(target) };
        }
        if (playerMoving) return { move: false, pose: "still" };
        const destination = seen || player;
        return destination ? { move: false, pose: "walk", duration: 160,
          goal: { ...goal(destination), adjacent: true } } : { move: false, pose: "still" };
      },
    });
    const template = api.content.register("actorTemplates", "companion", {
      name: "跟随伙伴", actor: "Boy1", behavior, perceptionRadius: 32,
      schema: objectSchema({ paused: { type: "boolean" } }, ["paused"]), initialState: { paused: false },
    });
    const joined = (ctx, q) => ctx.emit("patrol-lab:joined", { player: q.position });
    api.actions.register("start", {
      schema: objectSchema(),
      run(ctx) {
        const q = ctx.query(), member = memberOf(ctx);
        if (member) {
          if (member.map !== q.position.map) ctx.intent({ kind: "actors", operation: "update", uid: member.uid, position: standing(q) });
          ctx.intent({ kind: "actors", operation: "update", uid: member.uid, data: JSON.stringify({ paused: false }) });
        } else {
          ctx.intent({ kind: "actors", operation: "spawn", template, position: standing(q) }, result => ctx.store.set("member", result.actor.uid));
        }
        joined(ctx, q);
      },
    });
    const pause = api.actions.register("pause", { schema: objectSchema(), run(ctx) {
      const member = memberOf(ctx);
      if (member) ctx.intent({ kind: "actors", operation: "update", uid: member.uid, data: JSON.stringify({ paused: true }) });
    } });
    const remove = api.actions.register("remove", { schema: objectSchema(), run(ctx) {
      const member = memberOf(ctx);
      if (member) ctx.intent({ kind: "actors", operation: "remove", uid: member.uid });
      ctx.store.set("member", null);
      ctx.emit("patrol-lab:left");
    } });
    const rejoin = api.actions.register("rejoin", { schema: objectSchema(), run(ctx) {
      const q = ctx.query(), member = memberOf(ctx);
      if (member && !member.data.paused && member.map !== q.position.map) {
        ctx.intent({ kind: "actors", operation: "update", uid: member.uid, position: standing(q) });
        joined(ctx, q);
      }
    } });
    const tryRejoin = () => {
      if (!needsRejoin || rejoining || !api.store.get("member")) return;
      rejoining = true;
      api.commands.dispatch(rejoin).then(() => { needsRejoin = false; }).catch(() => {
        // Busy scenes and occupied landings retry at the next public field/command boundary.
      }).finally(() => { rejoining = false; });
    };
    api.events.on("patrol-lab:joined", ({ payload }) => { reset(); player = payload.player; needsRejoin = false; });
    api.events.on("patrol-lab:left", () => { reset(); needsRejoin = false; });
    for (const type of ["core:actor-spawned", "core:actor-updated", "core:actor-moved"])
      api.events.on(type, ({ payload }) => {
        const actor = payload.after || payload;
        if (actor.uid === api.store.get("member")) companion = actor;
      });
    api.events.on("core:world-visit", () => {
      reset(); needsRejoin = true;
      // Let the same synchronous step publish motion first: map connections keep walking.
      Promise.resolve().then(tryRejoin);
    });
    api.events.on("core:field-step", tryRejoin);
    api.events.on("core:command-settled", tryRejoin);
    api.events.on("core:motion", ({ payload: r }) => {
      if (r.phase === "cancelled" && r.reason === "disposed") { reset(); return; }
      const uid = api.store.get("member");
      if (!uid || (r.entity !== "player" && r.entity !== uid)) return;
      if (["started", "blocked"].includes(r.phase)) {
        if (r.sequence <= lastSequence) reset();
        lastSequence = r.sequence;
      }
      if (r.entity === "player") {
        player = r.to;
        if (r.phase === "started") playerMoving = true;
        if (["settled", "cancelled"].includes(r.phase)) playerMoving = false;
        // Neighboring map steps keep walking; door/transport visits rejoin through an action.
        if (r.phase === "started" && r.from.map !== r.to.map) needsRejoin = false;
        if (r.phase === "settled" && !r.scripted) {
          trail.push(r.from);
          if (trail.length > 32) trail = [];
        }
      } else {
        companion = r.to;
        if (r.phase === "settled") {
          const reached = trail.findIndex(p => same(p, r.to));
          if (reached >= 0) trail.splice(0, reached + 1);
        }
        records.push(r);
        if (records.length > 24) records.shift();
      }
    });
    api.queries.register("report", { schema: objectSchema(), read: view => ({
      member: memberOf(view), queued: trail.length, records,
    }) });
    const page = api.ui.page("control", { title: "跟随伙伴", render(view) {
      const member = memberOf(view);
      return { kind: "panel", children: [
        { kind: "text", text: "叫来一位少年陪你走。关闭菜单后，他会跟着你刚走过的路线；停下时留在身边。" },
        { kind: "row", children: [
          { kind: "button", text: member ? "继续跟随 / 叫回身边" : "叫来伙伴", action: "patrol-lab:start" },
          { kind: "button", text: "原地等候", action: pause, disabled: !member },
          { kind: "button", text: "告别伙伴", action: remove, disabled: !member },
        ] },
        { kind: "text", text: member ? `${member.data.paused ? "等候中" : "跟随中"} · ${member.map}（${member.x}, ${member.y}）` : "身边需要至少一格空地。不会发道具或改剧情。" },
        { kind: "table", columns: ["动作", "路线"], rows: records.slice(-8).reverse().map(r => [
          PHASES[r.phase], `${r.from.x},${r.from.y} → ${r.to.x},${r.to.y}`,
        ]) },
        { kind: "text", text: "挡路时等待；菜单、对话和战斗由宿主暂停。进门后在可用空地重新加入，若当前正忙可走一步或点“叫回身边”。" },
      ] };
    } });
    api.ui.entry("control", { slot: "menu", label: "跟随伙伴", page });
  },
};
