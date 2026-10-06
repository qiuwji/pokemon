import { objectSchema } from "../../engine/extensions/values.js";
/** Application projection and input ports; domain owners still decide all legal actions. */
export function controlSnapshot(game) {
  const { x, y, map } = game.state.position, m = game.world.map;
  const left = Math.max(0, x - 4), top = Math.max(0, y - 4);
  return {
    observation: game.control.observation(),
    ui: game.ui?.controlView?.() || { modal: null, dialogue: null, buttons: [] },
    field: {
      map, title: m.title || map, width: m.width, height: m.height,
      connections: m.connections, warps: m.warps, signs: m.signs || [],
      region: game.worldCells({ map, x: left, y: top,
        width: Math.min(m.width - left, 9), height: Math.min(m.height - top, 9) }),
    },
    commands: [...(game.commandBus?.definitions.values() || [])]
      .filter(d => d.network === true)
      .map(d => ({ id: d.id, schema: d.schema, mode: d.mode })),
  };
}
export function registerControlCommands(game, bus) {
  const direction = { type: "string", enum: ["up", "down", "left", "right"] };
  bus.register("core.control.availability", { schema: objectSchema(), concurrent: true,
    query: true, network: true, plugin: true, ready: () => true, run: () => game.control.availability() });
  bus.register("core.control.events", { schema: objectSchema({
    since: { type: "integer", minimum: 0 }, limit: { type: "integer", minimum: 1, maximum: 256 },
  }), concurrent: true, query: true, network: true, plugin: true, ready: () => true,
    run: options => game.control.journal.read(options) });
  bus.register("core.control.walk", { schema: objectSchema({
    directions: { type: "array", minItems: 1, maxItems: 256, items: direction }, running: { type: "boolean" },
    timeoutMs: { type: "integer", minimum: 1, maximum: 60000 }, continueOnMapChange: { type: "boolean" },
  }, ["directions"]), mode: "async", network: true, plugin: true, permission: "movement",
    ready: () => true, run: options => game.control.walker.run(options) });
  bus.register("core.control.cancel", { schema: objectSchema(), concurrent: true, ready: () => true,
    network: true, plugin: true, permission: "movement", run: () => game.control.walker.cancel() });
  bus.register("core.ui.input", {
    schema: objectSchema({
      action: { type: "string", enum: ["confirm", "back", "navigate", "activate", "menu"] },
      id: { type: "string", minLength: 1, maxLength: 128 },
      direction: { type: "string", enum: ["up", "down", "left", "right"] },
    }, ["action"]),
    network: true, plugin: true, permission: "uiControl", concurrent: true,
    ready: () => true,
    run: ({ action, id, direction }) => {
      const ui = game.ui;
      if (!ui) throw new Error("UI control port unavailable");
      if (action === "activate") {
        if (!id || direction) throw new Error("Specify a UI control id");
        if (!ui.controlActivate) throw new Error("UI control port unavailable");
        return ui.controlActivate(id);
      }
      if (action === "navigate") {
        if (!direction || id) throw new Error("Specify a navigation direction");
        if (!ui.navigateMenu) throw new Error("UI navigation unavailable");
        ui.navigateMenu(direction); return true;
      }
      if (id || direction) throw new Error("Unexpected UI input parameter");
      if (action === "menu") {
        if (game.busy || game.battle || ui.dialog) throw new Error("Menu unavailable");
        if (!ui.showMenu) throw new Error("Menu port unavailable");
        ui.showMenu(); return true;
      }
      if (action === "confirm" && ui.dialog) { ui.nextDialogue(); return true; }
      const method = action === "confirm" ? "controlConfirm" : "back";
      if (!ui[method]) throw new Error("UI input port unavailable");
      ui[method]();
      return true;
    },
  });
}
