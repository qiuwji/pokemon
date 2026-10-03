import { readOnly } from "../extensions/values.js";
const TYPES = new Set([
  "normal",
  "fire",
  "water",
  "electric",
  "grass",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "dragon",
  "dark",
  "steel",
]);
/** Battle weather policies. Trait hooks still own damage/accuracy/speed modifiers and suppression. */
export class BattleWeatherRegistry {
  constructor(definitions) {
    this.definitions = readOnly(definitions);
    for (const [id, d] of Object.entries(this.definitions)) {
      if (
        !id ||
        !d ||
        Object.keys(d).some(
          (k) => !["visual", "weatherBall", "residual"].includes(k),
        ) ||
        (d.visual !== undefined &&
          (typeof d.visual !== "string" || !d.visual)) ||
        (d.weatherBall !== undefined && !TYPES.has(d.weatherBall))
      )
        throw new Error("Invalid battle weather");
      if (
        d.residual &&
        (Object.keys(d.residual).some(
          (k) => !["divisor", "immuneTypes"].includes(k),
        ) ||
          !Number.isSafeInteger(d.residual.divisor) ||
          d.residual.divisor < 1 ||
          !Array.isArray(d.residual.immuneTypes) ||
          d.residual.immuneTypes.some((t) => !TYPES.has(t)))
      )
        throw new Error("Invalid weather residual");
    }
  }
  get(id) {
    if (!Object.hasOwn(this.definitions, id))
      throw new Error(`Unknown battle weather ${id}`);
    return this.definitions[id];
  }
  validateEffects(effects, traits = []) {
    const visit = (value) => {
      if (!value || typeof value !== "object") return;
      if (value.op === "setWeather") this.get(value.weather);
      if (value.skipWeather !== undefined) this.get(value.skipWeather);
      for (const child of Object.values(value)) visit(child);
    };
    visit(effects.definitions);
    traits.forEach(visit);
  }
}
