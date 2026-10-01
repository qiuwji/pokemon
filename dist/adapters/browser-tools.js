// Progressive enhancement: normal keyboard/touch play works without WebMCP.
export async function registerGameTools(adapter) {
  const context = document.modelContext || navigator.modelContext;
  if (!context?.registerTool) return;
  const output = (value) => ({
    content: [{ type: "text", text: JSON.stringify(value) }],
  });
  const tools = [
    {
      name: "inspect_adventure",
      description:
        "Read the current game location, visible tiles, nearby characters, quest, party and battle. This does not advance the game.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute: async () => output(adapter.inspect()),
    },
    {
      name: "move_trainer",
      description:
        "Walk the trainer on the map using normal collision and encounter rules. Stops when a dialogue, battle, or menu opens. Does not teleport or change game rules.",
      inputSchema: {
        type: "object",
        properties: {
          direction: { type: "string", enum: ["up", "down", "left", "right"] },
          steps: { type: "integer", minimum: 1, maximum: 10 },
        },
        required: ["direction"],
        additionalProperties: false,
      },
      execute: async ({ direction, steps = 1 }) => {
        if (
          !["up", "down", "left", "right"].includes(direction) ||
          !Number.isInteger(steps) ||
          steps < 1 ||
          steps > 10
        )
          throw new Error("Invalid movement");
        await adapter.move(direction, steps);
        return output(adapter.inspect());
      },
    },
    {
      name: "interact_with_game",
      description:
        "Investigate the tile the trainer faces, or advance the current dialogue, equivalent to pressing A/Z. During battle, confirms the highlighted menu option.",
      inputSchema: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        adapter.interact();
        return output(adapter.inspect());
      },
    },
    {
      name: "choose_starter",
      description:
        "Choose and confirm a starter only when the three-starter selection is currently open. Uses the same visible confirmation flow as the game.",
      inputSchema: {
        type: "object",
        properties: {
          species: { type: "string", enum: ["treecko", "torchic", "mudkip"] },
        },
        required: ["species"],
        additionalProperties: false,
      },
      execute: async ({ species }) => {
        adapter.chooseStarter(species);
        return output(adapter.inspect());
      },
    },
    {
      name: "battle_action",
      description:
        "Take one normal battle turn: use a move, switch party member, use a potion, throw a Poké Ball or run. Index is zero-based. Waits for the resulting battle messages.",
      inputSchema: {
        type: "object",
        properties: {
          kind: {
            type: "string",
            enum: ["move", "switch", "potion", "ball", "run"],
          },
          index: { type: "integer", minimum: 0, maximum: 5 },
        },
        required: ["kind"],
        additionalProperties: false,
      },
      execute: async (input) => {
        if (!["move", "switch", "potion", "ball", "run"].includes(input.kind))
          throw new Error("Invalid battle action");
        await adapter.battleAction(input);
        return output(adapter.inspect());
      },
    },
  ];
  for (const tool of tools) {
    try {
      await context.registerTool(tool);
    } catch (error) {
      console.warn("Optional game tool unavailable:", tool.name, error.message);
    }
  }
}
