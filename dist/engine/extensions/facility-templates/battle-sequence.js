import { objectSchema } from "../values.js";
import { text, integer, array, parameters } from "./shared.js";
const schema = objectSchema({ trainers: array(text, 1, 100), money: integer(0, 100000000), item: text }, ["trainers", "money"]);

/** Isolated trainer rounds; no story prizes, original-team mutation or facility-specific branches. */
export function battleSequence(config) {
  parameters(schema, config);
  return {
    parameters: schema, state: objectSchema({ round: integer(0, 100) }, ["round"]), initial: { round: 0 },
    validate(definition, refs) {
      if (!definition.team) throw new Error("Battle facility requires a team policy");
      for (const id of definition.parameters.trainers) {
        const trainer = refs.trainers[id];
        if (!trainer || definition.team.min < (trainer.requiresPartners || (trainer.format === "doubles" ? 2 : 1)))
          throw new Error("Invalid facility trainer or team size");
      }
      if (definition.parameters.item && !Object.hasOwn(refs.items, definition.parameters.item))
        throw new Error("Unknown facility reward item");
    },
    actions: { next: { label: "开始下一场", schema: objectSchema(),
      when: ({ data, parameters: p }) => data.round < p.trainers.length,
      decide: ({ data, parameters: p }) => ({ data, battle: { trainerId: p.trainers[data.round], weather: null } }),
    } },
    onBattle({ data, parameters: p }, result) {
      if (result === "loss") return { data, outcome: "loss" };
      const next = { round: data.round + 1 };
      return next.round === p.trainers.length ? { data: next, pendingReward: {
        money: p.money, ...(p.item ? { items: { [p.item]: 1 } } : {}),
      } } : { data: next };
    },
  };
}
