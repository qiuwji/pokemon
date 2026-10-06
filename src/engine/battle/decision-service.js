import { inventoryQuantity } from "../inventory.js";
import { readOnly, validateValue } from "../extensions/values.js";
import { Random } from "../model.js";
import { validateScoreResult, validateJointScores } from "./strategy-contract.js";
import { BattleCandidateService } from "./candidate-service.js";
import { observationFor, hashSeed } from "./ai-observation.js";
import { analyzeCandidate } from "./analysis.js";

const TOP_CANDIDATES = 16;

/**
 * The host decision service: it owns the two-layer synthesis, joint selection, the isolated AI RNG,
 * per-UID memory and the explanation log. Strategies never touch these; they only return bounded
 * scores for candidates the host proposed. Everything here is reversible through `snapshot`.
 */
export class BattleAiRuntime {
  constructor(battle, strategies) {
    this.battle = battle;
    this.strategies = strategies;
    this.candidates = new BattleCandidateService(battle);
    this.teamMemory = new Map();
    this.creatureMemory = new Map();
    this.knowledge = new Map();
    this.rngs = new Map();
    this.decisions = new Map();
    this.plans = new Map();
    this.sequence = 0;
  }
  rngFor(controllerId) {
    let rng = this.rngs.get(controllerId);
    if (!rng) {
      rng = new Random(hashSeed(this.battle.aiSeed, controllerId));
      this.rngs.set(controllerId, rng);
    }
    return rng;
  }
  explanations() {
    return readOnly([...this.decisions.values()]);
  }
  snapshot() {
    return structuredClone({
      teamMemory: [...this.teamMemory],
      creatureMemory: [...this.creatureMemory],
      knowledge: [...this.knowledge],
      rngs: [...this.rngs].map(([id, rng]) => [id, rng.snapshot()]),
      decisions: [...this.decisions],
      plans: [...this.plans],
      sequence: this.sequence,
    });
  }
  restore(state) {
    this.teamMemory = new Map(state.teamMemory);
    this.creatureMemory = new Map(state.creatureMemory);
    this.knowledge = new Map(state.knowledge);
    this.rngs = new Map(state.rngs.map(([id, seed]) => [id, new Random(seed)]));
    this.decisions = new Map(state.decisions);
    this.plans = new Map(state.plans);
    this.sequence = state.sequence;
  }
  seatsOf(controllerId) {
    return [...this.battle.roster.seats.values()]
      .filter(
        (seat) =>
          seat.controllerId === controllerId &&
          this.battle.roster.occupant(seat.id)?.hp > 0,
      )
      .map((seat) => seat.id);
  }
  /** Entry point used by the battle `ai` callback for every autonomous seat. */
  decideSeat(seat) {
    const owner = this.battle.roster.owner(seat);
    if (!owner.ai) return this.strategies.decideLegacy(this.battle, seat);
    const seats = this.seatsOf(owner.id);
    if (seats.length <= 1)
      return this.plan(owner, [seat], { mode: "turn" }, `turn:${seat}`).get(seat)
        .action;
    const key = `${owner.id}:${this.battle.turn}:turn`;
    if (!this.plans.has(key))
      this.plans.set(key, this.plan(owner, seats, { mode: "turn" }, key));
    return this.plans.get(key).get(seat).action;
  }
  /** Replacement decisions reuse the same scoring service with the real reason and policy. */
  decideReplacement(seat, reason) {
    const owner = this.battle.roster.owner(seat);
    if (!owner.ai)
      return {
        kind: "switch",
        seat,
        actor: this.battle.roster.occupant(seat)?.uid ?? null,
        index: this.battle.rules.replacementIndex({
          battle: this.battle,
          seat,
          reason,
          candidates: this.battle.roster.bench(seat),
        }),
      };
    return this.plan(
      owner,
      [seat],
      { mode: "replacement", reason },
      `replacement:${seat}:${reason}`,
    ).get(seat).action;
  }
  initialMemory(store, key, definition, context) {
    if (store.has(key)) return store.get(key);
    const view = observationFor({
      battle: this.battle,
      controllerId: context.controllerId,
      actorUid: context.actorUid,
      mode: context.mode,
      decisionId: "init",
      decisionRound: this.battle.turn,
      candidates: [],
      analyses: [],
      memory: {},
      parameters: context.parameters,
    });
    const value = definition.init ? definition.init(view) : {};
    validateValue(definition.memory, value, "memory");
    const stored = structuredClone(value);
    store.set(key, stored);
    return stored;
  }
  applyScores(rows, scores) {
    for (const entry of scores)
      for (const row of rows) {
        const slot = row.scoreMap.get(entry.candidateId);
        if (slot) {
          slot.value += entry.value;
          slot.reasons.push(...entry.reasons);
        }
      }
  }
  plan(owner, seats, { mode, reason = null }, cacheKey) {
    const b = this.battle,
      config = owner.ai,
      information = config.information,
      publicOnly = information !== "full";
    const rows = seats.map((seat) => {
      const actorUid = b.roster.occupant(seat)?.uid ?? null,
        candidates = this.candidates.list(seat, {
          variants: config.variants,
          replacement: mode === "replacement",
        }),
        analyses = candidates.map((candidate) => ({
          candidateId: candidate.id,
          ...analyzeCandidate(b, candidate.action, { publicOnly }),
        }));
      return {
        seat,
        actorUid,
        candidates,
        analyses,
        scoreMap: new Map(
          candidates.map((candidate) => [
            candidate.id,
            { value: 0, reasons: [] },
          ]),
        ),
      };
    });
    if (config.trainer) {
      const definition = this.strategies.trainerV2(config.trainer.id);
      const memory = this.initialMemory(this.teamMemory, owner.id, definition, {
        controllerId: owner.id,
        actorUid: null,
        parameters: config.trainer.parameters,
        mode: information,
      });
      const view = observationFor({
        battle: b,
        controllerId: owner.id,
        actorUid: null,
        mode: information,
        replacementReason: reason,
        decisionId: cacheKey,
        decisionRound: b.turn + 1,
        candidates: rows.flatMap((row) =>
          row.candidates.map((c) => this.project(c)),
        ),
        analyses: rows.flatMap((row) => row.analyses),
        memory,
        parameters: config.trainer.parameters,
      });
      const result = this.scored(
        definition,
        view,
        rows.flatMap((row) => row.candidates.map((c) => c.id)),
      );
      this.applyScores(rows, result.scores);
      if (result.nextMemory !== undefined)
        this.teamMemory.set(owner.id, structuredClone(result.nextMemory));
    }
    for (const row of rows) {
      const ref = config.creatures?.[row.actorUid] || config.creature;
      if (!ref || !row.actorUid) continue;
      const creatureIds = row.candidates
        .filter((c) => c.kind === "move" && c.actorUid === row.actorUid)
        .map((c) => c.id);
      const definition = this.strategies.creature(ref.id);
      const memory = this.initialMemory(
        this.creatureMemory,
        row.actorUid,
        definition,
        {
          controllerId: owner.id,
          actorUid: row.actorUid,
          parameters: ref.parameters,
          mode: information,
        },
      );
      const view = observationFor({
        battle: b,
        controllerId: owner.id,
        actorUid: row.actorUid,
        mode: information,
        replacementReason: reason,
        decisionId: `${cacheKey}:${row.seat}`,
        decisionRound: b.turn + 1,
        candidates: row.candidates
          .filter((c) => creatureIds.includes(c.id))
          .map((c) => this.project(c)),
        analyses: row.analyses,
        memory,
        parameters: ref.parameters,
      });
      const result = this.scored(definition, view, creatureIds);
      this.applyScores(rows, result.scores);
      if (result.nextMemory !== undefined)
        this.creatureMemory.set(row.actorUid, structuredClone(result.nextMemory));
    }
    const chosen =
      rows.length > 1
        ? this.joint(owner, config, rows, cacheKey)
        : this.pick(owner, rows[0]);
    for (const row of rows)
      this.record(cacheKey, mode, reason, owner, row, chosen.get(row.seat));
    return chosen;
  }
  scored(definition, view, candidateIds) {
    return validateScoreResult(
      definition.score(view),
      new Set(candidateIds),
      definition.memory,
    );
  }
  joint(owner, config, rows, cacheKey) {
    const b = this.battle;
    const kept = rows.map((row) => {
      const sorted = [...row.candidates].sort(
        (a, c) => row.scoreMap.get(c.id).value - row.scoreMap.get(a.id).value,
      );
      const top = sorted.slice(0, TOP_CANDIDATES);
      if (!top.includes(row.candidates[0])) top.push(row.candidates[0]);
      return top;
    });
    let combos = [[]];
    for (const options of kept)
      combos = combos.flatMap((combo) =>
        options.map((candidate) => [...combo, candidate]),
      );
    combos = combos.filter((combo) => !this.conflict(combo));
    if (!combos.length) combos = [kept.map((options) => options[0])];
    const scores = combos.map((combo) =>
      combo.reduce(
        (sum, candidate, index) =>
          sum + rows[index].scoreMap.get(candidate.id).value,
        0,
      ),
    );
    const definition = config.trainer
      ? this.strategies.trainerV2(config.trainer.id)
      : null;
    if (definition?.scoreJoint) {
      const proposals = combos.map((combo, index) => ({
        proposalId: `p${index}`,
        seats: combo.map((candidate) => candidate.id),
      }));
      const view = observationFor({
        battle: b,
        controllerId: owner.id,
        actorUid: null,
        mode: config.information,
        decisionId: `${cacheKey}:joint`,
        decisionRound: b.turn + 1,
        candidates: rows.flatMap((row) =>
          row.candidates.map((c) => this.project(c)),
        ),
        analyses: rows.flatMap((row) => row.analyses),
        memory: this.teamMemory.get(owner.id) || {},
        parameters: config.trainer.parameters,
      });
      const joint = validateJointScores(
        definition.scoreJoint(readOnly({ ...view, proposals })),
        new Set(proposals.map((p) => p.proposalId)),
      );
      for (const entry of joint) {
        const index = Number(entry.proposalId.slice(1));
        scores[index] += entry.value;
      }
    }
    let best = 0;
    for (let i = 1; i < combos.length; i++)
      if (scores[i] > scores[best]) best = i;
    const chosen = new Map();
    combos[best].forEach((candidate, index) =>
      chosen.set(rows[index].seat, candidate),
    );
    return chosen;
  }
  conflict(combo) {
    const b = this.battle,
      switches = new Set(),
      items = new Map(),
      quotas = new Map();
    const overQuota = (limit) => {
      if (!limit) return false;
      const key = b.quotaKey(limit),
        used = b.quotas.used.get(key)?.count || 0,
        reserved = b.reservedQuota(key),
        pending = (quotas.get(key) || 0) + 1;
      quotas.set(key, pending);
      return used + reserved + pending > limit.max;
    };
    for (const candidate of combo) {
      const action = candidate.action;
      if (action.kind === "switch") {
        if (switches.has(action.index)) return true;
        switches.add(action.index);
      } else if (action.kind === "item") {
        items.set(action.item, (items.get(action.item) || 0) + 1);
      }
      if (action.augment) {
        if (
          overQuota(
            b.augments.limit(action, b.augments.registry.get(action.augment)),
          )
        )
          return true;
      }
      for (const entry of action.attachments || [])
        if (
          overQuota(
            b.attachments.limit(
              action,
              entry,
              b.attachments.registry.get(entry.id),
            ),
          )
        )
          return true;
    }
    const owner = b.roster.owner(combo[0].seat);
    for (const [item, count] of items)
      if (count > inventoryQuantity(owner.bag, item)) return true;
    return false;
  }
  pick(owner, row) {
    const sorted = [...row.candidates];
    let best = sorted[0];
    for (const candidate of sorted)
      if (row.scoreMap.get(candidate.id).value > row.scoreMap.get(best.id).value)
        best = candidate;
    if (owner.ai.choice.mode === "topBand") {
      const max = row.scoreMap.get(best.id).value,
        eligible = sorted.filter(
          (candidate) =>
            row.scoreMap.get(candidate.id).value >= max - owner.ai.choice.band,
        );
      return new Map([
        [row.seat, eligible[this.rngFor(owner.id).int(eligible.length)]],
      ]);
    }
    return new Map([[row.seat, best]]);
  }
  record(cacheKey, mode, reason, owner, row, candidate) {
    const decisionId = `${cacheKey}:${row.seat}`;
    this.decisions.set(
      decisionId,
      readOnly({
        decisionId,
        mode,
        replacementReason: reason,
        round: this.battle.turn,
        controller: owner.id,
        seat: row.seat,
        actorUid: row.actorUid,
        chosenId: candidate?.id ?? null,
        rationale: candidate ? row.scoreMap.get(candidate.id).reasons : [],
        scores: row.candidates.slice(0, 8).map((entry) => ({
          candidateId: entry.id,
          value: row.scoreMap.get(entry.id).value,
        })),
      }),
    );
    this.sequence++;
  }
  project(candidate) {
    const action = candidate.action;
    return {
      id: candidate.id,
      kind: candidate.kind,
      seat: candidate.seat,
      actorUid: candidate.actorUid,
      ...(action.index !== undefined ? { index: action.index } : {}),
      ...(action.item ? { item: action.item } : {}),
      ...(action.target ? { target: action.target } : {}),
    };
  }
}
