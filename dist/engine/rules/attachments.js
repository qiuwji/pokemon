import { RulePipeline, RULE_PHASES } from "../rule-pipeline.js";
/** Reusable rule attachment compiler. Scope resolution is injected by battle, field and growth adapters. */
export class AttachedRules {
  constructor({ definitions, operations, owners, context, hooks = [] }) {
    this.pipeline = new RulePipeline(operations);
    for (const [kind, catalog] of Object.entries(definitions))
      for (const [id, definition] of Object.entries(catalog)) {
        if (
          !Array.isArray(definition.hooks) ||
          (definition.parameter !== undefined &&
            (!Number.isInteger(definition.parameter) ||
              definition.parameter < 0))
        )
          throw new Error(`Invalid ${kind} ${id}`);
        definition.hooks.forEach((hook, i) => {
          if (
            !RULE_PHASES.includes(hook.phase) ||
            !["actor", "target", "owner", "all"].includes(hook.role) ||
            (hook.when !== undefined && typeof hook.when !== "function") ||
            Boolean(hook.modify) === Boolean(hook.apply || hook.effects)
          )
            throw new Error(`Invalid attachment hook ${kind}:${id}:${i}`);
          if (hook.effects && typeof hook.effects !== "function")
            operations.validate(hook.effects);
          this.pipeline.register({
            id: `${kind}:${id}:${i}`,
            phase: hook.phase,
            priority: hook.priority || 0,
            ...(hook.modify
              ? {
                  modify: (value, c) => {
                    for (const reference of owners(kind, id, hook, c)) {
                      const selected = context(
                        c,
                        reference,
                        kind,
                        id,
                        hook.phase,
                      );
                      if (!hook.when || hook.when(selected))
                        value = hook.modify(value, selected);
                    }
                    return value;
                  },
                }
              : {
                  apply: (c) => {
                    for (const reference of owners(kind, id, hook, c)) {
                      const selected = context(
                        c,
                        reference,
                        kind,
                        id,
                        hook.phase,
                      );
                      if (!hook.when || hook.when(selected)) {
                        const effects =
                          typeof hook.effects === "function"
                            ? hook.effects(selected)
                            : hook.effects;
                        if (effects) this.pipeline.effects(effects, selected);
                        hook.apply?.(selected);
                      }
                    }
                  },
                }),
          });
        });
      }
    for (const hook of hooks) this.pipeline.register(hook);
  }
}
