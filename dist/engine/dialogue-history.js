import { readOnly } from "./extensions/values.js";
export const HISTORY_LIMIT = 128;
export const HISTORY_CHARACTERS = 65536;
const count = (entries) =>
  entries.reduce(
    (n, entry) => n + entry.lines.reduce((m, line) => m + line.text.length, 0),
    0,
  );
export function validDialogueHistory(history = []) {
  return (
    Array.isArray(history) &&
    history.length <= HISTORY_LIMIT &&
    history.every(
      (e) =>
        e &&
        typeof e.name === "string" &&
        e.name.length <= 128 &&
        (e.source === undefined ||
          (typeof e.source === "string" && e.source.length <= 256)) &&
        Array.isArray(e.lines) &&
        e.lines.length > 0 &&
        e.lines.length <= 128 &&
        e.lines.every(
          (line) =>
            line &&
            typeof line.name === "string" &&
            line.name.length <= 128 &&
            typeof line.text === "string" &&
            line.text.length <= 8192,
        ),
    ) &&
    count(history) <= HISTORY_CHARACTERS
  );
}
/** Append confirmed content only. Replaying a log never executes commands. */
export function recordDialogue(progress, description, source) {
  const entry = {
    name: description.name,
    ...(source ? { source } : {}),
    lines: description.lines.map((line) => ({
      name: line.name ?? description.name,
      text: line.text,
    })),
  };
  const history = [...(progress.history || []), entry];
  while (history.length > HISTORY_LIMIT || count(history) > HISTORY_CHARACTERS)
    history.shift();
  if (!validDialogueHistory(history))
    throw new Error("Invalid dialogue history");
  progress.history = history;
}
export const dialogueHistory = (progress) => readOnly(progress.history || []);
