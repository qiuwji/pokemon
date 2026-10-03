import { StateCheckpoint } from "../state-checkpoint.js";
import { PluginState } from "./plugin-state.js";
import { jsonValue, readOnly, qualified, callSync } from "./values.js";
/** Executes plugin transactions against injected application ports. Core references never cross its API. */
export class PluginRuntime {
  constructor({
    manifests,
    states,
    actions,
    events,
    bus,
    presentation,
    ports,
    onError = () => {},
  }) {
    Object.assign(this, {
      manifests,
      actions,
      events,
      bus,
      presentation,
      ports,
      onError,
    });
    this.stateService = new PluginState(states);
    this.states = states;
    this.active = false;
    this.readDepth = 0;
  }
  bind() {
    const state = this.ports.state();
    state.extensions ||= {};
    for (const [owner, manifest] of this.manifests) {
      let record = state.extensions[owner];
      if (!record)
        record = { version: manifest.dataVersion, data: {}, states: {} };
      else record = jsonValue(record);
      if (record.version !== manifest.dataVersion)
        throw new Error(`Plugin data version mismatch: ${owner}`);
      this.stateService.validate(record, owner);
      if (manifest.validateData)
        this.evaluate(manifest.validateData, readOnly(record.data));
      state.extensions[owner] = record;
    }
  }
  query() {
    return readOnly(this.ports.query());
  }
  evaluate(fn, ...args) {
    this.readDepth++;
    try {
      return callSync(fn, args, this.onError);
    } finally {
      this.readDepth--;
    }
  }
  view(owner, context = {}) {
    const record = this.ports.state().extensions[owner];
    return Object.freeze({
      context: readOnly(context),
      query: () => this.query(),
      store: Object.freeze({
        get: (key) => readOnly(record.data[key] ?? null),
      }),
      states: Object.freeze({
        list: (uid) => this.stateService.list(record, uid),
      }),
    });
  }
  dispatch(id, input, owner) {
    const def = this.bus.definition(id);
    if (
      id.startsWith("core.") &&
      (!def?.plugin ||
        (def.permission &&
          !this.manifests.get(owner)?.permissions.includes(def.permission)))
    )
      return Promise.reject(new Error("Core command permission denied"));
    if (this.readDepth || this.active)
      return Promise.reject(
        new Error(
          "Commands are forbidden inside a read-only callback or active transaction",
        ),
      );
    return this.bus.execute(id, input, "plugin");
  }
  transaction(owner, handler, input = {}) {
    if (this.active || this.readDepth)
      throw new Error("Nested plugin transactions are forbidden");
    const checkpoint = new StateCheckpoint(
        this.ports.state(),
        this.ports.random(),
      ),
      draft = jsonValue(this.ports.state().extensions[owner]),
      intents = [],
      events = [],
      feedback = [];
    const manifest = this.manifests.get(owner);
    let operations = 0;
    const token = Symbol();
    this.transactionToken = token;
    const bounded = () => {
      if (!this.active || this.transactionToken !== token)
        throw new Error("Expired transaction context");
      if (++operations > 128)
        throw new Error("Plugin transaction operation limit");
    };
    const ownedState = (id) => {
      if (this.states.get(id)?.owner !== owner)
        throw new Error("Cannot write another plugin status");
    };
    const ctx = Object.freeze({
      query: () => this.query(),
      store: Object.freeze({
        get: (key) => readOnly(draft.data[key] ?? null),
        set: (key, value) => {
          bounded();
          qualified(owner, key);
          draft.data[key] = jsonValue(value);
        },
      }),
      states: Object.freeze({
        list: (uid) => this.stateService.list(draft, uid),
        attach: (id, uid, options) => {
          bounded();
          ownedState(id);
          if (!this.ports.hasUid(uid)) throw new Error("Unknown state target");
          const attached = this.stateService.attach(draft, id, uid, options);
          callSync(
            this.states.get(id).onApply,
            [ctx, readOnly({ id, uid, ...attached })],
            this.onError,
          );
          return attached;
        },
        update: (id, uid, options) => {
          bounded();
          ownedState(id);
          if (!draft.states[uid]?.[id])
            throw new Error("Unknown attached state");
          return this.stateService.attach(draft, id, uid, options);
        },
        remove: (id, uid) => {
          bounded();
          ownedState(id);
          const removed = this.stateService.remove(draft, id, uid);
          if (removed)
            callSync(
              this.states.get(id).onRemove,
              [ctx, readOnly({ id, uid, ...removed })],
              this.onError,
            );
          return !!removed;
        },
      }),
      intent: (intent) => {
        bounded();
        const value = jsonValue(intent);
        if (!manifest.permissions.includes(value.kind))
          throw new Error(`Undeclared core permission ${value.kind}`);
        this.ports.validateIntent?.(value, owner);
        intents.push(value);
      },
      emit: (type, payload = {}) => {
        bounded();
        if (!type.startsWith(owner + ":"))
          throw new Error("Custom events require the plugin namespace");
        events.push([type, jsonValue(payload)]);
      },
      feedback: (id, payload = {}) => {
        bounded();
        if (!this.presentation.has(id)) throw new Error("Unknown presentation");
        feedback.push([id, jsonValue(payload)]);
      },
    });
    this.active = true;
    let result;
    try {
      result = callSync(handler, [ctx, readOnly(input)], this.onError);
      if (result?.then)
        throw new Error("Transaction handlers must be synchronous");
      this.stateService.validate(draft, owner);
      if (manifest.validateData)
        this.evaluate(manifest.validateData, readOnly(draft.data));
      this.ports.state().extensions[owner] = draft;
      for (const intent of intents) {
        const applied = this.ports.applyIntent(intent, owner);
        if (applied === false || applied?.ok === false)
          throw new Error(applied?.reason || "Core intent rejected");
      }
      result = result === undefined ? { ok: true } : jsonValue(result);
    } catch (error) {
      checkpoint.restore();
      throw error;
    } finally {
      this.active = false;
    }
    // Facts and effects become visible only after the whole transaction succeeds.
    for (const [type, payload] of events) this.events.emit(type, payload);
    for (const [id, payload] of feedback) {
      try {
        this.ports.present(id, readOnly(payload));
      } catch (error) {
        this.onError(error);
      }
    }
    try {
      this.ports.changed();
    } catch (error) {
      this.onError(error);
    }
    return result;
  }
  advance(clock) {
    for (const [owner] of this.manifests) {
      const record = this.ports.state().extensions[owner];
      if (
        !Object.values(record.states).some((values) =>
          Object.keys(values).some(
            (id) => this.states.get(id)?.clock === clock,
          ),
        )
      )
        continue;
      try {
        this.transaction(owner, (ctx) => {
          const draft = this.ports.state().extensions[owner]; // Read only; writes are through the context.
          for (const [uid, values] of Object.entries(draft.states))
            for (const [id, state] of Object.entries(values)) {
              const def = this.states.get(id);
              if (def.clock !== clock) continue;
              callSync(
                def.onTick,
                [ctx, readOnly({ id, uid, ...state })],
                this.onError,
              );
              const current = ctx.states.list(uid)[id];
              if (!current) continue;
              if (current.remaining === 1) ctx.states.remove(id, uid);
              else if (current.remaining > 1)
                ctx.states.update(id, uid, {
                  duration: current.remaining - 1,
                  data: current.data,
                });
            }
        });
      } catch (error) {
        this.onError(error);
      }
    }
  }
}
