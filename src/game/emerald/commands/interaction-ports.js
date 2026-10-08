import {
  InteractionRegistry,
  InteractionSessionService,
} from "../../../engine/interactions.js";
import {
  readOnly,
  objectSchema,
  validateValue,
} from "../../../engine/extensions/values.js";
const text = (maxLength) => ({ type: "string", minLength: 1, maxLength });
const commandBlocked = "请先结束当前互动。";

/**
 * Host-owned real-time sessions: clock, input, random and completion settlement.
 * Defines the public `core.interaction.*` commands; plugins only supply JSON state.
 */
export function attachInteractionSessions({
  host,
  game,
  runtime,
  bus,
  onError = () => {},
}) {
  const owners = new Map([...host.interactions].map(([id, d]) => [id, d.owner]));
  const definitions = Object.fromEntries(
    [...host.interactions].map(([id, { owner: _owner, id: _id, ...definition }]) => [
      id,
      definition,
    ]),
  );
  const registry = new InteractionRegistry(definitions);
  const service = new InteractionSessionService({
    registry,
    random: game.rng,
    onError,
  });

  const startContext = () => {
    const { map, x, y, dir } = game.state.position;
    return { map, position: { map, x, y, dir } };
  };

  const settle = (terminals) => {
    const results = [];
    for (const view of terminals) {
      if (view.lifecycle !== "finishing" || !view.terminal) continue;
      const definition = registry.get(view.definition);
      try {
        if (definition.completion) {
          const action = host.actions.get(definition.completion);
          if (!action)
            throw new Error(`Unknown interaction completion ${definition.completion}`);
          const payload = readOnly({
            instance: view.id,
            context: view.context,
            outcome: view.terminal.outcome,
            result: view.terminal.result,
          });
          validateValue(action.schema, payload);
          runtime.transaction(action.owner, action.run, payload);
        }
        service.complete(view.id, {
          outcome: view.terminal.outcome,
          result: view.terminal.result,
        });
        // The transaction's own save ran while the session still held the busy lock;
        // persist again now that the session has released it, otherwise a refresh loses the result.
        runtime.ports.changed?.();
        host.events.emit("core:interaction-completed", {
          instance: view.id,
          definition: view.definition,
          source: view.source ?? null,
          outcome: view.terminal.outcome,
          result: view.terminal.result,
        });
        results.push({ ok: true, instance: view.id, outcome: view.terminal.outcome });
      } catch (error) {
        service.fail(view.id, error.message);
        onError(error);
        results.push({ ok: false, instance: view.id, reason: error.message });
      }
    }
    return results;
  };

  bus.register("core.interaction.start", {
    schema: objectSchema(
      {
        definition: text(128),
        source: text(128),
        parameters: { type: "string", minLength: 2, maxLength: 65536 },
      },
      ["definition"],
    ),
    plugin: true,
    network: true,
    // A session starts only when the host field is idle; parent flows use the
    // internal bridge (application/fieldAction) instead of this public command.
    ready: () =>
      !game.busy &&
      !game.facilityActive &&
      !game.battle &&
      !game.ui?.blocked &&
      !game.ui?.dialog,
    run: ({ definition, source, parameters }) => {
      const owner = owners.get(definition);
      if (!owner) throw new Error(`Unknown interaction ${definition}`);
      if (game.battle) throw new Error(commandBlocked);
      const parsed = parameters ? JSON.parse(parameters) : {};
      const view = service.start(owner, definition, parsed, startContext(), source);
      return {
        ok: true,
        instance: view.id,
        state: view.state,
        clock: view.clock,
      };
    },
  });
  bus.register("core.interaction.input", {
    schema: objectSchema(
      { action: text(64), active: { type: "boolean" } },
      ["action", "active"],
    ),
    plugin: true,
    network: true,
    ready: () => true,
    concurrent: true,
    run: ({ action, active }) => {
      const instance = service.current();
      if (!instance) throw new Error("现在没有互动会话。");
      return { ok: true, ...service.input(instance, action, active) };
    },
  });
  bus.register("core.interaction.advance", {
    schema: objectSchema({ ticks: { type: "integer", minimum: 1, maximum: 4096 } }, []),
    plugin: true,
    network: true,
    ready: () => true,
    concurrent: true,
    run: ({ ticks = 1 } = {}) => {
      const instance = service.current();
      if (!instance) return { ok: true, terminals: [] };
      const terminals = service.advanceTicks(instance, ticks);
      return { ok: true, terminals: settle(terminals) };
    },
  });
  bus.register("core.interaction.cancel", {
    schema: objectSchema(),
    plugin: true,
    network: true,
    ready: () => true,
    concurrent: true,
    run: () => {
      const instance = service.current();
      if (!instance) return { ok: true, cancelled: false };
      service.cancel(instance);
      return { ok: true, cancelled: true };
    },
  });
  bus.register("core.interaction.view", {
    schema: objectSchema(),
    plugin: true,
    network: true,
    query: true,
    concurrent: true,
    ready: () => true,
    run: () => {
      const instance = service.current();
      return {
        active: service.active,
        instance: instance ? service.view(instance) : null,
        frame: instance ? service.frame(instance) : null,
      };
    },
  });

  const declaredInputs = () => {
    const instance = service.current();
    if (!instance) return [];
    return registry.get(service.view(instance).definition).inputs;
  };
  return {
    service,
    registry,
    active: () => service.active,
    current: () => service.current(),
    declares: (action) => declaredInputs().includes(action),
    clearInput: () => {
      const instance = service.current();
      if (instance) service.setInput(instance, []);
    },
    start: (id, parameters = {}, source = null) =>
      service.start(owners.get(id), id, parameters, startContext(), source),
    input: (action, active) => {
      const instance = service.current();
      return instance ? service.input(instance, action, active) : null;
    },
    advance: (nowMs) => settle(service.advance(nowMs)),
    cancel: () => {
      const instance = service.current();
      return instance ? service.cancel(instance) : null;
    },
    view: () => {
      const instance = service.current();
      return instance
        ? { instance: service.view(instance), frame: service.frame(instance) }
        : { instance: null, frame: null };
    },
    pauseAll: () => {
      for (const id of service.sessions.keys()) service.pause(id);
    },
    resumeAll: () => {
      for (const id of service.sessions.keys()) service.resume(id);
    },
  };
}
