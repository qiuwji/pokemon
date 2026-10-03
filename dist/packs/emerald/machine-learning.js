import { MACHINES } from "../../engine/rules/gen3/machine-learning.js";
export const EMERALD_LEARNING_METHODS = Object.fromEntries(
  Object.entries(MACHINES).map(([id, machine]) => [
    id,
    {
      move: machine.move,
      item: id,
      consume: machine.consume,
      protectMove: machine.protected,
      friendship: true,
      eligible: ({ species }) =>
        (species.machineMoves ?? []).includes(machine.move),
    },
  ]),
);
export const MACHINE_ITEMS = Object.fromEntries(
  Object.entries(MACHINES).map(([id, machine]) => [
    id,
    {
      learningMethod: id,
      pocket: "machines",
      shopStock: false,
      description: `${machine.kind.toUpperCase()}${String(machine.number).padStart(2, "0")} · ${machine.kind === "tm" ? "成功学习后消耗。" : "可重复使用，招式不能在普通学习中遗忘。"}`,
      contexts: ["field"],
      target: "party",
      effects: [],
    },
  ]),
);
