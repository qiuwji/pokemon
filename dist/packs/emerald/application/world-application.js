import {
  WorldStateService,
  emptyWorldState,
} from "../../../engine/world-state.js";
import { NPCBehaviorRegistry } from "../../../engine/npc-behaviors.js";
import { FieldSession } from "../../../engine/field-session.js";
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
  "advanceTravelClocks",
  "timeView",
  "actionBusy",
  "growthBusy",
  "growthDirector",
  "sceneDirector",
  "travelDirector",
  "battle",
  "bindMovement",
  "bindFieldActions",
  "busy",
  "camera",
  "catalog",
  "conditionQueries",
  "db",
  "fieldActionOptions",
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
      ...objectsFor(
        { ...this.state, position: { ...this.state.position, map } },
        this.db,
      ),
      ...(this.db.maps[map].elements || []),
    ];
  }
  patchWorld(operations) {
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
    return result;
  }
  prepareWorldPatch(operations) {
    const draft = this.worldState.prepare(operations);
    const current = this.state.position;
    const record = draft.maps[current.map];
    const tile =
      record?.tiles[current.y * this.db.maps[current.map].width + current.x];
    if (tile?.block !== undefined && (tile.block >> 10) & 3)
      throw new Error("World patch would block the player");
    for (const [id, entry] of Object.entries(record?.objects || {})) {
      const base = this.baseWorldObjects(current.map).find((o) => o.id === id);
      const position = { ...base, ...entry.changes };
      if (
        !entry.hidden &&
        (entry.spawn || base) &&
        position.x === current.x &&
        position.y === current.y
      )
        throw new Error("World object would overlap the player");
    }
    return draft;
  }
  enter(position) {
    this.field.cancelForced("travel");
    this.world.enter(position.map, position.x, position.y, position.dir);
    this.motion.snap(this.state.position);
  }
  move(dir, { running = false } = {}) {
    if (this.battle || this.storyBusy || this.ui?.blocked || this.busy)
      return false;
    return this.field.move(dir, {
      running: running && !this.world.map.indoor,
    });
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
    if (this.ui.blocked) return;
    const object = this.world.interact();
    if (!object) {
      const action = this.fieldActionOptions().find(
        (entry) =>
          entry.ok && ["dive", "surface", "waterfall"].includes(entry.id),
      );
      if (action) {
        this.ui.showFieldAction(action.id);
        return;
      }
      const [dx, dy] = DIRECTIONS[this.state.position.dir];
      const cell = this.world.cell(
        this.state.position.x + dx,
        this.state.position.y + dy,
      );
      if (isWater(cell?.behavior) && this.state.movement.mode !== "surf")
        this.ui.showSurf();
      return;
    }
    if (
      object.script === "LittlerootTown_BrendansHouse_2F_EventScript_WallClock"
    ) {
      this.ui.showTime();
      return;
    }
    if (["cutTree", "breakableRock"].includes(object.kind)) {
      this.ui.showFieldAction(object.kind === "cutTree" ? "cut" : "rock-smash");
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
    void this.playStory(
      commands.length
        ? commands
        : object.trainerId
          ? this.trainerScene(object)
          : [],
    );
  }
  get world() {
    return this.field.world;
  }
  bind() {
    this.field?.dispose();
    this.state.worldState ||= emptyWorldState();
    this.worldState = new WorldStateService({
      db: this.db,
      state: this.state.worldState,
      objects: (map) => this.baseWorldObjects(map),
    });
    this.resetTriggers();
    this.bindMovement();
    this.field = new FieldSession({
      maps: this.worldState.maps,
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
      npcBehaviors: new NPCBehaviorRegistry(this.catalog.npcBehaviors),
      npcContext: (map) => ({
        time: this.timeView(),
        environment: this.worldState.maps[map].presentation || {},
      }),
      now: this.timeline.now,
      objects: (map) =>
        this.worldState
          .projectObjects(map)
          .filter((e) =>
            matchesCondition(e.requires, this.state, this.conditionQueries),
          ),
      onStep: (cell) => this.step(cell),
      onProgress: () => this.advanceTravelClocks(),
      onMap: () => {
        this.visitMap();
        this.onMap(this.world.map.title, this.state.position.map);
      },
      onBlocked: (kind) => {
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
    this.fieldDirector = new FieldDirector({
      field: this.field,
      timeline: this.timeline,
      camera: this.camera,
      reducedMotion: this.reducedMotion,
    });
    this.bindFieldActions();
    this.visitMap();
    this.plugins?.rebind();
    this.onMap(this.world.map.title, this.state.position.map);
  }
}
