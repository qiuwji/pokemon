import { objectSchema } from "../values.js";
import { text, integer, array, transfer, reward, parameters, validateRewards } from "./shared.js";

const appeal = objectSchema({
  id: text, label: text, points: integer(0, 1000), jam: integer(0, 1000),
  crowd: integer(0, 100), comboFrom: array(text, 0, 32), comboBonus: integer(0, 1000),
  repeatPenalty: integer(0, 1000),
}, ["id", "label", "points"]);
const schema = objectSchema({
  rounds: integer(1, 20), appeals: array(appeal, 1, 32),
  opponents: array(objectSchema({ name: text, scores: array(integer(0, 10000), 1, 20) }, ["name", "scores"]), 1, 7),
  crowdThreshold: integer(1, 100), crowdBonus: integer(0, 1000),
  prizes: array(objectSchema({ rank: integer(1, 8), reward: transfer }, ["rank", "reward"]), 0, 8),
}, ["rounds", "appeals", "opponents", "prizes"]);

/** Configurable round scoring, combinations and ranking. Not a claim of native contest fidelity. */
export function scoreContest(config) {
  const p = parameters(schema, config), ids = p.appeals.map(a => a.id);
  if (new Set(ids).size !== ids.length || ids.some(id => !/^[a-z][a-z0-9_.-]{0,63}$/.test(id)) ||
      p.opponents.some(o => o.scores.length !== p.rounds) ||
      p.appeals.some(a => (a.comboFrom || []).some(id => !ids.includes(id))) ||
      new Set(p.prizes.map(p => p.rank)).size !== p.prizes.length ||
      p.prizes.some(prize => prize.rank > p.opponents.length + 1))
    throw new Error("Invalid score-contest references, rounds or prize rank");
  return {
    parameters: schema,
    state: objectSchema({ round: integer(0, p.rounds), score: integer(0, 1000000),
      crowd: integer(0, p.rounds * 100), last: { type: "string", maxLength: 128 },
      opponents: array(integer(0, 1000000), p.opponents.length, p.opponents.length),
      rank: integer(0, p.opponents.length + 1) }, ["round", "score", "crowd", "last", "opponents", "rank"]),
    initial: { round: 0, score: 0, crowd: 0, last: "", opponents: p.opponents.map(() => 0), rank: 0 },
    validate(definition, refs) { validateRewards(definition.parameters.prizes.map(prize => prize.reward), refs); },
    actions: Object.fromEntries(p.appeals.map(a => [a.id, {
      label: a.label, schema: objectSchema(),
      when: ({ data, parameters: p }) => data.round < p.rounds,
      decide({ data, parameters: p }) {
        const move = p.appeals.find(move => move.id === a.id);
        let crowd = data.crowd + (move.crowd || 0), bonus = 0;
        if (p.crowdThreshold && crowd >= p.crowdThreshold) { bonus = p.crowdBonus || 0; crowd = 0; }
        const points = Math.max(0, move.points + bonus + ((move.comboFrom || []).includes(data.last) ? move.comboBonus || 0 : 0)
          - (data.last === move.id ? move.repeatPenalty || 0 : 0));
        const next = { round: data.round + 1, score: data.score + points, crowd, last: move.id,
          opponents: data.opponents.map((score, i) => Math.max(0, score + p.opponents[i].scores[data.round] - (move.jam || 0))), rank: 0 };
        if (next.round < p.rounds) return { data: next };
        // Equal scores share the same rank; configured reward follows that rank.
        next.rank = 1 + next.opponents.filter(score => score > next.score).length;
        const prize = p.prizes.find(prize => prize.rank === next.rank);
        return prize ? { data: next, pendingReward: reward(prize.reward) } : { data: next, outcome: next.rank === 1 ? "win" : "loss" };
      },
    }])),
  };
}
