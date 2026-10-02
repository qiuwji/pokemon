/** Ordered story commands with explicit handlers supplied by each game. */
export class CommandRunner {
  constructor(
    handlers,
    {
      resources = () => [],
      validateCommand = () => {},
      testCondition,
      choose,
    } = {},
  ) {
    this.handlers = handlers;
    this.testCondition = testCondition;
    this.choose = choose;
    this.resources = resources;
    this.validateCommand = validateCommand;
  }
  validate(commands) {
    if (!Array.isArray(commands))
      throw new Error("Story commands must be an array");
    for (const c of commands) {
      if (!c || typeof c.type !== "string")
        throw new Error("Invalid story command");
      if (c.type === "if") {
        if (!this.testCondition)
          throw new Error("Story conditions unavailable");
        this.validateCommand(c);
        this.validate(c.then);
        this.validate(c.else || []);
      } else if (c.type === "choice") {
        if (
          !this.choose ||
          !Array.isArray(c.options) ||
          c.options.length < 2 ||
          c.options.length > 16 ||
          typeof c.name !== "string" ||
          typeof c.prompt !== "string" ||
          new Set(c.options.map((o) => o.id)).size !== c.options.length ||
          c.options.some(
            (o) =>
              typeof o.id !== "string" ||
              !o.id ||
              typeof o.label !== "string" ||
              !o.label,
          )
        )
          throw new Error("Invalid story choice");
        if (c.cancel !== undefined && !c.options.some((o) => o.id === c.cancel))
          throw new Error("Invalid story choice cancellation");
        this.validateCommand(c);
        for (const option of c.options) this.validate(option.commands || []);
      } else if (c.type === "sequence" || c.type === "parallel") {
        this.validate(c.commands);
        if (c.type === "parallel") {
          const owned = new Set();
          for (const branch of c.commands) {
            for (const key of this.claims(branch)) {
              if (key === "*" && c.commands.length > 1)
                throw new Error(
                  "Scene changes and modal commands cannot run in parallel",
                );
              if (owned.has(key))
                throw new Error(`Parallel story conflict: ${key}`);
              owned.add(key);
            }
          }
        }
      } else if (!this.handlers[c.type]) {
        throw new Error(`Unknown story command: ${c.type}`);
      } else this.validateCommand(c);
    }
  }
  claims(command) {
    if (command.type === "if")
      return new Set(
        [...command.then, ...(command.else || [])].flatMap((c) => [
          ...this.claims(c),
        ]),
      );
    if (command.type === "choice")
      return new Set([
        "*",
        ...command.options.flatMap((o) =>
          (o.commands || []).flatMap((c) => [...this.claims(c)]),
        ),
      ]);
    if (command.type === "sequence" || command.type === "parallel")
      return new Set(command.commands.flatMap((c) => [...this.claims(c)]));
    return new Set(this.resources(command));
  }
  async run(commands) {
    // Validate the entire tree before the first side effect.
    this.validate(commands);
    await this.sequence(commands);
  }
  async sequence(commands) {
    for (const command of commands) {
      await this.execute(command);
    }
  }
  async execute(c) {
    if (c.type === "if")
      return this.sequence(
        this.testCondition(c.condition) ? c.then : c.else || [],
      );
    if (c.type === "choice") {
      const id = await this.choose(c);
      const selected = c.options.find((o) => o.id === id);
      if (!selected) throw new Error("Invalid story choice result");
      return this.sequence(selected.commands || []);
    }
    if (c.type === "sequence") return this.sequence(c.commands);
    if (c.type === "parallel") {
      // Drain every branch before releasing the scene. No late writes after a failure.
      const results = await Promise.allSettled(
        c.commands.map((b) => this.execute(b)),
      );
      const failed = results.find((r) => r.status === "rejected");
      if (failed) throw failed.reason;
      return;
    }
    return this.handlers[c.type](c);
  }
}
