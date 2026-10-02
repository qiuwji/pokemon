const nameValid = (name) =>
  typeof name === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(name) &&
  !["__proto__", "constructor", "prototype"].includes(name);
const scalarValid = (value) =>
  value === null ||
  typeof value === "boolean" ||
  (typeof value === "string" && value.length <= 4096) ||
  (typeof value === "number" && Number.isFinite(value));
export function validStoryVariables(variables) {
  return (
    variables === undefined ||
    (variables &&
      typeof variables === "object" &&
      !Array.isArray(variables) &&
      Object.entries(variables).length <= 1024 &&
      Object.entries(variables).every(
        ([k, v]) => nameValid(k) && scalarValid(v),
      ))
  );
}
export function validateVariableCommand(command) {
  if (
    !nameValid(command.name) ||
    !["set", "add"].includes(command.operation || "set") ||
    !scalarValid(command.value) ||
    (command.operation === "add" && typeof command.value !== "number")
  )
    throw new Error("Invalid story variable command");
}
export function changeStoryVariable(progress, command) {
  validateVariableCommand(command);
  const variables = progress.variables || {},
    value =
      command.operation === "add"
        ? (variables[command.name] ?? 0) + command.value
        : command.value;
  if (
    (command.operation === "add" &&
      typeof variables[command.name] !== "number" &&
      variables[command.name] !== undefined) ||
    !scalarValid(value)
  )
    throw new Error("Invalid story variable result");
  const next = { ...variables, [command.name]: value };
  if (!validStoryVariables(next)) throw new Error("Story variable limit");
  progress.variables = next;
  return value;
}
