/** Pure generation-III numeric modifiers. Both direct model calculations and battle phases share these definitions. */
import { isPhysical } from "../../type-rules.js";
export { isPhysical } from "../../type-rules.js";
export const NUMERIC_ABILITIES = {
  guts: [
    { phase: "burn-modifier", role: "actor", priority: 70, modify: () => 1 },
    {
      phase: "attack",
      role: "actor",
      priority: 70,
      modify: (v, c) =>
        c.stat === "atk" && c.owner.status ? Math.floor(v * 1.5) : v,
    },
  ],
  huge_power: [
    {
      phase: "attack",
      role: "actor",
      priority: 10,
      modify: (v, c) => (c.stat === "atk" ? v * 2 : v),
    },
  ],
  pure_power: [
    {
      phase: "attack",
      role: "actor",
      priority: 10,
      modify: (v, c) => (c.stat === "atk" ? v * 2 : v),
    },
  ],
  hustle: [
    {
      phase: "attack",
      role: "actor",
      priority: 50,
      modify: (v, c) => (c.stat === "atk" ? Math.floor(v * 1.5) : v),
    },
    {
      phase: "accuracy",
      role: "actor",
      priority: 30,
      modify: (v, c) => (isPhysical(c.move) ? Math.floor(v * 0.8) : v),
    },
  ],
  marvel_scale: [
    {
      phase: "defense",
      role: "target",
      priority: 70,
      modify: (v, c) =>
        c.stat === "def" && c.owner.status ? Math.floor(v * 1.5) : v,
    },
  ],
  thick_fat: [
    {
      phase: "attack",
      role: "target",
      priority: 40,
      modify: (v, c) =>
        c.stat === "spa" && ["fire", "ice"].includes(c.move.type)
          ? Math.floor(v / 2)
          : v,
    },
  ],
  overgrow: [
    {
      phase: "power",
      role: "actor",
      modify: (v, c) =>
        c.move.type === "grass" && c.owner.hp <= c.owner.stats.hp / 3
          ? Math.floor(v * 1.5)
          : v,
    },
  ],
  blaze: [
    {
      phase: "power",
      role: "actor",
      modify: (v, c) =>
        c.move.type === "fire" && c.owner.hp <= c.owner.stats.hp / 3
          ? Math.floor(v * 1.5)
          : v,
    },
  ],
  torrent: [
    {
      phase: "power",
      role: "actor",
      modify: (v, c) =>
        c.move.type === "water" && c.owner.hp <= c.owner.stats.hp / 3
          ? Math.floor(v * 1.5)
          : v,
    },
  ],
  swarm: [
    {
      phase: "power",
      role: "actor",
      modify: (v, c) =>
        c.move.type === "bug" && c.owner.hp <= c.owner.stats.hp / 3
          ? Math.floor(v * 1.5)
          : v,
    },
  ],
  compound_eyes: [
    {
      phase: "accuracy",
      role: "actor",
      priority: 10,
      modify: (v) => Math.floor(v * 1.3),
    },
  ],
  sand_veil: [
    {
      phase: "accuracy",
      role: "target",
      priority: 20,
      priority: 10,
      modify: (v, c) => (c.weather === "sand" ? Math.floor(v * 0.8) : v),
    },
  ],
  swift_swim: [
    {
      phase: "speed-base",
      role: "actor",
      modify: (v, c) => (c.weather === "rain" ? v * 2 : v),
    },
  ],
  chlorophyll: [
    {
      phase: "speed-base",
      role: "actor",
      modify: (v, c) => (c.weather === "sun" ? v * 2 : v),
    },
  ],
  serene_grace: [
    { phase: "secondary-chance", role: "actor", modify: (v) => v * 2 },
  ],
  pressure: [{ phase: "pp-cost", role: "target", modify: (v) => v + 1 }],
  plus: [
    {
      phase: "attack",
      role: "actor",
      priority: 60,
      modify: (v, c) =>
        c.stat === "spa" &&
        c.fieldCombatants?.some((m) => m.ability === "minus")
          ? Math.floor(v * 1.5)
          : v,
    },
  ],
  minus: [
    {
      phase: "attack",
      role: "actor",
      priority: 60,
      modify: (v, c) =>
        c.stat === "spa" && c.fieldCombatants?.some((m) => m.ability === "plus")
          ? Math.floor(v * 1.5)
          : v,
    },
  ],
};
/** Default adapter for callers without a battle session (damage formula tools, tests). */
export function defaultAbilityModifier(phase, value, c) {
  const hooks = [];
  for (const [owner, role] of [
    [c.attacker, "actor"],
    [c.defender, "target"],
  ])
    for (const hook of NUMERIC_ABILITIES[owner.ability] || [])
      if (hook.phase === phase && hook.role === role)
        hooks.push({ hook, owner });
  for (const { hook, owner } of hooks.sort(
    (a, b) => (a.hook.priority || 0) - (b.hook.priority || 0),
  ))
    value = hook.modify(value, { ...c, owner, weather: null });
  return value;
}
