import { readOnly, callSync } from "../../../engine/extensions/values.js";
const integer = (n) => Number.isSafeInteger(n) && n >= 0;
const identifier = (n) =>
  typeof n === "string" &&
  !["__proto__", "constructor", "prototype"].includes(n) &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(n);
export const emptyCrops = () => ({ trees: {} });
/** Emerald save references; the generic plugin catalog does not inspect crop state. */
export const cropContentReferences = (state) =>
  Object.entries(state.crops?.trees || {}).flatMap(([id, tree]) => [id, tree.kind]);
/** Content describes stages; this service owns growth state, never inventory or map rendering. */
export class CropRegistry {
  constructor(definitions = {}, { items = {} } = {}) {
    this.definitions = new Map();
    for (const [id, d] of Object.entries(definitions)) {
      if (
        !identifier(id) ||
        !d ||
        Object.keys(d).some(
          (k) =>
            ![
              "item",
              "name",
              "durationMinutes",
              "minYield",
              "maxYield",
            ].includes(k),
        ) ||
        !items[d.item] ||
        typeof d.name !== "string" ||
        !d.name ||
        !integer(d.durationMinutes) ||
        d.durationMinutes < 1 ||
        !integer(d.minYield) ||
        d.minYield < 1 ||
        !integer(d.maxYield) ||
        d.maxYield < d.minYield ||
        d.maxYield > 999
      )
        throw new Error(`Invalid crop definition ${id}`);
      this.definitions.set(id, readOnly(d));
    }
  }
  get(id) {
    const result = this.definitions.get(id);
    if (!result) throw new Error(`Unknown crop ${id}`);
    return result;
  }
}
export class CropService {
  constructor({ registry, state = emptyCrops(), policy, calculateYield }) {
    const stages = policy?.stages;
    if (
      !Array.isArray(stages) ||
      stages.length < 2 ||
      stages.length > 32 ||
      !integer(policy.maxCycles) ||
      policy.maxCycles < 1 ||
      policy.maxCycles > 128 ||
      !integer(policy.expireAfterDurations) ||
      policy.expireAfterDurations < 1 ||
      policy.expireAfterDurations > 4096 ||
      typeof calculateYield !== "function"
    )
      throw new Error("Invalid crop lifecycle policy");
    this.stages = new Map();
    for (const stage of stages) {
      if (
        !identifier(stage.id) ||
        this.stages.has(stage.id) ||
        !integer(stage.duration) ||
        stage.duration < 1 ||
        Object.keys(stage).some(
          (k) =>
            !["id", "duration", "next", "water", "harvest", "cycle"].includes(
              k,
            ),
        ) ||
        ["water", "harvest", "cycle"].some(
          (k) => stage[k] !== undefined && typeof stage[k] !== "boolean",
        )
      )
        throw new Error("Invalid crop lifecycle stage");
      this.stages.set(stage.id, readOnly(stage));
    }
    if (
      stages.some((s) => !this.stages.has(s.next)) ||
      stages.filter((s) => s.harvest).length !== 1
    )
      throw new Error("Invalid crop lifecycle links");
    Object.assign(this, {
      registry,
      state,
      policy: readOnly(policy),
      calculateYield,
    });
    for (const d of registry.definitions.values())
      if (
        !integer(d.durationMinutes * policy.expireAfterDurations) ||
        stages.some((s) => !integer(d.durationMinutes * s.duration))
      )
        throw new Error("Crop duration overflow");
    this.validate();
  }
  validate() {
    const s = readOnly(this.state);
    if (
      Object.keys(s).some((k) => k !== "trees") ||
      !s.trees ||
      Array.isArray(s.trees) ||
      Object.keys(s.trees).length > 1024
    )
      throw new Error("Invalid saved crops");
    for (const [id, tree] of Object.entries(s.trees)) {
      const d = this.registry.get(tree.kind),
        stage = this.stages.get(tree.stage);
      if (
        !identifier(id) ||
        !stage ||
        Object.keys(tree).some(
          (k) =>
            ![
              "kind",
              "stage",
              "remainingMinutes",
              "watered",
              "cycles",
              "yield",
              "stopped",
            ].includes(k),
        ) ||
        !integer(tree.remainingMinutes) ||
        tree.remainingMinutes < 1 ||
        tree.remainingMinutes > d.durationMinutes * stage.duration ||
        !integer(tree.cycles) ||
        tree.cycles >= this.policy.maxCycles ||
        !integer(tree.yield) ||
        (stage.harvest
          ? tree.yield < d.minYield || tree.yield > d.maxYield
          : tree.yield !== 0) ||
        typeof tree.stopped !== "boolean" ||
        !Array.isArray(tree.watered) ||
        new Set(tree.watered).size !== tree.watered.length ||
        tree.watered.some((id) => !this.stages.get(id)?.water)
      )
        throw new Error(`Invalid saved crop ${id}`);
    }
  }
  duration(kind, stage) {
    const n =
      this.registry.get(kind).durationMinutes * this.stages.get(stage).duration;
    if (!integer(n) || n < 1) throw new Error("Crop duration overflow");
    return n;
  }
  yield(tree, random) {
    const definition = this.registry.get(tree.kind);
    const amount = callSync(this.calculateYield, [
      readOnly({ definition, watered: tree.watered.length }),
      random,
    ]);
    if (
      !integer(amount) ||
      amount < definition.minYield ||
      amount > definition.maxYield
    )
      throw new Error("Invalid crop yield");
    return amount;
  }
  plant(
    id,
    kind,
    { stage = this.policy.stages[0].id, stopped = false, random } = {},
  ) {
    if (
      !identifier(id) ||
      Object.hasOwn(this.state.trees, id) ||
      !this.stages.has(stage) ||
      typeof stopped !== "boolean" ||
      Object.keys(this.state.trees).length >= 1024
    )
      throw new Error("Invalid crop planting request");
    const tree = {
      kind,
      stage,
      remainingMinutes: this.duration(kind, stage),
      watered: [],
      cycles: 0,
      yield: 0,
      stopped,
    };
    if (this.stages.get(stage).harvest) tree.yield = this.yield(tree, random);
    this.state.trees[id] = tree;
    return this.view(id);
  }
  water(id) {
    const t = this.state.trees[id];
    if (!t || !this.stages.get(t.stage).water || t.watered.includes(t.stage))
      return false;
    t.watered.push(t.stage);
    return true;
  }
  release(id) {
    const t = this.state.trees[id];
    if (!t?.stopped) return false;
    t.stopped = false;
    return true;
  }
  remove(id) {
    if (!Object.hasOwn(this.state.trees, id)) return false;
    delete this.state.trees[id];
    return true;
  }
  advance(minutes, random) {
    if (!integer(minutes)) throw new Error("Invalid crop elapsed time");
    if (!minutes) return [];
    const draft = structuredClone(this.state.trees),
      changes = [];
    for (const id of Object.keys(draft).sort()) {
      const tree = draft[id];
      if (tree.stopped) continue;
      const before = structuredClone(tree),
        d = this.registry.get(tree.kind);
      if (minutes >= d.durationMinutes * this.policy.expireAfterDurations)
        delete draft[id];
      else {
        let elapsed = minutes,
          transitions = 0;
        while (elapsed >= tree.remainingMinutes) {
          elapsed -= tree.remainingMinutes;
          const current = this.stages.get(tree.stage),
            next = this.stages.get(current.next);
          if (current.cycle) {
            tree.cycles++;
            tree.watered = [];
            tree.yield = 0;
          }
          if (tree.cycles >= this.policy.maxCycles) {
            delete draft[id];
            break;
          }
          tree.stage = next.id;
          tree.remainingMinutes = this.duration(tree.kind, next.id);
          if (next.harvest) tree.yield = this.yield(tree, random);
          if (++transitions > this.policy.expireAfterDurations)
            throw new Error("Crop lifecycle bound exceeded");
        }
        if (draft[id]) tree.remainingMinutes -= elapsed;
      }
      const after = draft[id] || null;
      if (
        before.stage !== after?.stage ||
        before.cycles !== after?.cycles ||
        before.yield !== after?.yield
      )
        changes.push(readOnly({ id, before, after }));
    }
    this.state.trees = draft;
    return changes;
  }
  view(id) {
    const t = this.state.trees[id];
    return t
      ? readOnly({
          id,
          ...t,
          item: this.registry.get(t.kind).item,
          harvestable: !!this.stages.get(t.stage).harvest,
        })
      : readOnly({ id, stage: "empty", harvestable: false });
  }
}
