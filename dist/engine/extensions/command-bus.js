import {
  jsonValue,
  readOnly,
  validateSchema,
  validateValue,
} from "./values.js";
export class CommandError extends Error {
  constructor(code, message = code) {
    super(message);
    this.code = code;
  }
}
/** Shared application command registry. Instant input remains synchronous; async commands are serial. */
export class CommandBus {
  constructor({ ready = () => true, onComplete = () => {} } = {}) {
    this.ready = ready;
    this.onComplete = onComplete;
    this.definitions = new Map();
    this.active = null;
  }
  register(id, definition) {
    if (
      typeof id !== "string" ||
      !/^[a-z][a-z0-9_.:-]{0,127}$/.test(id) ||
      this.definitions.has(id) ||
      typeof definition.run !== "function" ||
      !["instant", "async"].includes(definition.mode || "instant")
    )
      throw new Error(`Invalid command ${id}`);
    const schema = validateSchema(definition.schema);
    this.definitions.set(
      id,
      Object.freeze({
        ...definition,
        schema,
        mode: definition.mode || "instant",
      }),
    );
  }
  definition(id) {
    return this.definitions.get(id);
  }
  prepare(id, input, source) {
    const command = this.definition(id);
    if (!command) throw new CommandError("unknown_command");
    if (!["ui", "plugin", "network", "system"].includes(source))
      throw new CommandError("invalid_source");
    if (source === "network" && command.network !== true)
      throw new CommandError("not_network_enabled");
    const args = jsonValue(input);
    validateValue(command.schema, args);
    if (
      (this.active && !command.concurrent) ||
      !this.ready(command, source, args)
    )
      throw new CommandError("busy");
    return { command, args: readOnly(args) };
  }
  executeSync(id, input = {}, source = "ui") {
    const { command, args } = this.prepare(id, input, source);
    if (command.mode !== "instant") throw new CommandError("async_command");
    const result = command.run(args, source);
    if (result?.then)
      throw new CommandError(
        "invalid_handler",
        "Instant handler returned an async result",
      );
    this.onComplete(id, args, result);
    return result;
  }
  async execute(id, input = {}, source = "ui") {
    const { command, args } = this.prepare(id, input, source);
    if (command.mode === "instant") {
      const result = command.run(args, source);
      if (result?.then) throw new CommandError("invalid_handler");
      this.onComplete(id, args, result);
      return result;
    }
    this.active = id;
    try {
      const result = await command.run(args, source);
      this.onComplete(id, args, result);
      return result;
    } finally {
      this.active = null;
    }
  }
}
