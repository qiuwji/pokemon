import { inventoryCounts } from "../inventory.js";
import { qualified, freeze, readOnly } from "./values.js";
export const CONTENT_KINDS = Object.freeze([
  "species",
  "moves",
  "maps",
  "tilesets",
  "actors",
  "appearances",
  "cameraProfiles",
  "environmentLayers",
  "evolutions",
  "items",
  "inventoryPockets",
  "learningMethods",
  "weather",
  "battleWeather",
  "abilities",
  "heldItems",
  "moveEffects",
  "battleAugments",
  "movement",
  "movementInputs",
  "fieldActions",
  "fieldEffects",
  "fieldLinks",
  "terrainRules",
  "fieldMechanisms",
  "fieldDevices",
  "timeTasks",
  "crops",
  "berryPlots",
  "actorTemplates",
  "actorSchedules",
  "npcPoses",
  "destinations",
  "resources",
  "mapExtensions",
  "growthConditions",
  "npcBehaviors",
  "trainers",
  "facilities",
  "facilityActivities",
  "encounters",
  "encounterPolicies",
  "battleStrategies",
  "conditionQueries",
  "battleStates",
  "forms",
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
    this.compiled = freeze(result);
    return this.compiled;
  }
  dependencies(state) {
    const used = [
      state.position?.map,
      ...Object.values(state.appearances?.records || {}).flatMap((r) => [
        r.appearance,
        r.target.map,
      ]),
      ...Object.values(state.encounters?.records || {}).flatMap((t) => [
        t.map,
        t.table,
        t.monster.species,
        t.monster.ability,
        t.monster.heldItem,
        ...t.monster.moves.map((m) => m.id),
      ]),
      ...Object.values(state.facilities?.results || []).flatMap((r) => [
        r.facility,
        (
          this.entries.get(`facilities/${r.facility}`)?.value ||
          this.base.facilities?.[r.facility]
        )?.activity,
      ]),
      state.weather?.active?.selection,
      state.weather?.active?.kind,
      ...Object.entries(state.weather?.overrides || {}).flatMap(([map, r]) => [
        map,
        r.weather,
      ]),
      ...Object.keys(state.devices?.records || {}),
      ...Object.keys(state.devices?.timers || {}),
      ...Object.entries(state.devices?.requests || {}).flatMap(
        ([id, requests]) => [
          id,
          ...Object.values(requests).map((r) => r.action),
        ],
      ),
      ...Object.values(state.actors?.records || {}).flatMap((r) => {
        const schedule = (
          this.entries.get(`actorTemplates/${r.template}`)?.value ||
          this.base.actorTemplates?.[r.template]
        )?.schedule;
        const definition =
          this.entries.get(`actorSchedules/${schedule}`)?.value ||
          this.base.actorSchedules?.[schedule];
        const template =
          this.entries.get(`actorTemplates/${r.template}`)?.value ||
          this.base.actorTemplates?.[r.template];
        return [
          template?.appearance?.id,
          r.template,
          r.map,
          r.pose,
          schedule,
          ...(definition?.entries || []).flatMap((e) => [
            e.position.map,
            e.behavior,
            e.pose,
          ]),
        ];
      }),
      ...Object.keys(state.fieldEffects?.records || {}),
      ...Object.entries(state.crops?.trees || {}).flatMap(([id, tree]) => [
        id,
        tree.kind,
      ]),
      ...Object.values(state.schedule?.tasks || {}).map(
        (task) => task.definition,
      ),
      ...Object.values(state.forms || {}).map((r) => r.id),
      ...Object.keys(state.worldState?.maps || {}),
      ...Object.keys(state.worldState?.visits || {}),
      ...[
        ...Object.values(state.worldState?.maps || {}),
        ...Object.values(state.worldState?.visits || {}),
      ].flatMap((record) =>
        Object.entries(record.objects || {}).flatMap(([id, e]) => [
          id,
          e.changes.actor,
          e.changes.trainerId,
        ]),
      ),
      state.movement?.mode,
      state.registeredItem?.item,
      ...Object.keys(state.bag ? inventoryCounts(state.bag) : {}),
      ...Object.keys(state.bag?.pockets || {}),
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
    // Tile indices belong to their map's registered tileset. Track its owner and image resource.
    for (const [mapId, record] of [
      ...Object.entries(state.worldState?.maps || {}), ...Object.entries(state.worldState?.visits || {}),
    ]) {
      if (!Object.keys(record.tiles || {}).length) continue;
      const map = this.compiled?.maps[mapId] || this.base.maps?.[mapId];
      const tileset = this.compiled?.tilesets[map?.tileset] || this.base.tilesets?.[map?.tileset];
      used.push(map?.tileset, tileset?.resource);
    }
    for (const appearance of [...used]) {
      const definition =
        this.entries.get(`appearances/${appearance}`)?.value ||
        this.compiled?.appearances?.[appearance] ||
        this.base.appearances?.[appearance];
      if (definition)
        for (const recipe of Object.values(definition.variants))
          for (const layer of recipe.layers)
            used.push(layer.actor, layer.resource);
    }
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
    "battleState",
    "reason",
    "status",
    "majorStatus",
    "sourceSeat",
    "sourceKind",
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
        ? {
            modify: (value, c) =>
              evaluate(h.modify, readOnly(value), ruleContext(c)),
          }
        : {}),
      ...(typeof h.effects === "function"
        ? { effects: (c) => evaluate(h.effects, ruleContext(c)) }
        : {}),
    })),
  };
}
