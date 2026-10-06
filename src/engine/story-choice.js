import { validateCondition, matchesCondition } from "./conditions.js";

export function validateChoicePolicy(command, eventIds, queries) {
  if (
    command.timeoutMs !== undefined &&
    (!Number.isSafeInteger(command.timeoutMs) ||
      command.timeoutMs < 1 ||
      command.timeoutMs > 60000 ||
      !command.default)
  )
    throw new Error("Invalid story choice timeout");
  if (
    command.default !== undefined &&
    !command.options.some((o) => o.id === command.default)
  )
    throw new Error("Invalid story choice default");
  for (const option of command.options) {
    validateCondition(
      option.visibleWhen,
      eventIds,
      "choice.visibleWhen",
      queries,
    );
    validateCondition(
      option.enabledWhen,
      eventIds,
      "choice.enabledWhen",
      queries,
    );
    if (
      option.disabledReason !== undefined &&
      (typeof option.disabledReason !== "string" ||
        option.disabledReason.length > 256)
    )
      throw new Error("Invalid story choice disabled reason");
  }
}
export function choiceOptions(command, state, queries) {
  const options = command.options
    .filter((o) => matchesCondition(o.visibleWhen, state, queries))
    .map((o) => ({
      id: o.id,
      label: o.label,
      disabled: !matchesCondition(o.enabledWhen, state, queries),
      disabledReason: o.disabledReason || "暂时不能选择。",
    }));
  if (!options.some((o) => !o.disabled))
    throw new Error("Story choice has no available options");
  for (const key of ["cancel", "default"])
    if (
      command[key] &&
      !options.some((o) => o.id === command[key] && !o.disabled)
    )
      throw new Error(`Story choice ${key} unavailable`);
  return options;
}
