import { inventoryCounts } from "../../../engine/inventory.js";
import {
  FieldEffectRegistry,
  FieldEffects,
} from "../../../engine/field-effects.js";
import { EMERALD_FIELD_EFFECTS } from "../field-effects.js";
import { WorldObjectOperations } from "./world-object-operations.js";
import {
  FieldActionRegistry,
  FieldActionService,
} from "../../../engine/field-actions.js";
import { World, DIRECTIONS } from "../../../engine/world.js";
import { EMERALD_FIELD_ACTIONS } from "../field-actions.js";
import { FieldActionDirector } from "../../../presentation/field-action-director.js";
import { FishingSession } from "../../../engine/fishing.js";
import { gen3FishingRules } from "../../../engine/rules/gen3/fishing.js";
import { bindApplicationPorts } from "./ports.js";
import { validateValue } from "../../../engine/extensions/values.js";

export const FIELD_ACTION_PORTS = Object.freeze([
  "battle",
  "busy",
  "catalog",
  "deviceView",
  "deviceEvent",
  "clearInput",
  "encounterService",
  "encounterTables",
  "enter",
  "field",
  "fieldDirector",
  "movement",
  "inspectMovementMode",
  "commitMovementMode",
  "patchWorld",
  "plugins",
  "prepareWorldPatch",
  "reducedMotion",
  "rng",
  "save",
  "startBattle",
  "startInteraction",
  "state",
  "storyBusy",
  "timeline",
  "transitions",
  "ui",
  "world",
  "worldState",
]);

/** Coordinates validated field plans, choreography and existing world/movement/battle ports. */
export class FieldActionApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, FIELD_ACTION_PORTS);
    this.actionBusy = false;
  }
  bind() {
    this.effects = new FieldEffects({
      state: this.state.fieldEffects,
      maps: this.worldState.maps,
      registry: new FieldEffectRegistry(
        this.catalog.fieldEffects || EMERALD_FIELD_EFFECTS,
      ),
    });
    const visit = this.effects.prepareVisit(this.state.position.map, {
      resume: true,
    });
    if (visit) this.effects.commit(visit);
    this.objectOperations = new WorldObjectOperations({
      field: this.field,
      movement: this.movement,
      worldState: this.worldState,
      prepareWorldPatch: this.prepareWorldPatch,
      deviceEvent: this.deviceEvent,
      plugins: this.plugins,
    });
    this.actions = new FieldActionService({
      registry: new FieldActionRegistry(
        this.catalog.fieldActions || EMERALD_FIELD_ACTIONS,
      ),
      query: () => this.query(),
      prepareOperation: (operation) => this.prepareOperation(operation),
      commitOperation: (prepared) => this.commitOperation(prepared),
      emit: (type, payload) => this.plugins?.events.emit(type, payload),
    });
    this.actionDirector = new FieldActionDirector({
      timeline: this.timeline,
      reducedMotion: this.reducedMotion,
    });
  }
  query() {
    const p = this.state.position;
    return {
      position: { ...p },
      devices: this.deviceView(),
      mode: this.state.movement.mode,
      movementOptions: Object.fromEntries(
        Object.keys(this.catalog.movement).map((mode) => [
          mode,
          this.inspectMovementMode(mode),
        ]),
      ),
      revision: this.worldState.state.revision,
      effects: this.effects.state,
      map: {
        width: this.world.map.width,
        height: this.world.map.height,
        blocks: this.world.map.blocks,
        behavior: this.world.map.behavior,
        underwater: !!this.world.map.underwater,
        darkness: this.world.map.darkness || null,
      },
      flags: this.state.flags,
      bag: inventoryCounts(this.state.bag),
      party: this.state.party.map((m) => ({
        uid: m.uid,
        hp: m.hp,
        egg: !!m.egg,
        ability: m.ability || null,
        moves: m.moves.map((s) => ({ id: s.id })),
      })),
      objects: this.field.npcs.objects(p.map).map((o) => ({
        id: o.id,
        kind: o.kind || "",
        x: o.x,
        y: o.y,
        elevation: o.elevation,
        reserved: this.field.npcs.reserved(o),
      })),
      links: Object.values(this.catalog.fieldLinks || {}),
    };
  }
  prepareOperation(operation) {
    const allowed = {
      world: ["kind", "operations", "encounter"],
      travel: ["kind", "position", "mode"],
      route: ["kind", "directions", "mode"],
      fishing: ["kind", "rod"],
      interaction: ["kind", "id", "parameters", "source"],
      movement: ["kind", "mode"],
      effect: ["kind", "id", "data", "remove"],
      displace: [
        "kind",
        "object",
        "direction",
        "follow",
        "mode",
        "scope",
        "duration",
      ],
    };
    if (
      !allowed[operation.kind] ||
      Object.keys(operation).some((k) => !allowed[operation.kind].includes(k))
    )
      throw new Error("Unsupported field operation");
    if (operation.kind === "displace")
      return {
        kind: "displace",
        prepared: this.objectOperations.prepare(operation),
      };
    if (operation.kind === "effect") {
      if (
        operation.remove !== undefined &&
        typeof operation.remove !== "boolean"
      )
        throw new Error("Invalid field effect removal");
      return {
        ...operation,
        prepared: this.effects.prepare(operation.id, operation.data, {
          remove: operation.remove,
        }),
      };
    } else if (operation.kind === "world") {
      if (operation.encounter !== undefined && operation.encounter !== "rock")
        throw new Error("Invalid field encounter");
      this.prepareWorldPatch(operation.operations);
    } else if (operation.kind === "travel") {
      const p = operation.position,
        preview = Object.hasOwn(this.worldState.maps, p?.map)
          ? this.world.entryPreview(p.map)
          : null,
        map = preview?.map;
      if (
        !map ||
        !Number.isInteger(p.x) ||
        !Number.isInteger(p.y) ||
        p.x < 0 ||
        p.y < 0 ||
        p.x >= map.width ||
        p.y >= map.height ||
        !DIRECTIONS[p.dir] ||
        Object.keys(p).some((k) => !["map", "x", "y", "dir"].includes(k)) ||
        !this.movement.available(operation.mode, map)
      )
        throw new Error("Invalid field travel destination");
      const index = p.y * map.width + p.x;
      if (
        !this.movement.traversal(operation.mode, {
          map,
          dir: p.dir,
          from: this.state.position,
          warp: null,
          cell: {
            behavior: map.behavior[index],
            collision: (map.blocks[index] >> 10) & 3,
          },
        }) ||
        preview.objects.some(
          (o) =>
            (o.x === p.x && o.y === p.y) ||
            o.reserved?.some((r) => r.x === p.x && r.y === p.y),
        )
      )
        throw new Error("Field travel destination is blocked");
    } else if (operation.kind === "movement") {
      const result = this.inspectMovementMode(operation.mode);
      if (!result.ok) throw new Error(result.reason);
    } else if (operation.kind === "fishing") {
      gen3FishingRules(operation.rod);
    } else if (operation.kind === "interaction") {
      if (
        typeof operation.id !== "string" ||
        !operation.id ||
        (operation.parameters !== undefined &&
          (!operation.parameters ||
            typeof operation.parameters !== "object" ||
            Array.isArray(operation.parameters)))
      )
        throw new Error("Invalid field interaction");
    } else {
      if (
        !Array.isArray(operation.directions) ||
        !operation.directions.length ||
        operation.directions.length > 256 ||
        operation.directions.some((dir) => !DIRECTIONS[dir]) ||
        !this.movement.available(operation.mode, this.world.map)
      )
        throw new Error("Invalid field route");
      const position = { ...this.state.position },
        world = new World(this.worldState.maps, position, {
          objects: (map) => this.field.npcs.occupants(map),
          elevation: this.world.elevation,
          passage: (c) => this.movement.traversal(operation.mode, c),
        });
      for (const direction of operation.directions)
        if (
          !world.move(direction, { ignoreWarps: true }) ||
          position.map !== this.state.position.map
        )
          throw new Error("Field route is blocked or crosses a map boundary");
    }
    return operation;
  }
  async commitOperation(operation) {
    if (operation.kind === "displace")
      return this.objectOperations.commit(operation.prepared);
    if (operation.kind === "effect") {
      const result = this.effects.commit(operation.prepared);
      this.plugins?.events.emit("core:field-effect-changed", {
        id: operation.id,
        removed: !!operation.remove,
        revision: result.revision,
      });
      return result;
    }
    if (operation.kind === "world")
      return this.patchWorld(operation.operations);
    if (operation.kind === "travel") {
      // This call runs only behind an opaque transition; normal map lifecycle remains authoritative.
      if (!this.enter(operation.position))
        throw new Error("Field travel destination changed");
      const result = this.movement.set(operation.mode, this.world.map);
      if (!result.ok) throw new Error("Field travel mode unavailable");
    }
    if (operation.kind === "route")
      await this.fieldDirector.move({
        path: operation.directions,
        mode: operation.mode,
      });
    if (operation.kind === "movement") {
      const result = this.commitMovementMode(operation.mode);
      if (!result.ok) throw new Error(result.reason);
    }
    if (operation.kind === "fishing") return this.runFishing(operation.rod);
    if (operation.kind === "interaction")
      return {
        ok: true,
        interaction: this.startInteraction(
          operation.id,
          operation.parameters || {},
          operation.source || null,
        ),
      };
    return { ok: true };
  }
  inspect(id, input = {}) {
    const { ok, reason } = this.actions.inspect(id, input);
    return { ok, ...(reason ? { reason } : {}) };
  }
  viewEffects() {
    return this.effects.view();
  }
  prepareVisit(map, options) {
    const plan = this.effects.prepareVisit(map, options);
    return {
      check: () => {
        if (plan) this.effects.check(plan);
      },
      commit: () => {
        if (plan) this.effects.commit(plan);
      },
    };
  }
  interaction(event) {
    return this.actions.interaction(event);
  }
  triggerBlocked() {
    if (
      this.actionBusy ||
      this.field.busy ||
      this.storyBusy ||
      this.ui?.blocked
    )
      return false;
    const action = this.interaction("blocked");
    if (!action) return false;
    this.pendingInteraction = this.perform(action.id);
    return true;
  }
  options() {
    const entries = this.actions
      .list()
      .filter((entry) => entry.id !== "fishing");
    if (this.actions.registry.definitions.has("fishing"))
      for (const [rod, label] of [
        ["old", "破旧钓竿"],
        ["good", "好钓竿"],
        ["super", "超级钓竿"],
      ]) {
        const { ok, reason } = this.actions.inspect("fishing", { rod });
        entries.push({
          id: "fishing",
          ok,
          ...(reason ? { reason } : {}),
          name: label,
          input: { rod },
        });
      }
    return entries;
  }
  reelFishing({ cancel = false } = {}) {
    if (!this.fishing) return { ok: false, reason: "现在没有在钓鱼。" };
    if (cancel) this.fishing.cancel();
    else this.fishing.press();
    this.ui?.updateFishing?.(this.fishing.view());
    return { ok: true, ...this.fishing.view() };
  }
  async runFishing(rod) {
    const table = this.encounterTables.select(
      this.state.position.map,
      "fishing",
      this.state,
      { rod },
    );
    this.fishing = new FishingSession({
      rules: gen3FishingRules(rod),
      roll: (max) => this.rng.int(max),
      now: this.timeline.now,
      hasEncounters: !!table,
      lead: this.state.party[0],
    });
    let previous = "";
    try {
      this.ui?.showFishing?.();
      while (!this.fishing.result) {
        const view = this.fishing.tick(),
          signature = JSON.stringify(view);
        if (signature !== previous) {
          previous = signature;
          this.ui?.updateFishing?.(view);
        }
        if (!this.fishing.result) await this.timeline.wait(16);
      }
      const result = this.fishing.result;
      this.ui?.updateFishing?.(this.fishing.view());
      if (result !== "cancelled") await this.timeline.wait(600);
      return {
        ok: true,
        fishing: result,
        ...(result === "caught" && table ? { encounter: table } : {}),
      };
    } finally {
      this.fishing = null;
      this.ui?.closeFishing?.();
    }
  }
  validateCommand(command) {
    const definition = this.actions.registry.definitions.get(command.id);
    if (
      !definition ||
      Object.keys(command).some(
        (key) => !["type", "id", "input", "variable"].includes(key),
      )
    )
      throw new Error("Invalid field action story command");
    validateValue(definition.schema, command.input || {});
  }
  async performFromStory(id, input = {}) {
    if (
      !this.storyBusy ||
      !this.fieldDirector.active ||
      this.actionBusy ||
      this.field.busy ||
      this.transitions.busy ||
      this.battle ||
      this.ui?.dialog
    )
      throw new Error("Story field action requires an idle owned field scene");
    return this.execute(id, input, { ownScene: false });
  }
  async perform(id, input = {}) {
    if (this.busy || this.battle || this.ui?.dialog)
      return { ok: false, reason: "请先结束当前行动。" };
    return this.execute(id, input, { ownScene: true });
  }
  async execute(id, input, { ownScene }) {
    let plan,
      result,
      monster,
      sceneOwned = false;
    this.actionBusy = true;
    this.clearInput();
    try {
      if (ownScene) {
        this.fieldDirector.begin();
        sceneOwned = true;
      }
      const prepared = this.actions.prepare(id, input);
      if (!prepared.ok) return prepared;
      plan = prepared.plan;
      await this.actionDirector.play(
        plan,
        async () => {
          result = await this.actions.commit(plan);
          return result;
        },
        { transitions: this.transitions },
      );
      this.field.tick(this.timeline.now());
      if (result?.motion) this.objectOperations.settle(result.motion);
      if (!result?.ok) return result;
      if (plan.operation.encounter) {
        const table = this.encounterTables.select(
          this.state.position.map,
          plan.operation.encounter,
          this.state,
        );
        if (table)
          monster = this.encounterService().attempt({
            party: this.state.party,
            ...table,
          });
      }
      if (result.encounter) {
        monster = this.encounterService().attempt({
          party: this.state.party,
          ...result.encounter,
          checkRate: false,
          checkSelection: false,
          checkPermission: false,
        });
        result = { ok: true, fishing: result.fishing };
      }
      return result;
    } catch (error) {
      return { ok: false, reason: error.message };
    } finally {
      if (plan) this.actions.discard(plan);
      try {
        if (sceneOwned) await this.fieldDirector.end({ failed: !result?.ok });
      } finally {
        this.actionBusy = false;
        this.clearInput();
        this.ui?.updateSide();
        this.save();
        if (monster) {
          if (ownScene) void this.startBattle(monster);
          else await this.startBattle(monster);
        }
      }
    }
  }
}
