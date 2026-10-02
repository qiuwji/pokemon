import {
  jsonValue,
  readOnly,
  objectSchema,
  validateSchema,
  validateValue,
} from "../extensions/values.js";
const scopes = ["creature", "seat", "side", "field"];
const cleanup = ["leave", "faint", "end"];
/** Registered definitions are immutable policy; each battle owns its instances. */
export class BattleStateRegistry {
  constructor(definitions = {}) {
    this.definitions = Object.fromEntries(
      Object.entries(definitions).map(([id, d]) => {
        if (
          !scopes.includes(d.scope) ||
          !["reject", "refresh", "add"].includes(d.stack || "reject") ||
          !Number.isInteger(d.maxStacks ?? 1) ||
          (d.maxStacks ?? 1) < 1 ||
          (d.maxStacks ?? 1) > 64 ||
          (d.duration !== undefined &&
            d.duration !== null &&
            (!Number.isInteger(d.duration) ||
              d.duration < 1 ||
              d.duration > 10000)) ||
          (d.clearOn || []).some((v) => !cleanup.includes(v)) ||
          !Array.isArray(d.hooks) ||
          (d.clearWithSource !== undefined &&
            typeof d.clearWithSource !== "boolean")
        )
          throw new Error(`Invalid battle state ${id}`);
        return [
          id,
          {
            ...d,
            schema: validateSchema(d.schema || objectSchema()),
            stack: d.stack || "reject",
            maxStacks: d.maxStacks || 1,
            clearOn: d.clearOn || ["end"],
          },
        ];
      }),
    );
    for (const [id, d] of Object.entries(this.definitions))
      for (const other of d.excludes || [])
        if (
          !this.definitions[other] ||
          this.definitions[other].scope !== d.scope
        )
          throw new Error(`Invalid state exclusion ${id}`);
  }
  validateEffects(effects) {
    for (const d of Object.values(effects.definitions))
      for (const phase of [
        "primary",
        "beforeDamage",
        "afterDamage",
        "secondary",
        "onCharge",
        "onMiss",
      ])
        for (const s of d[phase] || [])
          if (["applyBattleState", "removeBattleState"].includes(s.op))
            this.get(s.id);
  }
  get(id) {
    const d = this.definitions[id];
    if (!d) throw new Error(`Unknown battle state ${id}`);
    return d;
  }
}
/** Scoped, source-aware instances. No instance is shared between battles or written to creature saves. */
export class BattleStateService {
  constructor(battle, registry) {
    this.battle = battle;
    this.registry = registry;
    this.instances = new Map();
    this.sequence = 0;
  }
  anchor(scope, seat) {
    const b = this.battle;
    if (scope === "field") return "field";
    const s = b.roster.seat(seat);
    if (scope === "seat") return s.id;
    if (scope === "side") return s.sideId;
    const uid = b.roster.occupant(seat)?.uid;
    if (!uid) throw new Error("State requires an occupied seat");
    return uid;
  }
  lookup(id, seat) {
    const d = this.registry.get(id);
    return [...this.instances.values()].find(
      (r) => r.id === id && r.anchor === this.anchor(d.scope, seat),
    );
  }
  attach(
    id,
    seat,
    { sourceSeat = seat, moveId = null, data = {}, duration } = {},
  ) {
    const d = this.registry.get(id),
      b = this.battle,
      anchor = this.anchor(d.scope, seat),
      copied = jsonValue(data);
    validateValue(d.schema, copied);
    const turns = duration === undefined ? (d.duration ?? null) : duration;
    if (
      turns !== null &&
      (!Number.isInteger(turns) || turns < 1 || turns > 10000)
    )
      throw new Error("Invalid battle state duration");
    const existing = this.lookup(id, seat);
    if (existing && d.stack === "reject") return false;
    for (const r of [...this.instances.values()])
      if (
        r.anchor === anchor &&
        r.scope === d.scope &&
        ((d.excludes || []).includes(r.id) ||
          (this.registry.get(r.id).excludes || []).includes(id))
      )
        this.remove(r.key, "replaced");
    const r = {
      key: existing?.key || `state:${++this.sequence}`,
      id,
      scope: d.scope,
      anchor,
      stacks:
        existing && d.stack === "add"
          ? Math.min(d.maxStacks, existing.stacks + 1)
          : 1,
      remaining: turns,
      data: copied,
      source: {
        seat: sourceSeat,
        uid: b.roster.occupant(sourceSeat)?.uid || null,
        moveId,
      },
      createdTurn: b.turn,
    };
    this.instances.set(r.key, r);
    this.lifecycle("state-applied", r, seat);
    b.emit("战斗状态生效！", "state", {
      targetSeat: seat,
      state: readOnly(r),
      stateChange: existing ? "refresh" : "apply",
    });
    return true;
  }
  remove(key, reason = "removed") {
    const r = this.instances.get(key);
    if (!r) return false;
    this.lifecycle("state-removed", r, undefined, reason);
    this.instances.delete(key);
    this.battle.emit("战斗状态解除了。", "state", {
      state: readOnly(r),
      stateChange: reason,
    });
    return true;
  }
  update(key, data) {
    const r = this.instances.get(key);
    if (!r) return false;
    const copied = jsonValue(data);
    validateValue(this.registry.get(r.id).schema, copied);
    r.data = copied;
    return true;
  }
  lifecycle(phase, r, seat, reason) {
    const ownerSeat = seat || this.seatFor(r, {});
    if (ownerSeat)
      this.battle.traits?.run(phase, {
        ownerSeat,
        actorSeat: ownerSeat,
        targetSeat: ownerSeat,
        battleStateKey: r.key,
        reason,
      });
  }
  tick() {
    for (const r of [...this.instances.values()]) {
      if (!this.instances.has(r.key) || this.battle.ended) continue;
      this.lifecycle("state-tick", r);
      if (
        this.instances.has(r.key) &&
        r.remaining !== null &&
        --r.remaining === 0
      )
        this.remove(r.key, "expired");
    }
    this.battle.outcomes.observe();
  }
  clear(reason, seat) {
    const sourceUid = seat ? this.battle.roster.occupant(seat)?.uid : null;
    for (const r of [...this.instances.values()])
      if (
        (reason !== "end" &&
          this.registry.get(r.id).clearWithSource &&
          r.source.uid === sourceUid) ||
        ((reason === "end" ||
          this.registry.get(r.id).clearOn.includes(reason)) &&
          (reason === "end" ||
            (r.scope === "seat" && r.anchor === seat) ||
            (r.scope === "creature" && r.anchor === sourceUid)))
      )
        this.remove(r.key, reason);
  }
  seatFor(r, c) {
    const b = this.battle,
      candidates = [
        c.ownerSeat,
        c.targetSeat,
        c.actorSeat,
        ...b.roster.occupied().map((s) => s.id),
      ].filter(Boolean);
    return candidates.find(
      (seat) =>
        b.roster.occupant(seat) && this.anchor(r.scope, seat) === r.anchor,
    );
  }
  owners(id, hook, c) {
    const references =
      hook.role === "actor"
        ? [c.actorSeat]
        : hook.role === "target"
          ? [c.targetSeat]
          : hook.role === "owner"
            ? [c.ownerSeat]
            : null;
    return [...this.instances.values()]
      .filter(
        (r) =>
          r.id === id &&
          (!c.battleStateKey || c.battleStateKey === r.key) &&
          this.seatFor(r, c) &&
          (!references ||
            references.some((s) => s && this.anchor(r.scope, s) === r.anchor)),
      )
      .map((r) => r.key);
  }
  context(key, c) {
    const r = this.instances.get(key);
    return { state: r, seat: this.seatFor(r, c) };
  }
  view(seat) {
    return readOnly(
      [...this.instances.values()].filter(
        (r) => !seat || this.anchor(r.scope, seat) === r.anchor,
      ),
    );
  }
}
