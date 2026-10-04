/**
 * @typedef {null | boolean | string | number} StoryScalar
 * @typedef {{name:string,operation?:'set'|'add',value:StoryScalar}} StoryVariableCommand
 * @typedef {{variables?:Record<string,StoryScalar>}} StoryProgress
 */
/** @param {unknown} name */
const nameValid = (name) =>
  typeof name === "string" &&
  /^[a-zA-Z0-9_.:-]{1,128}$/.test(name) &&
  !["__proto__", "constructor", "prototype"].includes(name);
/** @param {unknown} value */
const scalarValid = (value) =>
  value === null ||
  typeof value === "boolean" ||
  (typeof value === "string" && value.length <= 4096) ||
  (typeof value === "number" && Number.isFinite(value));
/** @param {unknown} variables */
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
/** @param {StoryVariableCommand} command */
export function validateVariableCommand(command) {
  if (
    !nameValid(command.name) ||
    !["set", "add"].includes(command.operation || "set") ||
    !scalarValid(command.value) ||
    (command.operation === "add" && typeof command.value !== "number")
  )
    throw new Error("Invalid story variable command");
}
/** @param {StoryProgress} progress @param {StoryVariableCommand} command */
export function changeStoryVariable(progress, command) {
  validateVariableCommand(command);
  const variables = progress.variables || {};
  let value = command.value;
  if (command.operation === "add") {
    const previous = variables[command.name];
    if (
      (previous !== undefined && typeof previous !== "number") ||
      typeof command.value !== "number"
    )
      throw new Error("Invalid story variable result");
    value = (previous ?? 0) + command.value;
  }
  if (!scalarValid(value)) throw new Error("Invalid story variable result");
  const next = { ...variables, [command.name]: value };
  if (!validStoryVariables(next)) throw new Error("Story variable limit");
  progress.variables = next;
  return value;
}
