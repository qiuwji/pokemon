import { objectSchema } from "../values.js";
import { text, integer, array, parameters } from "./shared.js";
const schema = objectSchema({
  stake: integer(1, 100000), reels: array(array(text, 2, 256), 2, 8),
  lines: array(array(integer(-1, 1), 2, 8), 1, 32),
  payouts: array(objectSchema({ pattern: array(text, 2, 8), multiplier: integer(1, 10000) }, ["pattern", "multiplier"]), 1, 64),
}, ["stake", "reels", "lines", "payouts"]);

/** Configured strips and paylines; RNG, costs and settlement stay in FacilityApplication. */
export function reelMachine(config) {
  const p = parameters(schema, config), count = p.reels.length;
  if (p.lines.some(line => line.length !== count) ||
      p.payouts.some(pay => pay.pattern.length !== count || pay.pattern.some((s,i) => s !== "*" && !p.reels[i].includes(s))) ||
      new Set(p.lines.map(line => JSON.stringify(line))).size !== p.lines.length ||
      p.stake * Math.max(...p.payouts.map(pay => pay.multiplier)) * p.lines.length > 100000000)
    throw new Error("Invalid reel-machine line, symbol or payout limit");
  const stopped = (data) => data.stopped.filter(Boolean).length;
  return {
    parameters: schema,
    state: objectSchema({ spinning: { type: "boolean" }, positions: array(integer(0, 255), count, count),
      stopped: array({ type: "boolean" }, count, count), winnings: integer(0, 100000000) }, ["spinning", "positions", "stopped", "winnings"]),
    initial: { spinning: false, positions: p.reels.map(() => 0), stopped: p.reels.map(() => false), winnings: 0 },
    actions: {
      spin: { label: "投入并转动", schema: objectSchema(), draws: p.reels.map(reel => reel.length),
        when: ({ data }) => !data.spinning,
        decide: ({ parameters: p, rolls }) => ({ cost: { money: p.stake },
          data: { spinning: true, positions: rolls, stopped: p.reels.map(() => false), winnings: 0 } }) },
      ...Object.fromEntries(p.reels.map((_, i) => [`stop-${i + 1}`, {
        label: `停止第 ${i + 1} 轮`, schema: objectSchema(),
        when: ({ data }) => data.spinning && !data.stopped[i],
        decide({ data, parameters: p }) {
          const next = { ...data, stopped: data.stopped.map((value, index) => index === i || value) };
          if (stopped(next) < count) return { data: next };
          const multiplier = p.lines.reduce((total, line) => {
            const symbols = p.reels.map((reel, index) => reel[(next.positions[index] + line[index] + reel.length) % reel.length]);
            const matches = p.payouts.filter(pay => pay.pattern.every((s, index) => s === "*" || s === symbols[index]));
            return total + Math.max(0, ...matches.map(pay => pay.multiplier));
          }, 0);
          next.winnings = multiplier * p.stake;
          return next.winnings ? { data: next, pendingReward: { money: next.winnings } } : { data: next, outcome: "loss" };
        },
      }])),
    },
  };
}
