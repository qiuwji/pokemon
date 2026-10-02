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
import { EvolutionService } from "../../engine/growth/evolution.js";
import { FriendshipService } from "../../engine/growth/friendship.js";
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
    transitions,
    timeline,
    camera = new CameraRig(timeline),
    reducedMotion = () => false,
    onMap = () => {},
    onSave = () => {},
    clearInput = () => {},
  }) {
    Object.assign(this, {
      db,
      motion,
      director,
      transitions,
      timeline,
      camera,
      reducedMotion,
      onMap,
      onSave,
      clearInput,
    });
    this.items = createItemService(ITEMS);
    this.equipment = new EquipmentService(GEN3_HELD_ITEMS);
    this.evolutions = new EvolutionService({
      db,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
    });
    this.friendship = new FriendshipService({
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
    });
    this.moveEffects = new MoveEffectRegistry();
    this.moveEffects.validateMoves(db.moves);
    for (const item of Object.values(ITEMS))
      validateCondition(item.purchaseRequires);
    this.saveStore = new SaveStore(
      storage,
      PACK.id,
      (s) => validateSave(s, db),
      PACK.version,
    );
    const loaded = this.saveStore.load();
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
        dialog: (c) => this.ui.say(c.name, c.lines),
        starter: () => this.ui.starterPicker(),
        shop: () => this.ui.showShop(),
        battle: (c) => {
          if (c.trainerId) {
            const trainer = TRAINERS[c.trainerId];
            const encounter = createTrainerEncounter(trainer, {
              party: this.state.party,
              bag: this.state.bag,
              db,
              rng: this.rng,
            });
            return this.startBattle(encounter.enemyParty, encounter);
          }
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
            { items: ITEMS },
          ),
        reward: (c) => grantReward(this.state, c, { items: ITEMS }),
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
        validateCommand: (c) => {
          validateFieldCommand(c, db.maps);
          if (
            c.type === "battle" &&
            !(c.trainerId
              ? TRAINERS[c.trainerId]
              : db.species[c.species] &&
                Number.isInteger(c.level) &&
                c.level >= 1 &&
                c.level <= 100)
          )
            throw new Error("Invalid battle content reference");
          if (c.type === "reward") validateReward(c, ITEMS);
          if (c.type === "grant")
            validateReward(
              {
                id: "legacy." + c.flag,
                flags: { [c.flag]: true },
                items: { [c.item]: c.amount },
              },
              ITEMS,
            );
          if (
            c.type === "completeEvent" &&
            !EMERALD_STORY.events.some((e) => e.id === c.id)
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
      this.travelDirector.busy
    );
  }
  newState() {
    return {
      position: { ...PACK.start },
      party: [],
      box: [],
      bag: Object.fromEntries(Object.keys(ITEMS).map((id) => [id, 0])),
      story: emptyStoryProgress(),
      flags: {},
      money: 3000,
      seen: [],
      caught: [],
      playSeconds: 0,
      friendshipSteps: 0,
      movement: { mode: "walk", visited: [PACK.start.map] },
      randomSeed: Date.now() >>> 0,
    };
  }
  bindField() {
    this.field?.dispose();
    this.rng = new Random(this.state.randomSeed);
    this.lastEncounterSteps = -5;
    this.state.movement ||= {
      mode: "walk",
      visited: [this.state.position.map],
    };
    this.movement = new MovementService({
      registry: new MovementRegistry(MOVEMENT_MODES),
      state: this.state.movement,
      context: () => ({ capabilities: this.fieldCapabilities() }),
      onChange: () => this.ui?.updateSide(),
    });
    this.travel = new TravelService({
      maps: this.db.maps,
      destinations: TRAVEL_DESTINATIONS,
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
      maps: this.db.maps,
      position: this.state.position,
      motion: this.motion,
      transitions: this.transitions,
      movement: this.movement,
      now: this.timeline.now,
      objects: (map) =>
        objectsFor(
          { ...this.state, position: { ...this.state.position, map } },
          this.db,
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
    this.onMap(this.world.map.title, this.state.position.map);
  }
  enter(position) {
    this.world.enter(position.map, position.x, position.y, position.dir);
    this.motion.snap(this.state.position);
  }
  save(show = false) {
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
      this.lastSave = this.saveStore.save(this.state);
      this.onSave(this.lastSave);
      if (show) this.ui.toast("进度已保存在当前浏览器。");
    } catch {
      if (show) this.ui.toast("浏览器无法保存，请从存档菜单导出进度。");
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
    if (TRAVEL_DESTINATIONS[id] && !this.state.movement.visited.includes(id))
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
    return ["walk", "mach-bike", "acro-bike"].map((id) => ({
      id,
      name: MOVEMENT_MODES[id].name,
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
      !["walk", "mach-bike", "acro-bike"].includes(mode)
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
    if (object.id)
      this.field.npcs.face(
        object.id,
        this.state.position.map,
        { up: "down", down: "up", left: "right", right: "left" }[
          this.state.position.dir
        ],
      );
    void this.playStory(interaction(this.state, object, this.world.map.title));
  }
  advanceTravelClocks() {
    this.state.friendshipSteps = ((this.state.friendshipSteps || 0) + 1) % 128;
    if (this.state.friendshipSteps === 0)
      for (const mon of this.state.party)
        if (!mon.egg && this.rng.int(2) === 0)
          this.friendship.change(mon, "walk", { party: this.state.party });
  }
  step(cell) {
    if (this.storyBusy) return;
    const s = this.state;
    const scene = EMERALD_STORY.resolve("step", s, {
      map: s.position.map,
      cell,
    });
    if (scene.length) {
      void this.playStory(scene);
      return;
    }
    const water =
      this.state.movement.mode === "surf" && isWater(cell?.behavior);
    const entries = water
      ? this.world.map.waterEncounters
      : this.world.map.encounters;
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
        rate: water
          ? this.world.map.waterEncounterRate
          : this.world.map.encounterRate,
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
  async startBattle(enemy, options = {}) {
    if (this.combat.battle || this.combat.busy || this.transitions.busy)
      return false;
    if (!this.state.party.some((m) => m.hp > 0))
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
      ...options,
    });
  }
  async turn(action) {
    if (this.busy || !this.battle) return false;
    this.clearInput();
    this.ui.closeModal();
    return this.combat.act(action);
  }
  encounterService() {
    return new EncounterService({
      db: this.db,
      rng: this.rng,
      abilities: GEN3_ABILITIES,
      heldItems: GEN3_HELD_ITEMS,
    });
  }
  resultPlan(b) {
    const drops = [];
    let committed = false;
    const commands = battleOutcome(this.state, b, this.db);
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
    const item = ITEMS[id];
    return (
      !!item &&
      this.state.money >= item.price &&
      matchesCondition(item.purchaseRequires, this.state)
    );
  }
  learnMove(mon, index) {
    return (
      this.canManageParty() &&
      this.state.party.includes(mon) &&
      learnPendingMove(mon, index, this.db)
    );
  }
  evolutionPlan(mon, options = {}) {
    return this.evolutions.prepare(mon, {
      party: this.state.party,
      bag: this.state.bag,
      ...options,
    });
  }
  evolve(mon, options = {}) {
    if (!this.canManageParty() || !this.state.party.includes(mon)) return false;
    const plan = options.plan || this.evolutionPlan(mon);
    if (!plan || plan.uid !== mon.uid) return false;
    const result = this.evolutions.commit(plan, options);
    if (result.ok && !result.cancelled) this.seen(mon.species, true);
    return result.ok;
  }
  buyItem(id) {
    const item = ITEMS[id];
    if (!this.canManageParty() || !this.canBuyItem(id)) return false;
    this.state.money -= item.price;
    this.state.bag[id] = (this.state.bag[id] || 0) + 1;
    return true;
  }
  withdrawBox(index) {
    if (
      !this.canManageParty() ||
      this.state.party.length >= 6 ||
      !this.state.box[index]
    )
      return false;
    this.state.party.push(this.state.box.splice(index, 1)[0]);
    return true;
  }
  exchangeBox(boxIndex, partyIndex) {
    if (
      !this.canManageParty() ||
      !this.state.box[boxIndex] ||
      !this.state.party[partyIndex]
    )
      return false;
    [this.state.box[boxIndex], this.state.party[partyIndex]] = [
      this.state.party[partyIndex],
      this.state.box[boxIndex],
    ];
    return true;
  }
  loadDocument(d) {
    const compatible = this.saveStore.decode(d);
    if (!this.canManageParty() || (d.pack && d.pack !== PACK.id) || !compatible)
      throw new Error("Invalid save");
    this.state = compatible.state;
    this.bindField();
  }
  exportDocument() {
    const state = structuredClone(this.state);
    state.randomSeed = this.rng.seed;
    return { version: PACK.version, pack: PACK.id, savedAt: Date.now(), state };
  }
  reset() {
    if (!this.canManageParty()) return false;
    this.state = this.newState();
    this.bindField();
    return true;
  }
  tick(now, visibleMaps) {
    this.field.tick(now);
    this.field.npcs.tick(now, this.state.position, {
      paused: !!(
        this.battle ||
        this.storyBusy ||
        this.ui.blocked ||
        this.combat.busy ||
        this.transitions.busy ||
        this.travelDirector.busy
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
