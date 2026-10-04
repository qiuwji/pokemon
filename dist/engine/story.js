import { changeMoney, settleMoney } from "./currency.js";
import { matchesRegion, validateRegion } from "./field-triggers.js";
import { validStoryVariables } from "./story-variables.js";
import { DEFAULT_CONDITION_QUERIES } from "./condition-queries.js";
import { matchesCondition, validateCondition } from "./conditions.js";
import { validDialogueHistory } from "./dialogue-history.js";
import { validStorySession } from "./story-session.js";

export const emptyStoryProgress = () => ({
  completed: [],
  rewards: [],
  history: [],
});
export function validStoryProgress(progress) {
  return (
    !!progress &&
    validDialogueHistory(progress.history) &&
    validStorySession(progress.session) &&
    validStoryVariables(progress.variables) &&
    [progress.completed, progress.rewards].every(
      (v) =>
        Array.isArray(v) &&
        v.every((id) => typeof id === "string" && id.length > 0) &&
        new Set(v).size === v.length,
    )
  );
}
/** Selection is pure. Completion is a final command, separate from animation execution. */
export class StoryEngine {
  constructor(
    events,
    quests = [],
    { queries = DEFAULT_CONDITION_QUERIES } = {},
  ) {
    this.queries = queries;
    this.events = events;
    this.byTrigger = Map.groupBy(events, (e) => e.trigger);
    this.quests = quests;
    const ids = new Set(events.map((e) => e.id));
    if (ids.size !== events.length) throw new Error("Duplicate story event ID");
    for (const event of events) {
      if (!event.id || !event.trigger || typeof event.build !== "function")
        throw new Error(`Invalid event ${event.id}`);
      if (
        event.priority !== undefined &&
        (!Number.isSafeInteger(event.priority) ||
          Math.abs(event.priority) > 10000)
      )
        throw new Error(`Invalid event priority ${event.id}`);
      if (
        event.selector &&
        (Object.keys(event.selector).some(
          (key) =>
            ![
              "map",
              "reason",
              "objectId",
              "script",
              "kind",
              "localId",
            ].includes(key),
        ) ||
          Object.values(event.selector).some(
            (value) => typeof value !== "string" || !value,
          ))
      )
        throw new Error(`Invalid event selector ${event.id}`);
      if (event.where) validateRegion(event.where, `events.${event.id}.where`);
      validateCondition(
        event.requires,
        ids,
        `events.${event.id}.requires`,
        queries,
      );
      if (event.after?.some((id) => !ids.has(id)))
        throw new Error(`events.${event.id}: unknown prerequisite`);
    }
    const visit = (id, path = new Set()) => {
      if (path.has(id)) throw new Error(`Story dependency cycle at ${id}`);
      const next = new Set(path).add(id);
      for (const parent of events.find((e) => e.id === id).after || [])
        visit(parent, next);
    };
    events.forEach((e) => visit(e.id));
    const questIds = new Set();
    for (const q of quests) {
      if (!q.id || questIds.has(q.id)) throw new Error(`Invalid quest ${q.id}`);
      questIds.add(q.id);
      validateCondition(q.requires, ids, `quests.${q.id}.requires`, queries);
      validateCondition(q.complete, ids, `quests.${q.id}.complete`, queries);
    }
  }
  resolve(trigger, state, context = {}) {
    const candidates = (this.byTrigger.get(trigger) || []).filter(
      (e) =>
        e.trigger === trigger &&
        (!e.where ||
          matchesRegion(e.where, context.position || state.position)) &&
        (!e.once || !state.story?.completed.includes(e.id)) &&
        (e.after || []).every((id) => state.story?.completed.includes(id)) &&
        matchesCondition(e.requires, state, this.queries) &&
        (!e.match || e.match(context, state)) &&
        Object.entries(e.selector || {}).every(
          ([key, value]) =>
            (key === "map"
              ? context.map || state.position?.map
              : key === "reason"
                ? context.reason
                : key === "localId"
                  ? context.object?.sourceLocalId
                  : key === "objectId"
                    ? context.object?.id
                    : context.object?.[key]) === value,
        ),
    );
    candidates.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    const event = candidates[0];
    if (!event) return [];
    if (
      candidates[1] &&
      (candidates[1].priority || 0) === (event.priority || 0)
    )
      throw new Error(
        `Ambiguous story trigger: ${event.id}, ${candidates[1].id}`,
      );
    const commands = event.build(state, context);
    if (!Array.isArray(commands))
      throw new Error(`events.${event.id}: commands must be an array`);
    if (commands.length === 1 && commands[0].type === "script")
      return [{ ...commands[0], event: event.id }];
    return [...commands, { type: "completeEvent", id: event.id }];
  }
  quest(state) {
    return (
      this.quests.find(
        (q) =>
          matchesCondition(q.requires, state, this.queries) &&
          (!q.complete || !matchesCondition(q.complete, state, this.queries)),
      ) || null
    );
  }
}
export function validateStoryFlag(key, value, label = "story") {
  if (typeof key !== "string" || !key ||
      ["__proto__", "constructor", "prototype"].includes(key) ||
      !["boolean", "string", "number"].includes(typeof value) ||
      (typeof value === "number" && !Number.isFinite(value)))
    throw new Error(`Invalid ${label} flag ${key}`);
}
/** @param {import("./contracts.js").Reward} reward */
export function validateReward(reward, items = {}) {
  if (!reward?.id || typeof reward.id !== "string")
    throw new Error("Reward requires a stable ID");
  if (
    reward.money !== undefined &&
    (!Number.isSafeInteger(reward.money) || reward.money < 0)
  )
    throw new Error("Invalid reward money");
  for (const key of ["items", "flags"])
    if (
      reward[key] !== undefined &&
      (!reward[key] ||
        typeof reward[key] !== "object" ||
        Array.isArray(reward[key]))
    )
      throw new Error(`Invalid reward ${key}`);
  for (const [id, count] of Object.entries(reward.items || {}))
    if (!Object.hasOwn(items, id) || !Number.isSafeInteger(count) || count <= 0)
      throw new Error(`Invalid reward item ${id}`);
  for (const [id, value] of Object.entries(reward.flags || {}))
    validateStoryFlag(id, value, "reward");
}
/** Atomic, idempotent persistent reward. Animation failures cannot grant it twice. */
export function grantReward(state, reward, { items = {}, inventory } = {}) {
  const result = grantRewardResult(state, reward, { items, inventory });
  if (result.status === "inventoryFull") throw new Error(result.reason);
  return result.status === "ok";
}
export function grantRewardResult(
  state,
  reward,
  { items = {}, inventory } = {},
) {
  validateReward(reward, items);
  const progress = state.story || emptyStoryProgress();
  if (!validStoryProgress(progress)) throw new Error("Invalid story progress");
  if (progress.rewards.includes(reward.id)) return { status: "alreadyGranted" };
  const draft = {
    flags: { ...state.flags },
    money: state.money,
    story: structuredClone(progress),
  };
  if (reward.money !== undefined) {
    settleMoney(draft, changeMoney(draft.money, reward.money));
  }
  Object.assign(draft.flags, reward.flags);
  draft.story.rewards.push(reward.id);
  const operations = Object.entries(reward.items || {}).map(
    ([item, count]) => ({ kind: "add", item, count }),
  );
  if (operations.length) {
    const plan = inventory.prepare(state.bag, operations);
    if (!plan.ok) {
      if (plan.code === "full")
        return { status: "inventoryFull", reason: plan.reason };
      throw new Error(plan.reason);
    }
    if (!inventory.commit(plan, state.bag))
      throw new Error("Reward inventory plan expired");
  }
  Object.assign(state, draft);
  return { status: "ok" };
}
export function completeEvent(state, id) {
  state.story ??= emptyStoryProgress();
  if (!state.story.completed.includes(id)) state.story.completed.push(id);
}
