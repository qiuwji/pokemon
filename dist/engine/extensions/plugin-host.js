import { validateAudioCue } from "./audio-contracts.js";
import { ExtensionCatalog, safeTrait, ruleContext } from "./catalog.js";
import { PluginUIRegistry } from "./ui-registry.js";
import { PluginRuntime } from "./plugin-runtime.js";
import { validateStateDefinition } from "./plugin-state.js";
import { EventBus } from "./event-bus.js";
import {
  qualified,
  localId,
  freeze,
  readOnly,
  jsonValue,
  validateSchema,
  callSync,
} from "./values.js";
import { validateMoveAnimation } from "./visual-contracts.js";
import { RULE_PHASES } from "../rule-pipeline.js";
export const PLUGIN_API_VERSION = 1;
/** Startup host: content + declarative interfaces + runtime ports. Trusted code, explicit API, no hot unload. */
export class PluginHost {
  constructor({ base, permissions = [], onError = () => {} }) {
    this.allowedPermissions = Object.freeze([...permissions]);
    this.catalog = new ExtensionCatalog(base);
    this.ui = new PluginUIRegistry();
    this.manifests = new Map();
    this.states = new Map();
    this.actions = new Map();
    this.rules = new Map();
    this.presentation = new Map();
    this.visualEffects = new Map();
    this.moveAnimations = new Map();
    this.presentationScenes = new Map();
    this.audioCues = new Map();
    this.transitionPatterns = new Map();
    this.story = new Map();
    this.events = new EventBus({ onError });
    this.onError = onError;
    this.runtime = null;
    this.started = false;
  }
  load(plugins) {
    if (this.started || this.catalog.sealed)
      throw new Error("Plugins load at startup only");
    const pending = new Map();
    for (const plugin of plugins) {
      if (
        !localId(plugin.id) ||
        pending.has(plugin.id) ||
        plugin.apiVersion !== PLUGIN_API_VERSION ||
        !/^\d+\.\d+\.\d+$/.test(plugin.version) ||
        !Number.isInteger(plugin.dataVersion) ||
        plugin.dataVersion < 1 ||
        typeof plugin.setup !== "function" ||
        !Array.isArray(plugin.permissions) ||
        plugin.permissions.some((p) => !this.allowedPermissions.includes(p))
      )
        throw new Error("Invalid plugin manifest");
      pending.set(plugin.id, plugin);
    }
    const ordered = [],
      visited = new Set(),
      visiting = new Set();
    const visit = (id) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) throw new Error("Plugin dependency cycle");
      const plugin = pending.get(id);
      if (!plugin) throw new Error(`Missing plugin dependency ${id}`);
      visiting.add(id);
      for (const [dependency, major] of Object.entries(
        plugin.dependencies || {},
      )) {
        const target = pending.get(dependency);
        if (!target || String(target.version.split(".")[0]) !== String(major))
          throw new Error(`Incompatible plugin dependency ${dependency}`);
        visit(dependency);
      }
      visiting.delete(id);
      visited.add(id);
      ordered.push(plugin);
    };
    for (const id of pending.keys()) visit(id);
    // All declarations live in a temporary host; caller's catalogs remain unchanged on failure.
    const staged = new PluginHost({
      base: this.catalog.base,
      permissions: this.allowedPermissions,
      onError: this.onError,
    });
    for (const plugin of ordered) {
      const owner = plugin.id,
        content = staged.catalog.stage(owner),
        callbacks = [];
      staged.manifests.set(
        owner,
        Object.freeze({
          ...plugin,
          permissions: Object.freeze([...plugin.permissions]),
        }),
      );
      const register = (registry, id, definition) => {
        const key = qualified(owner, id);
        if (registry.has(key)) throw new Error(`Duplicate registration ${key}`);
        registry.set(key, Object.freeze({ ...definition, id: key, owner }));
        return key;
      };
      const evaluate = (fn, ...args) =>
        staged.runtime
          ? staged.runtime.evaluate(fn, ...args)
          : callSync(fn, args, staged.onError);
      const api = Object.freeze({
        version: PLUGIN_API_VERSION,
        id: owner,
        content: Object.freeze({
          register: (kind, id, value) => {
            if (kind === "conditionQueries") {
              const original = value;
              if (typeof original.read !== "function")
                throw new Error("Condition query requires read");
              value = {
                ...value,
                schema: validateSchema(value.schema),
                read: (state, input) =>
                  evaluate(original.read, readOnly(state), readOnly(input)),
              };
            }
            if (kind === "battleStrategies") {
              const original = value;
              if (typeof original.decide !== "function")
                throw new Error("Battle strategy requires decide");
              value = {
                ...value,
                decide: (c) => evaluate(original.decide, readOnly(c)),
              };
            }
            if (kind === "npcBehaviors") {
              const original = value;
              if (typeof original.decide !== "function")
                throw new Error("NPC behavior requires decide");
              value = {
                ...value,
                decide: (c) => evaluate(original.decide, readOnly(c)),
              };
            }
            if (kind === "growthConditions") {
              if (typeof value.test !== "function")
                throw new Error("Growth condition requires predicate");
              value = { ...value, schema: validateSchema(value.schema) };
            }
            if (["abilities", "heldItems", "battleStates"].includes(kind))
              value = safeTrait(value, evaluate);
            if (kind === "movement") {
              const original = value;
              value = {
                ...value,
                ...Object.fromEntries(
                  ["allowed", "traverse", "afterStep"]
                    .filter((key) => value[key])
                    .map((key) => [
                      key,
                      (c) => evaluate(original[key], readOnly(c)),
                    ]),
                ),
              };
            }
            if (kind === "fieldActions") {
              const original = value;
              value = {
                ...value,
                ...Object.fromEntries(
                  ["allowed", "target", "plan"].map((key) => {
                    if (typeof original[key] !== "function")
                      throw new Error("Field action requires rule callbacks");
                    return [
                      key,
                      (...args) =>
                        evaluate(
                          original[key],
                          ...args.map((arg) => readOnly(arg)),
                        ),
                    ];
                  }),
                ),
              };
            }
            return content.register(kind, id, value);
          },
        }),
        states: Object.freeze({
          register: (id, definition) =>
            register(staged.states, id, validateStateDefinition(definition)),
        }),
        actions: Object.freeze({
          register: (id, definition) => {
            if (typeof definition.run !== "function")
              throw new Error("Action requires a handler");
            return register(staged.actions, id, {
              ...definition,
              schema: validateSchema(definition.schema),
            });
          },
        }),
        rules: Object.freeze({
          register: (id, definition) => {
            if (
              !RULE_PHASES.includes(definition.phase) ||
              Boolean(definition.modify) === Boolean(definition.effects) ||
              definition.apply
            )
              throw new Error("Invalid plugin rule");
            return register(staged.rules, id, definition);
          },
        }),
        events: Object.freeze({
          on: (type, fn) => {
            if (typeof fn !== "function") throw new Error("Invalid listener");
            callbacks.push(() => staged.events.on(type, fn));
          },
        }),
        story: Object.freeze({
          register: (id, definition) => {
            if (
              (typeof definition.build === "function") ===
              Array.isArray(definition.commands)
            )
              throw new Error(
                "Story requires exactly one command builder or command array",
              );
            const declarative =
              definition.commands === undefined
                ? null
                : readOnly(definition.commands);
            return register(staged.story, id, {
              ...definition,
              ...(definition.match
                ? {
                    match: (context, state) =>
                      evaluate(
                        definition.match,
                        readOnly(staged.storyContext(context)),
                        readOnly(state),
                      ),
                  }
                : {}),
              build: (state, context) =>
                declarative
                  ? jsonValue(declarative)
                  : evaluate(
                      definition.build,
                      readOnly(state),
                      readOnly(staged.storyContext(context)),
                    ),
            });
          },
        }),
        ui: Object.freeze({
          page: (id, def) => staged.ui.register(owner, "pages", id, def),
          entry: (id, def) => staged.ui.register(owner, "entries", id, def),
          hud: (id, def) => staged.ui.register(owner, "hud", id, def),
          theme: (id, def) => staged.ui.register(owner, "themes", id, def),
        }),
        presentation: Object.freeze({
          transition: (id, definition) => {
            if (typeof definition.draw !== "function")
              throw new Error("Transition requires draw");
            return register(staged.transitionPatterns, id, {
              draw: (ctx, frame) =>
                evaluate(definition.draw, ctx, readOnly(frame)),
            });
          },
          audio: (id, definition) => {
            const key = qualified(owner, id);
            if (staged.audioCues.has(key))
              throw new Error("Duplicate audio cue");
            staged.audioCues.set(key, validateAudioCue(definition));
            return key;
          },
          scene: (id, definition) => {
            if (
              typeof definition.draw !== "function" ||
              !Number.isFinite(definition.duration) ||
              definition.duration < 1 ||
              definition.duration > 10000
            )
              throw new Error("Invalid presentation scene");
            return register(staged.presentationScenes, id, {
              ...definition,
              schema: validateSchema(definition.schema),
              draw: (ctx, frame, assets) =>
                evaluate(definition.draw, ctx, readOnly(frame), assets),
            });
          },
          effect: (id, definition) => {
            if (typeof definition.draw !== "function")
              throw new Error("Visual effect requires drawing handler");
            return register(staged.visualEffects, id, {
              draw: (ctx, frame) =>
                evaluate(definition.draw, ctx, readOnly(frame)),
            });
          },
          move: (id, definition) => {
            if (typeof definition.moveId !== "string" || !definition.moveId)
              throw new Error("Move animation requires moveId");
            validateMoveAnimation(definition.animation);
            return register(staged.moveAnimations, id, {
              moveId: definition.moveId,
              animation: readOnly(definition.animation),
            });
          },
          play: (id, payload = {}) => {
            if (
              !staged.runtime ||
              staged.runtime.readDepth ||
              staged.runtime.active ||
              staged.presentation.get(id)?.owner !== owner
            )
              throw new Error("Presentation cannot be played here");
            staged.runtime.ports.present(id, readOnly(payload));
          },
          register: (id, definition) => {
            if (
              typeof definition.draw !== "function" ||
              !Number.isFinite(definition.duration) ||
              definition.duration < 1 ||
              definition.duration > 10000 ||
              (definition.scope !== undefined &&
                !["page", "field", "battle"].includes(definition.scope))
            )
              throw new Error("Invalid presentation");
            return register(staged.presentation, id, definition);
          },
        }),
        query: () => {
          if (!staged.runtime) throw new Error("Game is not ready");
          return staged.runtime.query();
        },
        store: Object.freeze({
          get: (key) => {
            if (!staged.runtime) throw new Error("Game is not ready");
            return staged.runtime.view(owner).store.get(key);
          },
        }),
        commands: Object.freeze({
          dispatch: (id, input = {}) => {
            if (!staged.runtime)
              return Promise.reject(new Error("Game is not ready"));
            if (!id.startsWith(owner + ":") && !id.startsWith("core."))
              return Promise.reject(new Error("Foreign plugin command denied"));
            return staged.runtime.dispatch(id, input, owner);
          },
        }),
      });
      callSync(plugin.setup, [api], staged.onError);
      content.commit();
      for (const callback of callbacks) callback();
    }
    staged.ui.validate();
    staged.started = true;
    Object.assign(this, staged);
    // Closures belong to the staged instance; retain it as the API host.
    this.apiHost = staged;
    return this;
  }
  storyContext(context) {
    return {
      ...(context.map ? { map: context.map } : {}),
      ...(context.position ? { position: context.position } : {}),
      ...(context.cell ? { cell: context.cell } : {}),
      ...(context.object ? { object: context.object } : {}),
      ...(context.mapTitle ? { mapTitle: context.mapTitle } : {}),
      ...(context.battle
        ? {
            battle: {
              winner: context.battle.winner,
              script: context.battle.script,
              trainer: context.battle.trainer,
              trainerId: context.battle.trainerId ?? null,
              result: context.battle.result ?? null,
            },
          }
        : {}),
    };
  }
  seal(validate) {
    return this.catalog.seal(validate);
  }
  attach({ bus, ports }) {
    const runtime = new PluginRuntime({
      manifests: this.manifests,
      states: this.states,
      actions: this.actions,
      events: this.events,
      bus,
      presentation: this.presentation,
      ports,
      onError: this.onError,
    });
    this.runtime = runtime;
    if (this.apiHost) this.apiHost.runtime = runtime;
    runtime.bind();
    for (const [id, definition] of this.actions)
      bus.register(id, {
        schema: definition.schema,
        network: definition.network === true,
        run: (input) =>
          runtime.transaction(definition.owner, definition.run, input),
        ready: definition.ready
          ? (source, args) =>
              (ports.ready?.() ?? true) &&
              runtime.evaluate(
                definition.ready,
                readOnly(args),
                runtime.view(definition.owner),
              )
          : undefined,
      });
    return runtime;
  }
  rebind() {
    this.runtime?.bind();
  }
  hooks(operations) {
    return [...this.rules.values()].map((h) => ({
      id: h.id,
      phase: h.phase,
      priority: h.priority || 0,
      ...(h.when
        ? {
            when: (c) =>
              this.runtime.evaluate(
                h.when,
                ruleContext(c),
                this.runtime.view(h.owner),
              ),
          }
        : {}),
      ...(h.modify
        ? {
            modify: (value, c) =>
              this.runtime.evaluate(
                h.modify,
                value,
                ruleContext(c),
                this.runtime.view(h.owner),
              ),
          }
        : {
            apply: (c) => {
              const steps = this.runtime.evaluate(
                h.effects,
                ruleContext(c),
                this.runtime.view(h.owner),
              );
              const b = c.battle;
              operations.run(
                steps,
                b
                  ? {
                      ...c,
                      mon: c.mon || b.roster.occupant(c.actorSeat),
                      opponent: c.opponent || b.roster.occupant(c.targetSeat),
                      owner: b.roster.occupant(c.actorSeat),
                      ownerSeat: c.actorSeat,
                      emit:
                        c.emit ||
                        ((text, kind, extra) =>
                          b.emit(text, kind, {
                            actorSeat: c.actorSeat,
                            ...extra,
                          })),
                    }
                  : c,
              );
            },
          }),
    }));
  }
}
