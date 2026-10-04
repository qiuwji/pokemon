import { readOnly } from "./extensions/values.js";
const exact = (value, keys) =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((k) => keys.includes(k));
const bounded = (n, min, max) =>
  Number.isSafeInteger(n) && n >= min && n <= max;
/** Dialogue is data: text, spans and pauses. No markup, timers, callbacks or rule decisions. */
export function dialogueDescription(
  { name, lines, speed = 30, mode = "typewriter" },
  validateEffect = () => {},
) {
  if (
    typeof name !== "string" ||
    name.length > 128 ||
    !Array.isArray(lines) ||
    !lines.length ||
    lines.length > 128 ||
    !bounded(speed, 0, 1000) ||
    !["typewriter", "instant"].includes(mode)
  )
    throw new Error("Invalid dialogue description");
  let characters = 0;
  const normalized = lines.map((line) => {
    const runs =
      typeof line === "string"
        ? [{ text: line }]
        : exact(line, ["runs"]) && line.runs;
    if (!Array.isArray(runs) || !runs.length || runs.length > 512)
      throw new Error("Invalid dialogue line");
    let pauses = 0;
    for (const run of runs) {
      if (exact(run, ["pauseMs"]) && run.pauseMs !== undefined) {
        if (!bounded(run.pauseMs, 0, 5000) || (pauses += run.pauseMs) > 60000)
          throw new Error("Invalid dialogue pause");
        continue;
      }
      if (
        !exact(run, ["text", "color", "effect", "parameters"]) ||
        typeof run.text !== "string" ||
        run.text.length > 4096 ||
        (run.color !== undefined &&
          (typeof run.color !== "string" ||
            !/^#[\da-f]{6}$/i.test(run.color))) ||
        (run.effect !== undefined &&
          (typeof run.effect !== "string" || !run.effect)) ||
        (run.parameters !== undefined && !run.effect) ||
        (characters += run.text.length) > 8192
      )
        throw new Error("Invalid dialogue text run");
      if (run.effect) validateEffect(run.effect, run.parameters);
    }
    return readOnly({ runs, text: runs.map((r) => r.text || "").join("") });
  });
  return readOnly({
    name,
    lines: normalized,
    speed,
    mode: speed === 0 ? "instant" : mode,
  });
}
