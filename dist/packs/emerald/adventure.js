import {
  CreatureFormRegistry,
  CreatureForms,
} from "../../engine/creatures/forms.js";
import {
  changeStoryVariable,
  validateVariableCommand,
} from "../../engine/story-variables.js";
import { findWatchingTrainer } from "../../engine/field-triggers.js";
import { ConditionQueries } from "../../engine/condition-queries.js";
import {
  WorldStateService,
  emptyWorldState,
} from "../../engine/world-state.js";
import { EncounterTableRegistry } from "../../engine/encounter-tables.js";
import { BattleStrategyRegistry } from "../../engine/battle/strategy-registry.js";
import { NPCBehaviorRegistry } from "../../engine/npc-behaviors.js";
import { extensionGrowthConditions } from "../../engine/extensions/growth-conditions.js";
import { StoryEngine } from "../../engine/story.js";
import { GEN3_GLOBAL_HOOKS } from "../../engine/rules/gen3/global-rules.js";
import { StateCheckpoint } from "../../engine/state-checkpoint.js";
import { setLead, learnPendingMove } from "../../engine/party.js";
import { Random, createMonster, healMonster } from "../../engine/model.js";
import { SaveStore } from "../../engine/save-store.js";
import { FieldSession } from "../../engine/field-session.js";
import { BattleSession } from "../../engine/battle-session.js";
import { CommandRunner } from "../../engine/commands.js";
import { CameraRig } from "../../engine/camera.js";
import {
  FieldDirector,
  storyResources,
  validateFieldCommand,
} from "../../engine/field-director.js";
import { PACK, ITEMS, objectsFor, questFor, validateSave } from "./pack.js";
import { interaction, battleOutcome } from "./story.js";
import { EMERALD_STORY } from "./story.js";
import { createItemService } from "../../engine/items.js";
import { MoveEffectRegistry } from "../../engine/move-effects.js";
import {
  emptyStoryProgress,
  grantReward,
  completeEvent,
  validateReward,
} from "../../engine/story.js";
import {
  matchesCondition,
  validateCondition,
} from "../../engine/conditions.js";
import { EncounterService } from "../../engine/encounters.js";
import { GEN3_ABILITIES } from "../../engine/rules/gen3/abilities.js";
import { GrowthSession } from "../../engine/growth/session.js";
import { GrowthDirector } from "../../presentation/growth-director.js";
import { TradeService } from "../../engine/growth/trading.js";
import { PartyStorageService } from "../../engine/party-storage.js";
import { EquipmentService } from "../../engine/equipment.js";
import { GEN3_HELD_ITEMS } from "../../engine/rules/gen3/held-items.js";
import { MovementRegistry, MovementService } from "../../engine/movement.js";
import { TravelService } from "../../engine/travel.js";
import { TravelDirector } from "../../presentation/travel-director.js";
import { MOVEMENT_MODES, TRAVEL_DESTINATIONS } from "./movement.js";
import { DIRECTIONS } from "../../engine/world.js";
import { isWater } from "../../engine/terrain.js";
import { isGrass } from "../../engine/terrain.js";
import { TRAINERS, createTrainerEncounter } from "./trainers.js";

/** Composes the Emerald pack with reusable engine services. Browser ports are injected. */
export class EmeraldAdventure {
  constructor({
    db,
    storage,
    motion,
    director,
    sceneDirector = null,
    transitions,
    timeline,
    camera = new CameraRig(timeline),
    reducedMotion = () => false,
    onMap = () => {},
    onSave = () => {},
    clearInput = () => {},
    plugins = null,
    catalog = {
      items: ITEMS,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
      movement: MOVEMENT_MODES,
      destinations: TRAVEL_DESTINATIONS,
      moveEffects: {},
    },
  }) {
    Object.assign(this, {
      db,
      motion,
      director,
      sceneDirector,
      transitions,
      timeline,
      camera,
      reducedMotion,
      onMap,
      onSave,
      clearInput,
      plugins,
      catalog,
    });
    this.conditionQueries = new ConditionQueries(catalog.conditionQueries);
    this.itemDefinitions = catalog.items;
    this.trainerDefinitions = catalog.trainers || TRAINERS;
    this.battleStrategies = new BattleStrategyRegistry(
      catalog.battleStrategies,
    );
    this.encounterTables = new EncounterTableRegistry(catalog.encounters, db);
    this.story = new StoryEngine(
      [...(plugins?.story.values() || []), ...EMERALD_STORY.events],
      EMERALD_STORY.quests,
      { queries: this.conditionQueries },
    );
    for (const event of this.story.events)
      if (event.where) {
        const m = db.maps[event.where.map];
        if (
          !m ||
          event.where.x + event.where.width > m.width ||
          event.where.y + event.where.height > m.height
        )
          throw new Error(`Story region outside map: ${event.id}`);
      }
    this.items = createItemService(catalog.items);
    this.partyStorage = new PartyStorageService();
    this.trading = new TradeService({ db });
    this.equipment = new EquipmentService(catalog.heldItems);
    this.moveEffects = new MoveEffectRegistry({
      definitions: catalog.moveEffects,
    });
    this.ruleHooks = plugins?.hooks(this.moveEffects.operations) || [];
    this.moveEffects.validateMoves(db.moves);
    for (const item of Object.values(this.itemDefinitions))
      validateCondition(
        item.purchaseRequires,
        new Set(),
        "purchaseRequires",
        this.conditionQueries,
      );
    this.saveStore = new SaveStore(
      storage,
      PACK.id,
      (s) => validateSave(s, db, catalog, plugins),
      PACK.version,
      {
        diagnose: (state) => {
          const missing = (state?.contentDependencies || []).filter(
            (id) => !plugins?.manifests.has(id),
          );
          return missing.length
            ? { code: "missing_dependency", dependencies: missing }
            : null;
        },
      },
    );
    const loaded = this.saveStore.load();
    this.saveProtected =
      this.saveStore.lastIssue !== null &&
      ["missing_dependency", "invalid_state", "unsupported_version"].includes(
        this.saveStore.lastIssue?.code,
      );
    this.saveWarning = this.saveProtected
      ? this.saveStore.lastIssue.code === "unsupported_version"
        ? "开发存档版本已更新。原存档已保留，可导出备份或从菜单开始新冒险。"
        : this.saveStore.lastIssue.code === "missing_dependency"
          ? "存档需要插件：" +
            this.saveStore.lastIssue.dependencies.join("、") +
            "。原存档已保留，请恢复插件或从菜单明确开始新冒险。"
          : "存档数据未通过检查。原存档已保留，请导出备份，或从菜单明确开始新冒险。"
      : null;
    this.state = loaded?.state || this.newState();
    this.lastSave = loaded?.savedAt || 0;
    this.storyBusy = false;
    this.combat = new BattleSession({
      director,
      transitions,
      onMessage: (text) => {
        this.ui.drawBattleHUD(text);
        this.ui.announce(text);
      },
      onChange: () => {
        this.ui?.resetBattleMenu();
        this.ui?.drawBattleHUD();
        this.ui?.updateSide();
      },
      onResult: (b) => this.resultPlan(b),
    });
    this.commands = new CommandRunner(
      {
        presentation: (c) => this.sceneDirector.play(c.id, c.payload || {}),
        dialog: (c) => this.ui.say(c.name, c.lines),
        starter: () => this.ui.starterPicker(),
        shop: () => this.ui.showShop(),
        battle: (c) => {
          if (c.trainerId) return this.startTrainerBattle(c.trainerId);
          return this.startBattle(
            createMonster(c.species, c.level, db, this.rng, {
              trainer: c.options?.trainer,
            }),
            c.options,
          );
        },
        teleport: (c) => transitions.run("door", () => this.enter(c.position)),
        scene: (c) =>
          transitions.run(c.kind || "door", () => {
            this.enter(c.position);
            this.camera.reset();
            this.fieldDirector.stage(c.actors);
          }),
        wait: (c) => this.timeline.wait(c.ms),
        worldPatch: (c) => this.patchWorld(c.operations),
        setVariable: (c) => changeStoryVariable(this.state.story, c),
        move: (c) => this.fieldDirector.move(c),
        approach: (c) => this.fieldDirector.approach(c),
        face: (c) => this.fieldDirector.face(c),
        escort: (c) => this.fieldDirector.escort(c),
        emote: (c) => this.fieldDirector.emote(c),
        hide: (c) => this.fieldDirector.hide(c),
        cameraTo: (c) => this.fieldDirector.cameraTo(c),
        cameraFollow: (c) => this.fieldDirector.cameraFollow(c),
        flag: (c) => {
          this.state.flags[c.key] = c.value;
          this.ui?.updateSide();
        },
        heal: () => {
          this.state.party.forEach((m) => healMonster(m, db));
          this.ui?.updateSide();
        },
        grant: (c) =>
          grantReward(
            this.state,
            {
              id: "legacy." + c.flag,
              flags: { [c.flag]: true },
              items: { [c.item]: c.amount },
            },
            { items: this.itemDefinitions },
          ),
        reward: (c) =>
          grantReward(this.state, c, { items: this.itemDefinitions }),
        completeEvent: (c) => completeEvent(this.state, c.id),
        captureMonster: (c) => {
          if (
            [...this.state.party, ...this.state.box].some(
              (m) => m.uid === c.monster.uid,
            )
          )
            return;
          const mon = structuredClone(c.monster);
          (this.state.party.length < 6
            ? this.state.party
            : this.state.box
          ).push(mon);
          this.seen(mon.species, true);
        },
        lossPenalty: () => {
          this.state.money = Math.max(
            0,
            this.state.money -
              Math.max(...this.state.party.map((m) => m.level)) * 8,
          );
        },
      },
      {
        resources: storyResources,
        testCondition: (c) =>
          matchesCondition(c, this.state, this.conditionQueries),
        choose: async (c) => {
          const value = await this.ui.choose(
            c.name,
            c.prompt,
            c.options.map(({ id, label }) => ({ id, label })),
            c.cancel,
          );
          if (!c.options.some((o) => o.id === value))
            throw new Error("Invalid story choice result");
          if (c.variable)
            changeStoryVariable(this.state.story, { name: c.variable, value });
          return value;
        },
        validateCommand: (c) => {
          validateFieldCommand(c, db.maps);
          if (c.type === "if")
            validateCondition(
              c.condition,
              new Set(this.story.events.map((e) => e.id)),
              "story.if",
              this.conditionQueries,
            );
          if (c.type === "setVariable") validateVariableCommand(c);
          if (c.type === "choice" && c.variable)
            validateVariableCommand({ name: c.variable, value: "" });
          if (c.type === "worldPatch")
            this.worldState.validateOperations(c.operations);
          if (c.type === "presentation")
            this.sceneDirector?.validate(c.id, c.payload || {}) ||
              (() => {
                throw new Error("Scene presentation unavailable");
              })();
          if (
            c.type === "battle" &&
            !(c.trainerId
              ? this.trainerDefinitions[c.trainerId]
              : db.species[c.species] &&
                Number.isInteger(c.level) &&
                c.level >= 1 &&
                c.level <= 100)
          )
            throw new Error("Invalid battle content reference");
          if (c.type === "reward") validateReward(c, this.itemDefinitions);
          if (c.type === "grant")
            validateReward(
              {
                id: "legacy." + c.flag,
                flags: { [c.flag]: true },
                items: { [c.item]: c.amount },
              },
              this.itemDefinitions,
            );
          if (
            c.type === "completeEvent" &&
            !this.story.events.some((e) => e.id === c.id)
          )
            throw new Error(`Unknown event ${c.id}`);
          if (
            c.type === "captureMonster" &&
            (!db.species[c.monster?.species] || !c.monster.uid)
          )
            throw new Error("Invalid captured monster");
        },
      },
    );
    this.bindField();
  }
  attachUI(ui) {
    this.ui = ui;
    ui.updateSide();
    this.onSave(this.lastSave, true);
    if (this.saveWarning) ui.toast(this.saveWarning);
  }
  get world() {
    return this.field.world;
  }
  get battle() {
    return this.combat.battle;
  }
  get busy() {
    return (
      this.storyBusy ||
      this.combat.busy ||
      this.field.busy ||
      this.travelDirector.busy ||
      this.growthDirector.busy ||
      this.growthBusy ||
      !!this.sceneDirector?.busy
    );
  }
  newState() {
    return {
      position: { ...PACK.start },
      party: [],
      box: [],
      bag: Object.fromEntries(
        Object.keys(this.itemDefinitions).map((id) => [id, 0]),
      ),
      story: emptyStoryProgress(),
      worldState: emptyWorldState(),
      flags: {},
      money: 3000,
      seen: [],
      caught: [],
      playSeconds: 0,
      friendshipSteps: 0,
      movement: { mode: "walk", visited: [PACK.start.map] },
      growth: { hatchTick: 0 },
      daycare: { slots: [], egg: null, steps: 0 },
      tradePartner: [],
      randomSeed: Date.now() >>> 0,
    };
  }
  restoreForm(uid) {
    const mon = this.state.party.find((m) => m.uid === uid);
    if (!mon) throw new Error("Unknown creature");
    const changed = this.forms.restore(mon);
    if (changed) {
      this.plugins?.events.emit("core:creature-form-changed", {
        uid,
        formId: null,
      });
      this.ui?.updateSide();
      this.save();
    }
    return { ok: changed };
  }
  changeForm(uid, id) {
    const mon = this.state.party.find((m) => m.uid === uid);
    if (
      !mon ||
      this.forms.registry.get(id).scope !== "world" ||
      !this.forms.activate(mon, id)
    )
      throw new Error("现在无法改变形态。");
    this.plugins?.events.emit("core:creature-form-changed", {
      uid,
      formId: id,
    });
    this.ui?.updateSide();
    this.save();
    return { ok: true };
  }
  bindField() {
    this.state.forms ??= {};
    this.forms = new CreatureForms({
      registry: new CreatureFormRegistry(
        this.catalog.forms,
        this.db,
        this.catalog.abilities,
        this.catalog.heldItems,
      ),
      records: this.state.forms,
      creatures: () => [
        ...this.state.party,
        ...this.state.box,
        ...this.state.daycare.slots.map((s) => s.mon),
        ...(this.state.daycare.egg ? [this.state.daycare.egg] : []),
      ],
    });
    this.field?.dispose();
    this.rng = new Random(this.state.randomSeed);
    this.state.worldState ||= emptyWorldState();
    this.worldState = new WorldStateService({
      db: this.db,
      state: this.state.worldState,
      objects: (map) => this.baseWorldObjects(map),
    });
    this.lastEncounterSteps = -5;
    this.state.growth ||= { hatchTick: 0 };
    this.state.tradePartner ||= [];
    this.state.daycare ||= { slots: [], egg: null, steps: 0 };
    this.growth = new GrowthSession({
      state: this.state,
      db: this.db,
      rng: this.rng,
      abilities: this.catalog.abilities,
      heldItems: this.catalog.heldItems,
      hooks: this.ruleHooks,
      conditions: extensionGrowthConditions(
        this.catalog.growthConditions,
        (fn, ...args) => this.plugins.runtime.evaluate(fn, ...args),
      ),
      hour: () => new Date().getHours(),
    });
    this.friendship = this.growth.friendship;
    this.evolutions = this.growth.evolutions;
    this.growthDirector = new GrowthDirector({
      timeline: this.timeline,
      reducedMotion: this.reducedMotion,
    });
    this.growthBusy = false;
    this.state.movement ||= {
      mode: "walk",
      visited: [this.state.position.map],
    };
    this.movement = new MovementService({
      registry: new MovementRegistry(this.catalog.movement),
      state: this.state.movement,
      context: () => ({ capabilities: this.fieldCapabilities() }),
      onChange: () => this.ui?.updateSide(),
    });
    this.travel = new TravelService({
      maps: this.worldState.maps,
      destinations: this.catalog.destinations,
      position: this.state.position,
      context: () => ({
        capabilities: this.fieldCapabilities(),
        visited: this.state.movement.visited,
      }),
      objects: (map) =>
        this.field.npcs
          .objects(map)
          .map((n) => ({ ...n, reserved: this.field.npcs.reserved(n) })),
    });
    this.travelDirector = new TravelDirector({
      timeline: this.timeline,
      transitions: this.transitions,
      reducedMotion: this.reducedMotion,
    });
    this.field = new FieldSession({
      maps: this.worldState.maps,
      position: this.state.position,
      motion: this.motion,
      transitions: this.transitions,
      movement: this.movement,
      npcBehaviors: new NPCBehaviorRegistry(this.catalog.npcBehaviors),
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
    this.visitMap();
    this.plugins?.rebind();
    this.onMap(this.world.map.title, this.state.position.map);
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
  enter(position) {
    this.world.enter(position.map, position.x, position.y, position.dir);
    this.motion.snap(this.state.position);
  }
  save(show = false) {
    this.forms?.reconcile();
    if (this.saveProtected) {
      if (show) this.ui?.toast(this.saveWarning);
      return;
    }
    if (
      this.battle ||
      this.busy ||
      this.ui?.dialog ||
      this.ui?.modalType === "starter" ||
      this.storyBusy
    ) {
      if (show) this.ui.toast("请在移动、对话或战斗结束后保存。");
      return;
    }
    try {
      this.state.randomSeed = this.rng.seed;
      if (this.plugins)
        this.state.contentDependencies = this.plugins.catalog.dependencies(
          this.state,
        );
      this.lastSave = this.saveStore.save(this.state);
      this.onSave(this.lastSave);
      if (show) this.ui.toast("进度已保存在当前浏览器。");
    } catch (error) {
      if (error.code === "save_conflict") {
        this.saveProtected = true;
        this.saveWarning =
          "另一个游戏页面已保存进度。本页暂停覆盖存档；可导出本页进度，或明确读取另一页的存档。";
        this.saveConflict = true;
        this.ui?.toast(this.saveWarning);
        this.ui?.updateSide();
      } else if (show) this.ui.toast("浏览器无法保存，请从存档菜单导出进度。");
    }
  }
  async runStory(commands) {
    if (this.storyBusy) return;
    this.storyBusy = true;
    this.clearInput();
    let failed = true;
    try {
      this.commands.validate(commands);
      this.fieldDirector.begin();
      await this.commands.run(commands);
      failed = false;
    } finally {
      try {
        if (this.fieldDirector.active) await this.fieldDirector.end({ failed });
      } finally {
        this.storyBusy = false;
        this.clearInput();
        this.ui?.updateSide();
        if (this.battle) this.ui?.drawBattleHUD();
        if (!failed) this.save();
      }
    }
  }
  playStory(commands) {
    return this.runStory(commands).catch((error) => {
      this.ui?.toast("剧情未能继续，请读取最近的存档。");
      console.error(error);
    });
  }
  move(dir, { running = false } = {}) {
    if (this.battle || this.storyBusy || this.ui?.blocked || this.busy)
      return false;
    return this.field.move(dir, {
      running: running && !this.world.map.indoor,
    });
  }
  visitMap() {
    const id = this.state.position.map;
    if (
      this.catalog.destinations[id] &&
      !this.state.movement.visited.includes(id)
    )
      this.state.movement.visited.push(id);
  }
  fieldCapabilities() {
    const flags = this.state.flags,
      knows = (id) =>
        this.state.party.some(
          (m) => !m.egg && m.moves.some((v) => v.id === id),
        );
    return {
      run: true,
      bike: !!flags.bike || !!flags.fieldTraining,
      surf: !!flags.fieldTraining || (!!flags.badgeBalance && knows("surf")),
      fly: !!flags.fieldTraining || (!!flags.badgeFeather && knows("fly")),
    };
  }
  claimFieldEquipment() {
    if (
      !this.canManageParty() ||
      !this.state.flags.pokedex ||
      this.state.flags.fieldTraining
    )
      return false;
    this.state.flags.fieldTraining = true;
    return true;
  }
  movementOptions() {
    return Object.keys(this.catalog.movement)
      .filter((id) => !["run", "surf"].includes(id))
      .map((id) => ({
        id,
        name: this.catalog.movement[id].name,
        allowed:
          this.movement.available(id, this.world.map) &&
          !isWater(
            this.world.cell(this.state.position.x, this.state.position.y)
              ?.behavior,
          ),
      }));
  }
  setMovementMode(mode) {
    if (
      !this.canManageParty() ||
      !Object.hasOwn(this.catalog.movement, mode) ||
      ["run", "surf"].includes(mode)
    )
      return { ok: false, reason: "现在不能更换移动方式。" };
    if (
      isWater(
        this.world.cell(this.state.position.x, this.state.position.y)?.behavior,
      )
    )
      return { ok: false, reason: "请先上岸。" };
    const result = this.movement.set(mode, this.world.map);
    if (!result.ok) result.reason = "这里不能使用这辆自行车。";
    return result;
  }
  async boardSurf() {
    if (!this.canManageParty() || !this.fieldCapabilities().surf)
      return { ok: false, reason: "还不能使用冲浪。" };
    const dir = this.state.position.dir,
      [dx, dy] = DIRECTIONS[dir];
    if (
      !isWater(
        this.world.cell(this.state.position.x + dx, this.state.position.y + dy)
          ?.behavior,
      )
    )
      return { ok: false, reason: "请面向岸边的水面。" };
    // Use an explicit mode plan. Persistent mode changes only when the boarding step finishes.
    this.clearInput();
    if (!this.field.move(dir, { mode: "surf" }))
      return { ok: false, reason: "水面被挡住了。" };
    await this.waitForMovement();
    return { ok: true };
  }
  async flyTo(id) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    const result = this.travel.prepare(id);
    if (!result.ok) return result;
    this.clearInput();
    try {
      const completed = await this.travelDirector.fly(() => {
        const changed = this.travel.commit(result.plan);
        if (!changed.ok) throw new Error(changed.reason);
        this.movement.set("walk", this.world.map);
        this.enter(changed.position);
      });
      return { ok: completed };
    } catch (error) {
      return { ok: false, reason: error.message };
    } finally {
      this.clearInput();
      this.ui?.updateSide();
      this.save();
    }
  }
  async waitForMovement() {
    // Automation returns at a story/UI boundary rather than waiting for player input.
    while (
      this.field.busy &&
      !this.storyBusy &&
      !this.battle &&
      !this.ui?.blocked
    )
      await this.timeline.wait(16);
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
      const [dx, dy] = DIRECTIONS[this.state.position.dir];
      const cell = this.world.cell(
        this.state.position.x + dx,
        this.state.position.y + dy,
      );
      if (isWater(cell?.behavior) && this.state.movement.mode !== "surf")
        this.ui.showSurf();
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
  advanceTravelClocks() {
    this.growth.advance();
    this.plugins?.runtime?.advance("step");
    this.plugins?.events.emit("core:field-step", {
      position: { ...this.state.position },
    });
  }
  step(cell) {
    if (this.storyBusy) return;
    const s = this.state;
    const scene = this.story.resolve("step", s, {
      map: s.position.map,
      position: { ...s.position },
      cell,
    });
    if (scene.length) {
      void this.playStory(scene);
      return;
    }
    const watching = findWatchingTrainer({
      maps: this.world.maps,
      position: s.position,
      objects: (map) => this.field.npcs.objects(map),
      eligible: (o) =>
        !s.story.rewards.includes(`trainer.${o.trainerId}.prize`) &&
        s.party.filter((m) => m.hp > 0 && !m.egg).length >=
          (this.trainerDefinitions[o.trainerId]?.format === "doubles" ? 2 : 1),
    });
    if (watching) {
      void this.playStory(this.trainerScene(watching, true));
      return;
    }
    const water =
      this.state.movement.mode === "surf" && isWater(cell?.behavior);
    const area = water ? "water" : "land";
    const registered = this.encounterTables.select(s.position.map, area, s);
    const entries =
      registered?.entries ||
      (water ? this.world.map.waterEncounters : this.world.map.encounters);
    if (
      s.party.some((m) => !m.egg) &&
      s.flags.rescued &&
      (water || isGrass(cell?.behavior)) &&
      entries &&
      this.world.steps - this.lastEncounterSteps > 3 &&
      !this.ui.dialog
    ) {
      const monster = this.encounterService().attempt({
        party: s.party,
        entries,
        rate:
          registered?.rate ??
          (water
            ? this.world.map.waterEncounterRate
            : this.world.map.encounterRate),
        area: water ? "water" : "land",
        mode: this.state.movement.mode,
      });
      if (monster) {
        this.lastEncounterSteps = this.world.steps;
        void this.startBattle(monster);
      }
    }

    if (this.world.steps % 20 === 0) this.save();
  }
  trainerScene(object, approach = false) {
    return [
      ...(approach
        ? [
            { type: "emote", actor: object.id, kind: "exclamation", ms: 450 },
            { type: "approach", actor: object.id },
          ]
        : []),
      {
        type: "dialog",
        name: object.name || this.trainerDefinitions[object.trainerId].name,
        lines: [object.text || "让我们来一场宝可梦对战吧！"],
      },
      { type: "battle", trainerId: object.trainerId },
    ];
  }
  async startTrainerBattle(id) {
    const trainer = this.trainerDefinitions[id];
    if (!trainer) throw new Error("Unknown trainer encounter");
    const encounter = createTrainerEncounter(trainer, {
      party: this.state.party,
      bag: this.state.bag,
      db: this.db,
      rng: this.rng,
      strategies: this.battleStrategies,
    });
    return this.startBattle(encounter.enemyParty, {
      ...encounter,
      trainerId: id,
    });
  }
  async startBattle(enemy, options = {}) {
    if (!this.state.party.some((m) => !m.egg)) return false;
    if (this.combat.battle || this.combat.busy || this.transitions.busy)
      return false;
    if (!this.state.party.some((m) => m.hp > 0 && !m.egg))
      this.state.party.forEach((m) => healMonster(m, this.db));
    const enemies = Array.isArray(enemy) ? enemy : [enemy];
    const opponents = options.topology
      ? options.topology.sides.flatMap((side) =>
          side.controllers
            .filter((c) => c.kind === "ai")
            .flatMap((c) => c.party),
        )
      : enemies;
    for (const mon of opponents) this.seen(mon.species);
    this.clearInput();
    this.ui.closeModal();
    return this.combat.start({
      party: this.state.party,
      enemyParty: enemies,
      db: this.db,
      rng: this.rng,
      bag: this.state.bag,
      items: this.items,
      effects: this.moveEffects,
      states: this.catalog.battleStates,
      formDefinitions: this.catalog.forms,
      formRecords: Object.fromEntries(
        [...this.state.party, ...enemies]
          .filter((m) => this.state.forms[m.uid])
          .map((m) => [m.uid, this.state.forms[m.uid]]),
      ),
      environment: {
        terrain: this.world.map.indoor
          ? "indoor"
          : isWater(
                this.world.cell(this.state.position.x, this.state.position.y)
                  ?.behavior,
              )
            ? "water"
            : this.world.map.presentation?.terrain || "grass",
      },
      presentation: options.trainer
        ? {
            trainers: [
              { actor: "BrendanNormal", back: true },
              {
                actor:
                  this.trainerDefinitions[options.trainerId]?.actor ||
                  (options.script === "rival" ? "MayNormal" : "Youngster"),
              },
            ],
          }
        : {},
      traits: {
        abilities: this.catalog.abilities,
        heldItems: this.catalog.heldItems,
        hooks: [...GEN3_GLOBAL_HOOKS, ...this.ruleHooks],
      },
      ...options,
    });
  }
  async playPresentation(id, payload = {}) {
    if (this.busy || this.battle || this.ui?.dialog)
      throw new Error("请先结束当前行动。");
    if (!this.sceneDirector) throw new Error("Scene presentation unavailable");
    this.clearInput();
    try {
      return await this.sceneDirector.play(id, payload);
    } finally {
      this.clearInput();
    }
  }
  async turn(action) {
    if (this.busy || !this.battle) return false;
    this.clearInput();
    this.ui.closeModal();
    const battle = this.battle,
      round = battle.turn;
    const result = await this.combat.act(action);
    if (result && battle.turn !== round) {
      this.plugins?.runtime?.advance("round");
      this.plugins?.events.emit("core:battle-round", { round: battle.turn });
    }
    if (result)
      for (const event of battle.events)
        this.plugins?.events.emit("core:battle-event", event);
    return result;
  }
  encounterService() {
    return new EncounterService({
      db: this.db,
      rng: this.rng,
      abilities: this.catalog.abilities,
      heldItems: this.catalog.heldItems,
      hooks: this.ruleHooks,
    });
  }
  resultPlan(b) {
    const drops = [];
    let committed = false;
    let commands = this.story.resolve("battleResult", this.state, {
      battle: b,
      db: this.db,
    });
    if (!commands.length && b.result === "win" && b.trainerId) {
      const trainer = this.trainerDefinitions[b.trainerId];
      const amount = trainer.prize * (b.prizeMultiplier || 1);
      commands = [
        { type: "reward", id: `trainer.${b.trainerId}.prize`, money: amount },
        {
          type: "dialog",
          name: trainer.name,
          lines: [
            this.state.story.rewards.includes(`trainer.${b.trainerId}.prize`)
              ? "这次挑战已经完成。"
              : `全队获胜！获得了 ¥${amount}。`,
          ],
        },
      ];
    }
    return {
      commit: () => {
        if (committed) return;
        if (b.result !== "loss")
          this.encounterService().afterBattle(
            this.state.party,
            (text, kind, data) =>
              drops.push({
                type: "dialog",
                name: "伙伴",
                lines: [
                  `${this.db.species[this.state.party.find((m) => m.uid === data.uid).species].name} 捡到了 ${ITEMS[data.itemId]?.name || data.itemId}！`,
                ],
              }),
          );
        committed = true;
      },
      after: () => {
        // Combat completes at the first dialogue/input boundary. Story continues independently.
        void this.runStory([...drops, ...commands])
          .then(() => {
            this.ui.checkGrowth();
            this.ui.updateSide();
            this.save();
          })
          .catch((error) => {
            this.ui.toast("剧情未能继续，请读取最近的存档。");
            console.error(error);
          });
      },
    };
  }
  seen(id, caught = false) {
    if (!this.state.seen.includes(id)) this.state.seen.push(id);
    if (caught && !this.state.caught.includes(id)) this.state.caught.push(id);
  }
  chooseStarter(id) {
    if (
      this.battle ||
      this.busy ||
      this.state.flags.starter ||
      !PACK.starters.includes(id)
    )
      return false;
    this.state.flags.starter = id;
    this.state.party = [createMonster(id, 5, this.db, this.rng)];
    this.seen(id, true);
    return this.startBattle(createMonster("zigzagoon", 2, this.db, this.rng), {
      script: "rescue",
    });
  }
  canManageParty() {
    return !this.battle && !this.busy && !this.storyBusy;
  }
  setLead(index) {
    return this.canManageParty() && setLead(this.state, index);
  }
  usePotion(index) {
    return this.useItem("potion", index).ok;
  }
  itemPlan(id, index, inBattle = !!this.battle) {
    return this.items.prepare({
      id,
      bag: inBattle ? this.battle.bag : this.state.bag,
      party: inBattle ? this.battle.party : this.state.party,
      index,
      context: inBattle ? "battle" : "field",
      enemy: this.battle?.enemy,
      canCapture: this.battle
        ? this.battle.rules.canCapture(this.battle)
        : false,
    });
  }
  useItem(id, index) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    return this.items.use({
      id,
      bag: this.state.bag,
      party: this.state.party,
      index,
      context: "field",
    });
  }
  equipItem(uid, itemId) {
    if (!this.canManageParty())
      return { ok: false, reason: "请先结束当前行动。" };
    return this.equipment.equip(this.state, uid, itemId);
  }
  canBuyItem(id) {
    const item = this.itemDefinitions[id];
    return (
      !!item &&
      this.state.money >= item.price &&
      matchesCondition(item.purchaseRequires, this.state, this.conditionQueries)
    );
  }
  learnMove(mon, index) {
    return (
      this.canManageParty() &&
      this.state.party.includes(mon) &&
      learnPendingMove(mon, index, this.db, {
        companions: [...this.state.party, ...this.state.box],
      })
    );
  }
  evolutionPlan(mon, options = {}) {
    if (
      (!options.trigger || options.trigger === "level") &&
      mon.pendingEvolution !== mon.level
    )
      return null;
    return this.growth.evolutionPlan(mon, options);
  }
  evolve(mon, options = {}) {
    if (!this.canManageParty() || !this.state.party.includes(mon)) return false;
    const plan = options.plan || this.evolutionPlan(mon);
    if (!plan || plan.uid !== mon.uid) return false;
    const result = this.evolutions.commit(plan, options);
    if (result.ok) {
      delete mon.pendingEvolution;
      if (!result.cancelled) {
        this.seen(mon.species, true);
        if (result.extraUid)
          this.seen(
            this.state.party.find((m) => m.uid === result.extraUid).species,
            true,
          );
      }
    }
    return result.ok;
  }
  canUseDaycare() {
    return (
      this.canManageParty() &&
      this.state.flags.pokedex &&
      this.state.position.map === "LittlerootTown_ProfessorBirchsLab"
    );
  }
  daycareView() {
    const nursery = this.growth.daycare;
    const slots = this.state.daycare.slots.map((s) => ({
      uid: s.mon.uid,
      name: this.db.species[s.mon.species].name,
      species: s.mon.species,
      ...nursery.preview(s),
    }));
    const pair = this.state.daycare.slots.map((s) => s.mon);
    return {
      slots,
      egg: !!this.state.daycare.egg,
      compatibility:
        pair.length === 2 ? nursery.breeding.compatibility(...pair) : 0,
    };
  }
  depositDaycare(uid) {
    return this.canUseDaycare()
      ? this.growth.daycare.deposit(this.state.party, uid)
      : { ok: false };
  }
  withdrawDaycare(uid) {
    return this.canUseDaycare()
      ? this.growth.daycare.withdraw(this.state.party, uid, this.state)
      : { ok: false };
  }
  async collectEgg() {
    if (
      !this.canUseDaycare() ||
      !this.state.daycare.egg ||
      this.state.party.length >= 6
    )
      return { ok: false, reason: "请先在队伍里留一个空位。" };
    this.clearInput();
    try {
      return await this.growthDirector.play({
        kind: "receive",
        from: "egg",
        to: "egg",
        commit: () => this.growth.daycare.collect(this.state.party),
      });
    } finally {
      this.clearInput();
      this.ui?.updateSide();
      this.save();
    }
  }
  async hatchReady() {
    const mon = this.growth.readyEgg();
    if (!mon || this.busy || this.battle || this.ui?.blocked) return false;
    this.growthBusy = true;
    this.clearInput();
    try {
      await this.growthDirector.play({
        kind: "hatch",
        from: "egg",
        to: mon.species,
        commit: () => this.growth.hatching.hatch(mon),
      });
      this.seen(mon.species, true);
      this.ui?.updateSide();
      await this.ui.say("宝可梦的蛋", [
        `蛋里孵出了 ${this.db.species[mon.species].name}！`,
      ]);
      return true;
    } catch (error) {
      this.ui?.toast("孵化未能完成，请重试。");
      console.error(error);
      return false;
    } finally {
      this.growthBusy = false;
      this.clearInput();
      this.save();
    }
  }
  async animateEvolution(mon, plan) {
    if (
      !this.canManageParty() ||
      !this.state.party.includes(mon) ||
      plan?.uid !== mon.uid
    )
      return { ok: false };
    this.clearInput();
    try {
      const result = await this.growthDirector.play({
        kind: "evolution",
        from: mon.species,
        to: plan.to,
        commit: () => this.evolutions.commit(plan),
      });
      if (result.ok) {
        delete mon.pendingEvolution;
        this.seen(mon.species, true);
        if (result.extraUid)
          this.seen(
            this.state.party.find((m) => m.uid === result.extraUid).species,
            true,
          );
      }
      return result;
    } catch (error) {
      return { ok: false, reason: error.message };
    } finally {
      this.clearInput();
      this.ui?.updateSide();
      this.save();
    }
  }
  prepareTradePartner() {
    if (!this.canUseDaycare() || this.state.tradePartner.length) return false;
    for (const [species, level, heldItem] of [
      ["kadabra", 16, null],
      ["clamperl", 20, "deep_sea_tooth"],
      ["eevee", 10, null],
    ]) {
      const mon = createMonster(species, level, this.db, this.rng, {
        originalTrainer: "researcher",
      });
      mon.heldItem = heldItem;
      this.state.tradePartner.push(mon);
    }
    return true;
  }
  async performTrade(uid, partnerUid) {
    if (!this.canUseDaycare()) return { ok: false };
    const given = this.state.party.find((m) => m.uid === uid),
      received = this.state.tradePartner.find((m) => m.uid === partnerUid);
    if (!given || !received) return { ok: false };
    const checkpoint = new StateCheckpoint(this.state, this.rng);
    this.growthBusy = true;
    this.clearInput();
    try {
      const result = await this.growthDirector.play({
        kind: "trade",
        from: given.egg ? "egg" : given.species,
        to: received.egg ? "egg" : received.species,
        commit: () =>
          this.trading.exchange({
            partyA: this.state.party,
            partyB: this.state.tradePartner,
            uidA: uid,
            uidB: partnerUid,
            trainerA: "player",
            trainerB: "researcher",
          }),
      });
      for (const [mon, party] of [
        [received, this.state.party],
        [given, this.state.tradePartner],
      ]) {
        const plan = this.evolutions.prepare(mon, {
          trigger: "trade",
          party,
          bag: {},
        });
        if (plan)
          await this.growthDirector.play({
            kind: "evolution",
            from: mon.species,
            to: plan.to,
            commit: () => this.evolutions.commit(plan),
          });
      }
      while (given.pendingMoves?.length) learnPendingMove(given, 0, this.db);
      if (!received.egg) this.seen(received.species, true);
      return result;
    } catch (error) {
      checkpoint.restore();
      return { ok: false, reason: error.message };
    } finally {
      this.growthBusy = false;
      this.clearInput();
      this.ui?.updateSide();
      this.save();
    }
  }
  buyItem(id) {
    const item = this.itemDefinitions[id];
    if (!this.canManageParty() || !this.canBuyItem(id)) return false;
    this.state.money -= item.price;
    this.state.bag[id] = (this.state.bag[id] || 0) + 1;
    return true;
  }
  withdrawBox(index) {
    return (
      this.canManageParty() && this.partyStorage.withdraw(this.state, index)
    );
  }
  exchangeBox(boxIndex, partyIndex) {
    return (
      this.canManageParty() &&
      this.partyStorage.exchange(this.state, boxIndex, partyIndex)
    );
  }
  depositBox(index) {
    return (
      this.canManageParty() && this.partyStorage.deposit(this.state, index)
    );
  }
  loadDocument(d) {
    const missing = (d?.state?.contentDependencies || []).filter(
      (id) => !this.plugins?.manifests.has(id),
    );
    if (missing.length) throw new Error("存档需要插件：" + missing.join("、"));
    const compatible = this.saveStore.decode(d);
    if (!this.canManageParty() || (d.pack && d.pack !== PACK.id) || !compatible)
      throw new Error("Invalid save");
    this.saveStore.acceptCurrent();
    this.saveProtected = false;
    this.saveWarning = null;
    this.saveConflict = false;
    this.state = compatible.state;
    this.bindField();
  }
  exportDocument() {
    if (this.saveProtected && !this.saveConflict) {
      const raw = this.saveStore.raw();
      if (raw) {
        try {
          return JSON.parse(raw);
        } catch {
          return { recoveryRaw: raw };
        }
      }
    }
    const state = structuredClone(this.state);
    state.randomSeed = this.rng.seed;
    if (this.plugins)
      state.contentDependencies = this.plugins.catalog.dependencies(state);
    return { version: PACK.version, pack: PACK.id, savedAt: Date.now(), state };
  }
  reset() {
    if (!this.canManageParty()) return false;
    this.saveStore.acceptCurrent();
    this.saveProtected = false;
    this.saveWarning = null;
    this.saveConflict = false;
    this.state = this.newState();
    this.bindField();
    return true;
  }
  tick(now, visibleMaps) {
    this.field.tick(now);
    if (
      this.ui &&
      !this.ui.blocked &&
      !this.busy &&
      !this.battle &&
      this.growth.readyEgg()
    )
      void this.hatchReady();
    else if (
      this.ui &&
      !this.ui.blocked &&
      !this.busy &&
      !this.battle &&
      this.state.party.some(
        (m) =>
          !m.egg && (m.pendingMoves?.length || m.pendingEvolution === m.level),
      )
    )
      this.ui.checkGrowth();
    this.field.npcs.tick(now, this.state.position, {
      paused: !!(
        this.battle ||
        this.storyBusy ||
        this.ui.blocked ||
        this.combat.busy ||
        this.transitions.busy ||
        this.travelDirector.busy ||
        this.growthDirector.busy ||
        this.growthBusy ||
        !!this.sceneDirector?.busy
      ),
      maps: visibleMaps,
      playerFrom: this.motion.moving(now) ? this.motion.sourcePosition : null,
    });
  }
  inspect() {
    const p = this.state.position;
    return {
      location: this.world.map.title,
      movement: {
        mode: this.state.movement.mode,
        capabilities: this.fieldCapabilities(),
      },
      position: { ...p },
      mode: this.transitions.busy
        ? "transition"
        : this.battle
          ? "battle"
          : this.ui.dialog
            ? "dialogue"
            : this.storyBusy
              ? "cutscene"
              : this.ui.modalType || "exploration",
      quest: questFor(this.state),
      flags: { ...this.state.flags },
      dialogue: this.ui.dialog
        ? {
            name: this.ui.dialog.name,
            text: this.ui.dialog.lines[this.ui.dialog.index],
          }
        : null,
      nearby: this.field.npcs
        .objects(p.map)
        .filter((o) => Math.abs(o.x - p.x) <= 8 && Math.abs(o.y - p.y) <= 7)
        .map((o) => ({ name: o.name, kind: o.kind, x: o.x, y: o.y })),
      tiles: Array.from({ length: 11 }, (_, row) =>
        Array.from({ length: 15 }, (_, col) => {
          const x = p.x + col - 7,
            y = p.y + row - 5,
            c = this.world.cell(x, y);
          return c
            ? {
                x,
                y,
                collision: c.collision,
                behavior: c.behavior,
                warp: this.world.map.warps.some((w) => w.x === x && w.y === y),
              }
            : null;
        }),
      ),
      party: this.state.party.map((m) => ({
        name: this.db.species[m.species].name,
        species: m.species,
        level: m.level,
        hp: m.hp,
        maxHP: m.stats.hp,
        moves: m.moves.map((s) => ({
          id: s.id,
          name: this.db.moves[s.id].name,
          pp: s.pp,
        })),
      })),
      bag: { ...this.state.bag },
      battle: this.battle
        ? {
            busy: this.busy,
            trainer: this.battle.trainer,
            decision: this.battle.decisionView().decision,
            combatants: this.battle.snapshot().combatants,
            winner: this.battle.winner,
            enemy: this.battle.enemy
              ? {
                  name: this.db.species[this.battle.enemy.species].name,
                  hp: this.battle.enemy.hp,
                  maxHP: this.battle.enemy.stats.hp,
                }
              : null,
            active: this.battle.active,
            enemyTeam: {
              remaining: this.battle.enemyParty.filter((m) => m.hp > 0).length,
              total: this.battle.enemyParty.length,
            },
          }
        : null,
    };
  }
}
