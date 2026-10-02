import { qualified, freeze, readOnly } from "./values.js";
export const CONTENT_KINDS = Object.freeze([
  "species",
  "moves",
  "maps",
  "tilesets",
  "actors",
  "evolutions",
  "items",
  "abilities",
  "heldItems",
  "moveEffects",
  "movement",
  "destinations",
  "resources",
  "mapExtensions",
  "growthConditions",
  "npcBehaviors",
]);
/** Startup registration is staged; failed plugin setup cannot leak partial definitions. */
export class ExtensionCatalog {
  constructor(base) {
    this.base = base;
    this.entries = new Map();
    this.owners = new Map();
    this.sealed = false;
  }
  stage(owner) {
    const pending = new Map();
    return {
      register: (kind, id, value) => {
        if (this.sealed || !CONTENT_KINDS.includes(kind))
          throw new Error(`Unknown or sealed content kind ${kind}`);
        const key = qualified(owner, id),
          composite = `${kind}/${key}`;
        if (
          pending.has(composite) ||
          this.entries.has(composite) ||
          Object.hasOwn(this.base[kind] || {}, key)
        )
          throw new Error(`Duplicate content ${composite}`);
        pending.set(composite, { kind, id: key, value, owner });
        return key;
      },
      commit: () => {
        for (const [key, entry] of pending) {
          this.entries.set(key, entry);
          this.owners.set(entry.id, owner);
        }
      },
    };
  }
  seal(validate) {
    const result = Object.fromEntries(
      CONTENT_KINDS.map((kind) => [kind, { ...(this.base[kind] || {}) }]),
    );
    for (const { kind, id, value } of this.entries.values())
      if (kind !== "evolutions") result[kind][id] = value;
    for (const { kind, id, value } of this.entries.values()) {
      if (kind !== "evolutions") continue;
      if (kind === "evolutions" && value.from) {
        if (!result.species[value.from])
          throw new Error("Unknown evolution origin");
        const existing = result.evolutions[value.from];
        if (existing && !Array.isArray(existing))
          throw new Error(
            "Legacy evolution must be normalized before extending",
          );
        const { from, ...rule } = value;
        result.evolutions[from] = [...(existing || []), { ...rule, id }];
      } else result[kind][id] = value;
    }
    result.maps = { ...result.maps };
    for (const patch of Object.values(result.mapExtensions)) {
      const source = result.maps[patch.map];
      if (
        !source ||
        Object.keys(patch).some(
          (key) => !["map", "elements", "connections", "warps"].includes(key),
        )
      )
        throw new Error("Invalid map extension");
      const map = { ...source };
      for (const key of ["elements", "connections", "warps"])
        if (patch[key]) {
          if (!Array.isArray(patch[key]))
            throw new Error("Invalid map extension entries");
          map[key] = [...(source[key] || []), ...patch[key]];
        }
      result.maps[patch.map] = map;
    }
    for (const [id, value] of Object.entries(result.tilesets))
      result.tilesets[id] = { ...value, id };
    validate(result);
    this.sealed = true;
    return freeze(result);
  }
  dependencies(state) {
    const used = [
      state.position?.map,
      state.movement?.mode,
      ...Object.keys(state.bag || {}).filter((id) => state.bag[id] > 0),
      ...[
        ...(state.party || []),
        ...(state.box || []),
        ...(state.tradePartner || []),
        ...(state.daycare?.slots.map((s) => s.mon) || []),
        ...(state.daycare?.egg ? [state.daycare.egg] : []),
      ].flatMap((m) => [
        m.species,
        m.ability,
        m.heldItem,
        ...m.moves.map((s) => s.id),
      ]),
    ];
    return [...new Set(used.map((id) => this.owners.get(id)).filter(Boolean))];
  }
}
/** Restrict rule callbacks to detached values. No rule callback receives a battle, RNG or mutable domain object. */
export function ruleContext(context) {
  const output = {};
  for (const key of [
    "actor",
    "target",
    "owner",
    "move",
    "weather",
    "actorUid",
    "targetUid",
    "actorSeat",
    "targetSeat",
    "ownerSeat",
    "round",
    "format",
    "hitIndex",
    "event",
    "area",
    "mode",
    "attachmentId",
    "attachmentKind",
    "attachment",
    "sameLocation",
    "critical",
    "type",
    "category",
    "amount",
    "base",
    "stage",
    "canAct",
    "allowed",
  ]) {
    if (context[key] !== undefined && typeof context[key] !== "function") {
      if (key === "attachment") continue;
      output[key] = context[key];
    }
  }
  output.actor =
    context.actor ||
    context.mon ||
    context.battle?.roster.occupant(context.actorSeat) ||
    null;
  output.target =
    context.target ||
    context.opponent ||
    context.battle?.roster.occupant(context.targetSeat) ||
    null;
  if (context.stat) output.stat = context.stat;
  return readOnly(output);
}
export function safeTrait(definition, evaluate = (fn, ...args) => fn(...args)) {
  if (
    !definition ||
    !Array.isArray(definition.hooks) ||
    definition.hooks.some(
      (h) => h.apply || Boolean(h.modify) === Boolean(h.effects),
    )
  )
    throw new Error("Invalid trait");
  return {
    ...definition,
    hooks: definition.hooks.map((h) => ({
      ...h,
      ...(h.when ? { when: (c) => evaluate(h.when, ruleContext(c)) } : {}),
      ...(h.modify
        ? { modify: (value, c) => evaluate(h.modify, value, ruleContext(c)) }
        : {}),
      ...(typeof h.effects === "function"
        ? { effects: (c) => evaluate(h.effects, ruleContext(c)) }
        : {}),
    })),
  };
}
