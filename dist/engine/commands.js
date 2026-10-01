/** Ordered story commands with explicit handlers supplied by each game. */
export class CommandRunner {
  constructor(handlers) {
    this.handlers = handlers;
  }
  async run(commands) {
    for (const command of commands) {
      const handler = this.handlers[command.type];
      if (!handler) throw new Error(`Unknown story command: ${command.type}`);
      await handler(command);
    }
  }
}
