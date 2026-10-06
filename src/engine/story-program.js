import { readOnly } from "./extensions/values.js";

/** Compile stable command identities to successors, without clocks, domain state or rendering. */
export function storyProgram(commands) {
  const nodes = new Map();
  const block = (list, next) => {
    let cursor = next;
    for (const command of [...list].reverse()) {
      if (
        typeof command.node !== "string" ||
        !command.node ||
        nodes.has(command.node)
      )
        throw new Error(`Invalid or duplicate story node: ${command.node}`);
      const node = { command, next: cursor, branches: {} };
      if (command.type === "sequence")
        node.branches.sequence = block(command.commands, cursor);
      if (command.type === "if") {
        node.branches.then = block(command.then, cursor);
        node.branches.else = block(command.else || [], cursor);
      }
      if (command.type === "choice")
        for (const option of command.options)
          node.branches[option.id] = block(option.commands || [], cursor);
      for (const [id, branch] of Object.entries(command.onResult || {}))
        node.branches[id] = block(branch, cursor);
      nodes.set(command.node, readOnly(node));
      if (nodes.size > 2048) throw new Error("Story program size exceeded");
      cursor = command.node;
    }
    return cursor;
  };
  return { entry: block(commands, null), nodes };
}
