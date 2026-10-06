import { readOnly, validateSchema } from "./values.js";
import { safeTrait } from "./catalog.js";
import {
  normalizeTrainerStrategy,
  normalizeCreatureStrategy,
} from "../battle/strategy-contract.js";

const wrapContext = (fn, evaluate) => (context) =>
  evaluate(fn, readOnly(context));

/** Build `key -> (context) => evaluate(...)` callbacks, rejecting non-synchronous handlers. */
function contextCallbacks(original, keys, evaluate, { message, defined = false } = {}) {
  return Object.fromEntries(
    keys
      .filter((key) => (defined ? original[key] !== undefined : original[key]))
      .map((key) => {
        if (message && typeof original[key] !== "function")
          throw new Error(message);
        return [key, wrapContext(original[key], evaluate)];
      }),
  );
}

const trait = (value, evaluate) => safeTrait(value, evaluate);

/** Per-kind normalization that detaches plugin callbacks from mutable domain objects. */
export const CONTENT_NORMALIZERS = Object.freeze({
  facilityActivities(value, evaluate) {
    const original = value;
    return {
      ...value,
      actions: Object.fromEntries(
        Object.entries(value.actions || {}).map(([id, action]) => [
          id,
          {
            ...action,
            ...(action.when !== undefined
              ? {
                  when:
                    typeof action.when === "function"
                      ? (context) => evaluate(action.when, readOnly(context))
                      : action.when,
                }
              : {}),
            decide: (context) => evaluate(action.decide, readOnly(context)),
          },
        ]),
      ),
      ...(original.onBattle
        ? {
            onBattle: (context, result) =>
              evaluate(original.onBattle, readOnly(context), result),
          }
        : {}),
      ...(original.validate
        ? {
            validate: (definition, references) =>
              evaluate(original.validate, readOnly(definition), readOnly(references)),
          }
        : {}),
    };
  },
  appearances(value, evaluate) {
    if (value.select === undefined) return value;
    if (typeof value.select !== "function")
      throw new Error("Invalid appearance selector");
    const select = value.select;
    return {
      ...value,
      select: (data, context) =>
        evaluate(select, readOnly(data), readOnly(context)),
    };
  },
  conditionQueries(value, evaluate) {
    const original = value;
    if (typeof original.read !== "function")
      throw new Error("Condition query requires read");
    return {
      ...value,
      schema: validateSchema(value.schema),
      read: (state, input) =>
        evaluate(original.read, readOnly(state), readOnly(input)),
    };
  },
  battleAugments(value, evaluate) {
    const original = value;
    if (
      typeof original.select !== "function" ||
      (original.requires !== undefined && typeof original.requires !== "function")
    )
      throw new Error(
        "Battle augment requires synchronous selection/eligibility callbacks",
      );
    return {
      ...value,
      select: (c) => evaluate(original.select, readOnly(c)),
      ...(original.requires
        ? { requires: (c) => evaluate(original.requires, readOnly(c)) }
        : {}),
    };
  },
  battleAttachments(value, evaluate) {
    const original = value;
    if (original.requires !== undefined && typeof original.requires !== "function")
      throw new Error("Battle attachment requires a synchronous predicate");
    if (original.deriveMove !== undefined && typeof original.deriveMove !== "function")
      throw new Error("Battle attachment requires a synchronous derivation");
    if (
      original.modifiers !== undefined &&
      (!Array.isArray(original.modifiers) ||
        original.modifiers.some((mod) => typeof mod?.modify !== "function"))
    )
      throw new Error("Battle attachment requires synchronous modifiers");
    return {
      ...original,
      ...(original.requires
        ? { requires: (c) => evaluate(original.requires, readOnly(c)) }
        : {}),
      ...(original.deriveMove
        ? { deriveMove: (c) => evaluate(original.deriveMove, readOnly(c)) }
        : {}),
      ...(original.modifiers
        ? {
            modifiers: original.modifiers.map((mod) => ({
              ...mod,
              modify: (value, c) =>
                evaluate(mod.modify, readOnly(value), readOnly(c)),
            })),
          }
        : {}),
    };
  },
  battleStrategies(value, evaluate) {
    return normalizeTrainerStrategy(value, evaluate);
  },
  creatureStrategies(value, evaluate) {
    return normalizeCreatureStrategy(value, evaluate);
  },
  encounterPolicies(value, evaluate) {
    return {
      ...value,
      ...contextCallbacks(value, ["when", "decide"], evaluate, {
        message: "Encounter policy requires synchronous callbacks",
        defined: true,
      }),
    };
  },
  npcBehaviors(value, evaluate) {
    const original = value;
    if (typeof original.decide !== "function")
      throw new Error("NPC behavior requires decide");
    return { ...value, decide: (c) => evaluate(original.decide, readOnly(c)) };
  },
  learningMethods(value, evaluate) {
    if (value.eligible === undefined) return value;
    const original = value;
    if (typeof original.eligible !== "function")
      throw new Error("Learning method requires eligibility predicate");
    return {
      ...value,
      eligible: (context) => evaluate(original.eligible, readOnly(context)),
    };
  },
  fieldMechanisms(value, evaluate) {
    return {
      ...value,
      ...contextCallbacks(
        value,
        ["activate", "enter", "leave", "settle", "timer", "interact", "occupancy"],
        evaluate,
      ),
    };
  },
  fieldEffects(value, evaluate) {
    const original = value;
    return {
      ...value,
      ...Object.fromEntries(
        ["retain", "presentation"]
          .filter((key) => original[key] !== undefined)
          .map((key) => {
            if (typeof original[key] !== "function")
              throw new Error("Field effect requires synchronous callbacks");
            return [
              key,
              (...args) =>
                evaluate(original[key], ...args.map((arg) => readOnly(arg))),
            ];
          }),
      ),
    };
  },
  growthConditions(value) {
    if (typeof value.test !== "function")
      throw new Error("Growth condition requires predicate");
    return { ...value, schema: validateSchema(value.schema) };
  },
  abilities: trait,
  heldItems: trait,
  battleStates: trait,
  movementInputs(value, evaluate) {
    const original = value;
    if (typeof original.decide !== "function")
      throw new Error("Movement input requires decide");
    return { ...value, decide: (c) => evaluate(original.decide, readOnly(c)) };
  },
  movement(value, evaluate) {
    return {
      ...value,
      ...contextCallbacks(value, ["allowed", "traverse", "afterStep"], evaluate),
    };
  },
  fieldActions(value, evaluate) {
    const original = value;
    return {
      ...value,
      ...Object.fromEntries(
        ["allowed", "target", "plan"].map((key) => {
          if (typeof original[key] !== "function")
            throw new Error("Field action requires rule callbacks");
          return [
            key,
            (...args) =>
              evaluate(original[key], ...args.map((arg) => readOnly(arg))),
          ];
        }),
      ),
    };
  },
  terrainRules(value, evaluate) {
    return {
      ...value,
      ...contextCallbacks(value, ["when", "before", "after"], evaluate, {
        message: "Terrain rules require synchronous callbacks",
      }),
    };
  },
});

export function normalizeContent(kind, value, evaluate) {
  const normalize = CONTENT_NORMALIZERS[kind];
  return normalize ? normalize(value, evaluate) : value;
}
