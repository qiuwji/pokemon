import { jsonValue } from "./extensions/values.js";
export function validStoryActors(actors) {
  return (
    Array.isArray(actors) &&
    actors.length <= 64 &&
    new Set(actors.map((actor) => actor?.id)).size === actors.length &&
    actors.every(
      (actor) =>
        actor &&
        typeof actor === "object" &&
        Object.keys(actor).every((key) =>
          ["id", "x", "y", "dir", "actor", "name", "kind", "hidden"].includes(
            key,
          ),
        ) &&
        typeof actor.id === "string" &&
        actor.id.length > 0 &&
        actor.id.length <= 256 &&
        typeof actor.actor === "string" &&
        actor.actor.length > 0 &&
        actor.actor.length <= 256 &&
        Number.isSafeInteger(actor.x) &&
        actor.x >= 0 &&
        Number.isSafeInteger(actor.y) &&
        actor.y >= 0 &&
        ["up", "down", "left", "right"].includes(actor.dir) &&
        ["name", "kind"].every(
          (key) =>
            actor[key] === undefined ||
            (typeof actor[key] === "string" && actor[key].length <= 256),
        ) &&
        (actor.hidden === undefined || typeof actor.hidden === "boolean"),
    )
  );
}
export function validStorySession(value) {
  if (value === undefined || value === null) return true;
  try {
    jsonValue(value);
    return (
      Object.keys(value).every((k) =>
        [
          "script",
          "input",
          "cursor",
          "status",
          "steps",
          "event",
          "token",
          "actors",
        ].includes(k),
      ) &&
      typeof value.script === "string" &&
      value.script.length > 0 &&
      value.script.length <= 256 &&
      typeof value.input === "object" &&
      value.input !== null &&
      !Array.isArray(value.input) &&
      (value.cursor === null ||
        (typeof value.cursor === "string" &&
          value.cursor.length > 0 &&
          value.cursor.length <= 1024)) &&
      ["ready", "battle"].includes(value.status) &&
      Number.isSafeInteger(value.steps) &&
      value.steps >= 0 &&
      value.steps <= 10000 &&
      (value.event === undefined ||
        (typeof value.event === "string" && value.event.length <= 256)) &&
      (value.actors === undefined || validStoryActors(value.actors)) &&
      (value.token === undefined ||
        (value.status === "battle" &&
          typeof value.token === "string" &&
          value.token.length <= 1536))
    );
  } catch {
    return false;
  }
}
/** Persistent cursor only. Commands execute through the existing runner and domain ports. */
export class StorySession {
  constructor({
    catalog,
    execute,
    choose,
    testCondition,
    checkpoint,
    startBattle,
    complete,
  }) {
    Object.assign(this, {
      catalog,
      execute,
      choose,
      testCondition,
      checkpoint,
      startBattle,
      complete,
    });
  }
  validate(record) {
    if (!validStorySession(record)) throw new Error("Invalid story session");
    if (!record) return true;
    const program = this.catalog.program(record.script, record.input);
    if (record.cursor !== null && !program.nodes.has(record.cursor))
      throw new Error(`Unknown story resume node: ${record.cursor}`);
    if (
      record.status === "battle" &&
      (!record.token ||
        program.nodes.get(record.cursor)?.command.type !== "battle")
    )
      throw new Error("Invalid story battle wait");
    return true;
  }
  async run(readProgress, command) {
    const progress = readProgress();
    if (command) {
      if (progress.session)
        throw new Error("A story session is already pending");
      const program = this.catalog.program(command.id, command.input || {});
      progress.session = {
        script: command.id,
        input: jsonValue(command.input || {}),
        cursor: program.entry,
        status: "ready",
        steps: 0,
        ...(command.event ? { event: command.event } : {}),
      };
    }
    let record = progress.session;
    if (!record) return;
    this.validate(record);
    if (record.status === "battle") return;
    const program = this.catalog.program(record.script, record.input);
    while (record.cursor !== null) {
      if (record.steps >= 10000)
        throw new Error("Story execution budget exceeded");
      record.steps++;
      const node = program.nodes.get(record.cursor),
        c = node.command;
      if (c.type === "battle") {
        await this.checkpoint();
        record.status = "battle";
        record.token = `${record.script}/${record.cursor}/${record.steps}`;
        try {
          if (!(await this.startBattle(c, record.token)))
            throw new Error("Story battle could not start");
        } catch (error) {
          record.status = "ready";
          delete record.token;
          throw error;
        }
        return;
      }
      let next = node.next;
      if (c.type === "sequence") next = node.branches.sequence;
      else if (c.type === "if")
        next = node.branches[this.testCondition(c.condition) ? "then" : "else"];
      else if (c.type === "choice") next = node.branches[await this.choose(c)];
      else if (c.type !== "checkpoint") {
        const result = await this.execute(c);
        if (c.onResult) {
          if (!Object.hasOwn(node.branches, result?.status))
            throw new Error(`Unhandled story result: ${result?.status}`);
          next = node.branches[result.status];
        }
      }
      const active = readProgress().session;
      if (
        !active ||
        active.script !== record.script ||
        active.event !== record.event ||
        active.steps !== record.steps
      )
        throw new Error("Story session replaced during execution");
      record = active;
      record.cursor = next;
      if (c.type === "checkpoint") await this.checkpoint();
    }
    if (record.event) this.complete(record.event);
    readProgress().session = null;
  }
  battleResult(progress, token, result) {
    const record = progress.session;
    if (!record || record.status !== "battle" || record.token !== token)
      return false;
    const node = this.catalog
      .program(record.script, record.input)
      .nodes.get(record.cursor);
    if (!Object.hasOwn(node.branches, result))
      throw new Error(`Unhandled story battle result: ${result}`);
    record.cursor = node.branches[result];
    record.status = "ready";
    delete record.token;
    return true;
  }
}
export function validateStoryResume(catalog, record, events = []) {
  try {
    if (record?.event && !events.some((e) => e.id === record.event))
      return false;
    return new StorySession({ catalog }).validate(record);
  } catch {
    return false;
  }
}
export function storyDependencies(state, host) {
  const refs = [
    state.story?.session?.script,
    ...(state.story?.completed || []),
    ...(state.story?.rewards || []),
  ];
  return [
    ...new Set(
      refs
        .filter((id) => typeof id === "string" && id.includes(":"))
        .map((id) => id.split(":")[0])
        .filter((id) => host?.manifests.has(id)),
    ),
  ];
}
