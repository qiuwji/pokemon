import { GEN3_ELEVATION } from "../../../engine/rules/gen3/elevation.js";
import { NPCPoseRegistry } from "../../../engine/npc-poses.js";
import {
  WorldStateService,
  emptyWorldState,
} from "../../../engine/world-state.js";
import { NPCBehaviorRegistry } from "../../../engine/npc-behaviors.js";
import { FieldSession } from "../../../engine/field-session.js";
import { readOnly } from "../../../engine/extensions/values.js";
import { WorldQuery } from "../../../engine/world-query.js";
import { nativeSigns, objectCapabilities, inspectWorldObjects } from "../../../engine/world-object-index.js";
import { FieldDirector } from "../../../engine/field-director.js";
import { objectsFor } from "../pack.js";
import { matchesCondition } from "../../../engine/conditions.js";
import { DIRECTIONS } from "../../../engine/world.js";
import { isWater } from "../../../engine/terrain.js";
import {
  FieldTerrainRegistry,
  FieldTerrainService,
} from "../../../engine/field-terrain.js";
import { EMERALD_TERRAIN_RULES } from "../terrain-rules.js";
import { bindApplicationPorts } from "./ports.js";
export const WORLD_PORTS = Object.freeze([
  "control",
  "bindActorMaps",
  "advanceTravelClocks",
  "storyCatalog",
  "storyMapEntered",
  "timeView",
  "weatherView",
  "enterWeather",
  "stepWeather",
  "actorObjects",
  "actorRuntime",
  "actionBusy",
  "growthBusy",
  "growthDirector",
  "sceneDirector",
  "travelDirector",
  "facilityActive",
  "battle",
  "bindMovement",
  "bindFieldActions",
  "bindDevices",
  "deviceEvent",
  "deviceVisit",
  "devicePending",
  "interactDevice",
  "busy",
  "camera",
  "catalog",
  "conditionQueries",
  "db",
  "fieldInteraction",
  "fieldEffectVisit",
  "blockedFieldInteraction",
  "blockedContact",
  "bindContacts",
  "motion",
  "movement",
  "onMap",
  "playStory",
  "plugins",
  "reducedMotion",
  "resetTriggers",
  "runStory",
  "save",
  "state",
  "step",
  "story",
  "storyBusy",
  "timeline",
  "trainerScene",
  "transitions",
  "ui",
  "visitMap",
]);
/** world use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class WorldApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, WORLD_PORTS);
  }
  baseWorldObjects(map) {
    return [
      ...this.storyCatalog.projectObjects(
        map,
        [
          ...objectsFor(
            { ...this.state, position: { ...this.state.position, map } },
            this.db,
          ),
          ...(this.db.maps[map].elements || []),
          ...this.actorObjects(map),
        ],
        this.state,
      ),
      ...nativeSigns(map, this.db.maps[map]),
    ];
  }
  objects({ map = this.state.position.map, id } = {}) {
    if (!this.db.maps[map]) throw new Error("Unknown query map");
    const listing = inspectWorldObjects({
      map, id, source: this.db.maps[map], definitions: this.baseWorldObjects(map),
      objects: [...this.field.npcs.occupants(map), ...this.worldState.maps[map].signs],
      record: this.worldState.record(map), revision: this.worldState.state.revision,
    });
    if (!id || !listing.objects[0].dialogue) return listing;
    const object = listing.objects[0];
    let dialoguePreview = null, dialogueError = null;
    try {
      dialoguePreview = this.storyCatalog.resolveDialogue({ type: "dialog", dialogue: object.dialogue }, this.state);
    } catch (error) {
      dialogueError = error.message;
    }
    return readOnly({ ...listing, objects: [{ ...object, dialoguePreview, dialogueError }] });
  }
  patchWorld(operations, { feedback = false } = {}) {
    const draft = this.prepareWorldPatch(operations);
    const result = this.worldState.commit(draft);
    for (const operation of operations)
      if (operation.kind === "object")
        this.field.npcs.invalidate(operation.map, operation.id);
    this.plugins?.events.emit("core:world-changed", {
      revision: result.revision,
      operations,
    });
    this.ui?.updateSide();
    if (!this.storyBusy) this.save();
    if (!feedback) return result;
    try {
      return readOnly({
        ...result,
        changes: operations.map((operation) => ({
          kind: operation.kind, map: operation.map,
          ...(operation.kind === "tile"
            ? { region: this.cells({ map: operation.map, x: operation.x, y: operation.y, width: 1, height: 1 }) }
            : { object: this.objects({ map: operation.map, id: operation.id }).objects[0] }),
        })),
      });
    } catch (error) {
      return { ...result, feedbackError: error.message };
    }
  }
  prepareWorldPatch(operations) {
    if (
      operations.some(
        (o) => o.kind === "object" && /^core:actor\.\d+$/.test(o.id),
      )
    )
      throw new Error("Persistent actors require actor commands");
    for (const operation of operations)
      if (operation.kind === "object")
        GEN3_ELEVATION.validate(operation.changes || {});
    const draft = this.worldState.prepare(operations);
    for (const operation of operations) {
      if (operation.kind !== "object") continue;
      const original = this.baseWorldObjects(operation.map).find((o) => o.id === operation.id);
      const stored = this.worldState.record(operation.map, draft).objects[operation.id];
      const object = { ...original, ...stored.changes, id: operation.id };
      const capabilities = objectCapabilities(original || object);
      const finalCapabilities = objectCapabilities(object);
      if (Object.keys(operation.changes || {}).some((key) =>
        !capabilities.fields.includes(key) || !finalCapabilities.fields.includes(key)))
        throw new Error(`Unsupported world object field: ${operation.map}/${operation.id}`);
      if (operation.changes?.dialogue != null)
        this.storyCatalog.resolveDialogue({ type: "dialog", dialogue: operation.changes.dialogue }, this.state);
      if (original && (original.kind === "sign") !== (object.kind === "sign"))
        throw new Error("Changing an object between NPC and sign is unsupported");
    }
    this.assertOccupants(
      draft,
      new Set(operations.map((o) => o.map)),
      this.state.position,
    );
    return draft;
  }
  /** Validate the composed result, including temporary layers and in-flight actor reservations. */
  assertOccupants(draft, maps, player) {
    for (const id of maps) {
      const map = this.worldState.map(id, draft),
        entries = {
          ...this.worldState.record(id).objects,
          ...this.worldState.record(id, draft).objects,
        },
        objects = this.worldState.projectObjects(id, undefined, draft).filter((o) => o.kind !== "sign"),
        actors = this.field.npcs
          .occupants(id)
          .filter((n) => /^core:actor\.\d+$/.test(n.id));
      const protectedCells = actors.flatMap((a) => [
        a,
        ...(a.reserved || []).map((p) => ({ ...p, id: a.id })),
      ]);
      if (player?.map === id) protectedCells.push({ ...player, player: true });
      for (const cell of protectedCells) {
        const block = map.blocks[cell.y * map.width + cell.x];
        if (
          block !== undefined &&
          ((block >> 10) & 3 ||
            !GEN3_ELEVATION.canEnter(
              GEN3_ELEVATION.level(cell, map),
              block >> 12,
            ))
        )
          throw new Error(
            `World patch would block ${cell.player ? "the player" : "an actor"}`,
          );
        if (
          objects.some(
            (o) =>
              entries[o.id] &&
              o.x === cell.x &&
              o.y === cell.y &&
              o.id !== cell.id &&
              GEN3_ELEVATION.compatible(
                GEN3_ELEVATION.level(cell, map),
                GEN3_ELEVATION.level(o, map),
              ),
          )
        )
          throw new Error(
            `World object would overlap ${cell.player ? "the player" : "an actor"}`,
          );
      }
    }
  }
  prepareEntry(map, options = {}) {
    const deviceVisit = this.deviceVisit(map);
    const effectVisit = this.fieldEffectVisit(map, options);
    const draft = this.worldState.prepareVisit(map),
      projected = this.worldState.projectObjects(map, undefined, draft),
      runtime = new Map(this.field.npcs.occupants(map).map((o) => [o.id, o]));
    const objects = projected
      .filter((e) => e.kind !== "sign")
      .filter((e) =>
        matchesCondition(e.requires, this.state, this.conditionQueries),
      )
      .map((o) => {
        const live = runtime.get(o.id);
        return live && live._worldVersion === o._worldVersion ? live : o;
      });
    for (const [id, live] of runtime)
      if (/^core:actor\.\d+$/.test(id) && !objects.some((o) => o.id === id))
        objects.push(live);
    const changed = Object.keys(
      this.state.worldState.visits?.[map]?.objects || {},
    );
    return {
      map: this.worldState.map(map, draft),
      entered: () => {
        this.control.record("map.entered", { map, reason: options.reason || "travel", position: { ...this.state.position } });
        this.storyMapEntered(map, options.reason || "travel");
        this.enterWeather(map);
        this.deviceEvent("activate", this.state.position);
        this.plugins?.events.emit("core:world-visit", {
          map,
          revision: this.worldState.state.revision,
          restoredObjects: changed,
        });
      },
      objects,
      commit: (position) => {
        try {
          this.worldState.cell(map, position.x, position.y);
          if (!DIRECTIONS[position.dir])
            throw new Error("Invalid map entry direction");
          this.assertOccupants(draft, new Set([map]), position);
          if (
            objects.some((o) =>
              GEN3_ELEVATION.occupies(
                this.worldState.map(map, draft),
                o,
                position.x,
                position.y,
                position.elevation,
              ),
            )
          )
            throw new Error("Map entry is occupied");
          deviceVisit.check();
          effectVisit.check();
          this.worldState.commit(draft);
          deviceVisit.commit();
          effectVisit.commit();
          for (const id of changed) this.field.npcs.invalidate(map, id);
          return true;
        } catch (error) {
          this.ui?.toast(error.message);
          return false;
        }
      },
    };
  }
  enter(position) {
    const from = { ...this.state.position };
    this.field.cancelForced("travel");
    const entered = this.world.enter(
      position.map,
      position.x,
      position.y,
      position.dir,
      this.world.entryPreview(position.map, { reason: "travel" }),
    );
    if (entered) {
      this.motion.snap(this.state.position);
      this.control.record("teleport", { from, to: { ...this.state.position } });
      if (from.map !== this.state.position.map) this.control.record("map.changed", { from: from.map, to: this.state.position.map });
    }
    return entered;
  }
  move(dir, { running = false, duration } = {}) {
    if (
      this.battle ||
      this.storyBusy ||
      this.state.story.session ||
      this.ui?.blocked ||
      this.busy ||
      this.devicePending() ||
      this.facilityActive
    )
      return false;
    this.blockedObject = null;
    const moved = this.field.move(dir, {
      running: running && !this.world.map.indoor,
      ...(duration !== undefined ? { duration } : {}),
    });
    const accepted =
      moved || (!this.field.busy && this.blockedFieldInteraction());
    if (!accepted && this.blockedObject)
      this.blockedContact(this.blockedObject);
    return accepted;
  }
  interact() {
    if (this.ui.dialog) {
      this.ui.nextDialogue();
      return;
    }
    if (this.busy || this.storyBusy) return;
    if (this.battle) {
      this.ui.confirmBattle();
      return;
    }
    if (this.ui.blocked || this.facilityActive) return;
    if (this.state.story.session) {
      this.ui.toast("当前有暂停的剧情，请从菜单继续剧情。");
      return;
    }
    const action = this.fieldInteraction("interact");
    if (action) {
      this.ui.showFieldAction(action.id);
      return;
    }
    const object = this.world.interact();
    if (!object) {
      if (this.interactDevice()) return;
      const [dx, dy] = DIRECTIONS[this.state.position.dir];
      const cell = this.world.cell(
        this.state.position.x + dx,
        this.state.position.y + dy,
      );
      if (isWater(cell?.behavior) && this.state.movement.mode !== "surf")
        this.ui.showSurf();
      return;
    }
    if (object.kind === "berryPlot") {
      this.ui.showBerryPlot(object.plotId);
      return;
    }
    if (object.kind === "daycare") {
      this.ui.showDaycare();
      return;
    }
    if (object.id)
      this.field.npcs.face(
        object.id,
        this.state.position.map,
        { up: "down", down: "up", left: "right", right: "left" }[
          this.state.position.dir
        ],
      );
    const commands = this.story.resolve("interact", this.state, {
      object,
      mapTitle: this.world.map.title,
    });
    const interaction = this.control.beginInteraction(object);
    void this.playStory(
      commands.length
        ? commands
        : object.trainerId
          ? this.trainerScene(object)
          : [],
    ).finally(() => this.control.endInteraction(interaction));
  }
  get world() {
    return this.field.world;
  }
  bounds(map = this.state.position.map) {
    return this.query.bounds(map);
  }
  cells(region) {
    return this.query.cells({
      ...region,
      map: region.map || this.state.position.map,
    });
  }
  bind() {
    this.field?.dispose();
    this.state.worldState ||= emptyWorldState();
    this.worldState = new WorldStateService({
      db: this.db,
      state: this.state.worldState,
      objects: (map) => this.baseWorldObjects(map),
      dialogues: this.storyCatalog.dialogues,
    });
    this.bindActorMaps(this.worldState.maps);
    const resumeVisit =
      this.state.worldState.activeMap === this.state.position.map;
    const visit = this.worldState.prepareVisit(this.state.position.map, {
      resume: true,
    });
    if (visit) this.worldState.commit(visit);
    this.resetTriggers();
    this.bindMovement();
    this.field = new FieldSession({
      maps: this.worldState.maps,
      prepareEntry: (map, options) => this.prepareEntry(map, options),
      elevation: GEN3_ELEVATION,
      position: this.state.position,
      motion: this.motion,
      transitions: this.transitions,
      movement: this.movement,
      terrain: new FieldTerrainService(
        new FieldTerrainRegistry(
          this.catalog.terrainRules || EMERALD_TERRAIN_RULES,
        ),
      ),
      canContinue: () =>
        !this.battle &&
        !this.storyBusy &&
        !this.ui?.blocked &&
        !this.actionBusy &&
        !this.growthBusy &&
        !this.growthDirector.busy &&
        !this.sceneDirector?.busy &&
        !this.travelDirector.busy,
      onTerrain: (event) => {
        this.plugins?.events.emit("core:terrain-motion", event);
        if (event.kind === "fault")
          this.ui?.toast("地形规则发生错误：" + event.reason);
      },
      npcBehaviors: new NPCBehaviorRegistry(this.catalog.npcBehaviors, {
        poses: new NPCPoseRegistry(this.catalog.npcPoses, {
          actors: this.db.actors,
        }),
      }),
      npcResolveIntent: (...args) => this.actorRuntime.resolve(...args),
      npcOnIntent: (...args) => this.actorRuntime.intent(...args),
      npcActorStep: (...args) => this.actorRuntime.step(...args),
      npcOnChange: (...args) => this.actorRuntime.commit(...args),
      npcOnError: (error) => this.plugins?.onError(error),
      npcContext: (map, n) => ({
        ...this.actorRuntime.context(map, n),
        time: this.timeView(),
        environment: {
          ...this.worldState.maps[map].presentation,
          weather: this.weatherView(map).kind,
        },
      }),
      now: this.timeline.now,
      objects: (map) =>
        this.worldState
          .projectObjects(map)
          .filter((e) => e.kind !== "sign")
          .filter((e) =>
            matchesCondition(e.requires, this.state, this.conditionQueries),
          ),
      beforeWarp: (cell) => {
        if (this.storyBusy) return false;
        const commands = this.story.resolve('step', this.state, {
          map: this.state.position.map, position: { ...this.state.position }, cell,
        });
        if (!commands.length) return false;
        void this.playStory(commands);
        return true;
      },
      onWarp: ({ from, to }) => {
        this.control.record("teleport", { from, to });
        if (from.map !== to.map) this.control.record("map.changed", { from: from.map, to: to.map });
      },
      onStep: (cell) => {
        this.stepWeather(this.state.position);
        this.step(cell);
      },
      onStart: ({ from, position }) => {
        this.control.record("movement.started", { from, to: position });
        if (from.map !== position.map) this.control.record("map.changed", { from: from.map, to: position.map });
        this.deviceEvent("leave", from, { position });
        const map = this.worldState.maps[from.map],
          index = from.y * map.width + from.x;
        this.deviceEvent("enter", position, {
          from,
          fromTile: { block: map.blocks[index], behavior: map.behavior[index] },
        });
      },
      onProgress: () => {
        this.control.record("movement.settled", { position: { ...this.state.position } });
        this.deviceEvent("settle", this.state.position);
        this.advanceTravelClocks();
      },
      onMap: () => {
        this.visitMap();
        this.onMap(this.world.map.title, this.state.position.map);
      },
      onBlocked: (kind, object) => {
        this.blockedObject = kind === "object" ? object.id : null;
        if (kind === "unavailable")
          void this.runStory([
            {
              type: "dialog",
              name: "路旁的告示",
              lines: [
                "这片区域暂时未开放。当前可以探索未白镇、101 号道路、古辰镇和 103 号道路。",
              ],
            },
          ]);
      },
    });
    this.actorRuntime.reconcile();
    this.fieldDirector = new FieldDirector({
      field: this.field,
      timeline: this.timeline,
      camera: this.camera,
      reducedMotion: this.reducedMotion,
    });
    this.bindDevices({ resume: resumeVisit });
    this.bindFieldActions();
    this.bindContacts();
    this.query = new WorldQuery({
      maps: this.worldState.maps,
      objects: (map) => this.field.npcs.occupants(map),
      player: () => this.state.position,
      playerSource: () =>
        this.motion.moving(this.timeline.now())
          ? this.motion.sourcePosition
          : null,
      elevation: this.world.elevation,
      revision: () => this.worldState.state.revision,
    });
    this.visitMap();
    this.plugins?.rebind();
    this.onMap(this.world.map.title, this.state.position.map);
    this.storyMapEntered(
      this.state.position.map,
      resumeVisit ? "restore" : "start",
    );
  }
}
