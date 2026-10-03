import { callSync, readOnly } from "./extensions/values.js";
const id = (value) =>
  typeof value === "string" && /^[a-z][a-z0-9_.:-]{0,127}$/.test(value);
/** Selects one channel policy before any random sampling. Map, terrain and story flags belong to rules. */
export class EncounterPolicyRegistry {
  constructor(definitions = {}) {
    this.definitions = new Map();
    for (const [key, d] of Object.entries(definitions)) {
      if (
        !id(key) ||
        !d ||
        Object.keys(d).some(
          (k) => !["channel", "priority", "when", "decide"].includes(k),
        ) ||
        !id(d.channel) ||
        (d.priority !== undefined &&
          (!Number.isInteger(d.priority) || Math.abs(d.priority) > 10000)) ||
        (d.when !== undefined && typeof d.when !== "function") ||
        typeof d.decide !== "function"
      )
        throw new Error(`Invalid encounter policy ${key}`);
      this.definitions.set(
        key,
        Object.freeze({ ...d, id: key, priority: d.priority || 0 }),
      );
    }
  }
  resolve(channel, context) {
    if (!id(channel)) throw new Error("Invalid encounter channel");
    const c = readOnly(context),
      eligible = [];
    for (const d of this.definitions.values())
      if (d.channel === channel) {
        const matches = d.when ? callSync(d.when, [c]) : true;
        if (typeof matches !== "boolean")
          throw new Error("Encounter policy condition must return a boolean");
        if (matches) eligible.push(d);
      }
    eligible.sort((a, b) => b.priority - a.priority);
    if (eligible.length > 1 && eligible[0].priority === eligible[1].priority)
      throw new Error("Ambiguous encounter channel policy");
    const chosen = eligible[0];
    if (!chosen) return null;
    const decision = readOnly(callSync(chosen.decide, [c]));
    if (
      decision !== null &&
      (!decision ||
        Array.isArray(decision) ||
        Object.keys(decision).some(
          (k) =>
            ![
              "area",
              "checkRate",
              "checkSelection",
              "checkPermission",
            ].includes(k),
        ) ||
        !["land", "water", "fishing", "rock"].includes(decision.area) ||
        ["checkRate", "checkSelection", "checkPermission"].some(
          (k) => decision[k] !== undefined && typeof decision[k] !== "boolean",
        ))
    )
      throw new Error("Invalid encounter policy decision");
    return Object.freeze({ policy: chosen.id, channel, decision });
  }
}
