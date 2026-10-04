import { readOnly } from "./extensions/values.js";
import { textRuns } from "./dialogue-content.js";
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
        ? textRuns(line)
        : exact(line, ["runs", "text", "name", "portrait", "expression"]) &&
          !(line.text !== undefined && line.runs !== undefined) &&
          (line.text !== undefined ? textRuns(line.text) : line.runs);
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
        !exact(run, ["text", "color", "effect", "parameters", "bold"]) ||
        typeof run.text !== "string" ||
        run.text.length > 4096 ||
        (run.color !== undefined &&
          (typeof run.color !== "string" ||
            !/^#[\da-f]{6}$/i.test(run.color))) ||
        (run.effect !== undefined &&
          (typeof run.effect !== "string" || !run.effect)) ||
        (run.parameters !== undefined && !run.effect) ||
        (run.bold !== undefined && typeof run.bold !== "boolean") ||
        (characters += run.text.length) > 8192
      )
        throw new Error("Invalid dialogue text run");
      if (run.effect) validateEffect(run.effect, run.parameters);
    }
    const speaker = typeof line === "string" ? {} : line;
    if (
      speaker.name !== undefined &&
      (typeof speaker.name !== "string" || speaker.name.length > 128)
    )
      throw new Error("Invalid dialogue speaker");
    if (
      speaker.expression !== undefined &&
      (typeof speaker.expression !== "string" || speaker.expression.length > 64)
    )
      throw new Error("Invalid dialogue expression");
    if (
      speaker.portrait !== undefined &&
      (!exact(speaker.portrait, ["src", "alt"]) ||
        typeof speaker.portrait.src !== "string" ||
        !/^assets\/[a-zA-Z0-9_./-]+\.(png|webp|gif)$/.test(
          speaker.portrait.src,
        ) ||
        speaker.portrait.src.split("/").includes("..") ||
        typeof speaker.portrait.alt !== "string" ||
        speaker.portrait.alt.length > 128)
    )
      throw new Error("Invalid dialogue portrait");
    return readOnly({
      runs,
      text: runs.map((r) => r.text || "").join(""),
      ...(speaker.name !== undefined ? { name: speaker.name } : {}),
      ...(speaker.portrait !== undefined ? { portrait: speaker.portrait } : {}),
      ...(speaker.expression !== undefined
        ? { expression: speaker.expression }
        : {}),
    });
  });
  return readOnly({
    name,
    lines: normalized,
    speed,
    mode: speed === 0 ? "instant" : mode,
  });
}
