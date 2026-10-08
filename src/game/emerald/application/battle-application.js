import { battleTrainer, emeraldBattleOpening, emeraldDemonstrationPrelude, emeraldDefeatDialogue, emeraldBattleResultPrelude } from "../../../packs/emerald/battle-presentation.js";
import { openingBattleTransition } from "../../../packs/emerald/battle-transitions.js";
import { BATTLE_RULES } from "../../../engine/battle-rules.js";
import { GEN3_GLOBAL_HOOKS } from "../../../engine/rules/gen3/global-rules.js";
import { healMonster } from "../../../engine/model.js";
import { grantReward } from "../../../engine/story.js";
import { StateCheckpoint } from "../../../engine/state-checkpoint.js";
import { validateMoney, settleMoney } from "../../../engine/currency.js";
import { BattleSession } from "../../../engine/battle-session.js";
import { ITEMS } from "../../../packs/emerald/pack.js";
import { EncounterService } from "../../../engine/encounters.js";
import { isWater } from "../../../engine/terrain.js";
import { createTrainerEncounter } from "../../../engine/trainer-encounters.js";
import { trainerRewardId } from "../../../packs/emerald/trainers.js";
import { bindApplicationPorts } from "./ports.js";
export const BATTLE_PORTS = Object.freeze([
  "control",
  "facilityActive",
  "battleStrategies",
  "busy",
  "catalog",
  "clearInput",
  "db",
  "director",
  "items",
  "inventory",
  "moveEffects",
  "plugins",
  "partyStorage",
  "rng",
  "ruleHooks",
  "runStory",
  "save",
  "seen",
  "state",
  "story",
  "storyCatalog",
  "timeline",
  "trainerDefinitions",
  "transitions",
  "ui",
  "world",
  "weatherView",
]);
/** battle use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class BattleApplication {
  musicContext() {
    const b = this.combat.battle || this.combat.enteringBattle;
    if (!b || !(this.victoryBattle === b || this.combat.pendingResult && b.trainer && b.result === "win")) return b;
    return { script: b.script, trainer: b.trainer, trainerActor: this.trainerDefinitions[b.trainerId]?.actor,
      presentationPhase: "victory" };
  }
  constructor(ports) {
    bindApplicationPorts(this, ports, BATTLE_PORTS);
    // The tutorial drives ordinary menu selections while retaining the player input lock.
    this.autoBattle = false;
    this.combat = new BattleSession({
      director: this.director,
      transitions: this.transitions,
      onMessage: (text) => {
        this.ui.drawBattleHUD(text);
        this.ui.announce(text);
      },
      onPresented: (event) => {
        const b = this.combat.battle;
        if (b && !b.trainer && event.kind === "faint" &&
            event.sides.find(s => s.id === event.combatants.find(c => c.seatId === event.targetSeat)?.sideId)?.allianceId !== event.homeAlliance &&
            event.combatants.some(c => c.monster?.hp > 0 && event.sides.find(s => s.id === c.sideId)?.allianceId === event.homeAlliance))
          this.victoryBattle = b;
      },
      onChange: () => {
        if (!this.combat.battle) this.victoryBattle = null;
        this.control.battleChanged(this.combat.battle);
        this.ui?.resetBattleMenu();
        this.ui?.drawBattleHUD();
        this.ui?.updateSide();
      },
      onFailure: (error, battle) => {
        this.settlementCheckpoint?.restore();
        const recover = this.resultRecovery;
        this.settlementCheckpoint = null;
        this.resultRecovery = null;
        this.resultOwner = null;
        return recover?.(error, battle);
      },
      onResult: (b) => {
        this.settlementCheckpoint = new StateCheckpoint(this.state, this.rng);
        const plan = this.resultOwner
          ? this.resultOwner(b)
          : this.resultPlan(b);
        this.resultOwner = null;
        return {
          commit: () => {
            plan.commit?.();
            this.settlementCheckpoint = null;
            this.resultRecovery = null;
          },
          presentation: [...emeraldBattleResultPrelude(this.state, b), ...plan.presentation || []],
          dialogue: (dialogue) => this.ui.say?.(dialogue.name, dialogue.lines),
          after: () => plan.after?.(),
        };
      },
    });
  }
  async startIsolatedTrainerBattle(id, context) {
    const trainer = this.trainerDefinitions[id];
    if (!trainer) throw new Error("Unknown trainer encounter");
    const encounter = createTrainerEncounter(trainer, {
      party: context.party,
      bag: context.bag,
      db: this.db,
      rng: this.rng,
      strategies: this.battleStrategies,
      inventory: this.inventory,
      attachments: this.catalog.battleAttachments,
    });
    return this.startBattle(
      encounter.enemyParty,
      {
        ...encounter,
        trainerId: id,
        rules: { experienceFinal: () => 0, grantExperience: () => [] },
      },
      context,
    );
  }
  async startTrainerBattle(id, resultOwner = null, recover = null) {
    if (this.facilityActive) return false;
    const trainer = this.trainerDefinitions[id];
    if (!trainer) throw new Error("Unknown trainer encounter");
    const encounter = createTrainerEncounter(trainer, {
      party: this.state.party,
      bag: this.state.bag,
      db: this.db,
      rng: this.rng,
      strategies: this.battleStrategies,
      inventory: this.inventory,
      attachments: this.catalog.battleAttachments,
    });
    return this.startBattle(
      encounter.enemyParty,
      {
        ...encounter,
        trainerId: id,
      },
      null,
      resultOwner,
      recover,
    );
  }
  async startEncounterBattle(monster, resultPlan, recover = null, ai = null) {
    return this.startBattle(
      monster,
      // A configured wild encounter carries its strategy with the battle only; the captured
      // creature never stores callbacks, memory or the binding.
      ai
        ? { strategies: this.battleStrategies, aiBindings: { opponent: ai } }
        : {},
      null,
      (b) => this.directResultPlan(b, resultPlan(b)),
      recover,
    );
  }
  directResultPlan(b, owner) {
    let committed = false;
    return {
      commit: () => {
        if (committed) return;
        const reward = b.spoils?.reward || 0,
          money = reward
            ? b.rules.rewardCurrency({
                current: this.state.money,
                amount: reward,
              })
            : this.state.money;
        validateMoney(money);
        owner.commit?.();
        settleMoney(this.state, money);
        if (b.result === "loss")
          this.state.party.forEach((m) => healMonster(m, this.db));
        else
          this.encounterService().afterBattle(this.state.party, (text) =>
            this.ui?.toast(text),
          );
        committed = true;
      },
      after: () => owner.after?.(),
    };
  }
  async startBattle(
    enemy, options = {}, context = null, resultOwner = null, recover = null,
  ) {
    if (this.facilityActive && !context) return false;
    const party = context?.party || this.state.party,
      bag = context?.bag || this.state.bag;
    if (!party.some((m) => !m.egg)) return false;
    if (this.combat.battle || this.combat.busy || this.transitions.busy)
      return false;
    if (!party.some((m) => m.hp > 0 && !m.egg))
      party.forEach((m) => healMonster(m, this.db));
    const enemies = Array.isArray(enemy) ? enemy : [enemy];
    const opponents = options.topology
      ? options.topology.sides.flatMap((side) =>
          side.controllers
            .filter((c) => c.kind === "ai")
            .flatMap((c) => c.party),
        )
      : enemies;
    if (!context) for (const mon of opponents) this.seen(mon.species);
    this.clearInput();
    this.ui.closeModal();
    this.resultOwner = resultOwner || context?.resultPlan || null;
    this.resultRecovery = recover || context?.recover || null;
    const started = await this.combat.start({
      party,
      enemyParty: enemies,
      db: this.db,
      rng: this.rng,
      bag,
      items: this.items,
      effects: this.moveEffects,
      states: this.catalog.battleStates,
      augmentDefinitions: this.catalog.battleAugments,
      attachmentDefinitions: this.catalog.battleAttachments,
      formDefinitions: this.catalog.forms,
      formRecords: context
        ? {}
        : Object.fromEntries(
            [...this.state.party, ...enemies]
              .filter((m) => this.state.forms[m.uid])
              .map((m) => [m.uid, this.state.forms[m.uid]]),
          ),
      weatherDefinitions: this.catalog.battleWeather,
      environment: {
        weather: this.weatherView().battle,
        terrain: this.world.map.indoor
          ? "indoor"
          : isWater(
                this.world.cell(this.state.position.x, this.state.position.y)
                  ?.behavior,
              )
            ? "water"
            : this.world.map.presentation?.terrain || "grass",
        ...context?.environment,
      },
      traits: {
        abilities: this.catalog.abilities,
        heldItems: this.catalog.heldItems,
        hooks: [...GEN3_GLOBAL_HOOKS, ...this.ruleHooks],
      },
      ...options,
      presentation: {
        ...emeraldBattleOpening({ ...this.state, party }, {
          ...options,
          trainerActor: this.trainerDefinitions[options.trainerId]?.actor,
          trainerName: this.trainerDefinitions[options.trainerId]?.name,
        }, this.db, enemies),
        transition: openingBattleTransition({ trainer: !!options.trainer, trainerActor: this.trainerDefinitions[options.trainerId]?.actor, party, opponents }),
        ...options.presentation,
        dialogue: (dialogue) => this.ui.say?.(dialogue.name, dialogue.lines),
      },
      rules: {
        ...options.rules,
        canCapture: (battle) =>
          (options.rules?.canCapture || BATTLE_RULES.canCapture)(battle) &&
          (!!context || this.partyStorage.canReceive(this.state)),
      },
    });
    // The demonstration plays outside the story lock so the battle-result continuation can run
    // when the capture lands (the story command has already returned).
    if (started && options.autoActions?.length)
      void this.runAutoBattle(options.autoActions).catch((error) => {
        this.ui?.toast?.("演示战斗未能完成。");
        console.error(error);
      });
    return started;
  }
  /**
   * A scripted demonstration battle: the player's seat follows a fixed action queue while the
   * normal menus demonstrate the selections. Submission shares manual input settlement.
   */
  async runAutoBattle(actions) {
    this.autoBattle = true;
    try {
      // startBattle returns through the story suspension boundary before menu input is legal.
      for (let attempts = 0; this.busy && attempts < 64; attempts++)
        await this.timeline.wait(16);
      if (this.busy) throw new Error("Demonstration input remained locked");
      for (const action of actions) {
        if (!this.combat.battle || this.combat.battle.ended) break;
        for (const event of emeraldDemonstrationPrelude(this.combat.battle, action))
          await this.director.play(event, { message: (text) => this.ui.drawBattleHUD(text) });
        const submit = (selection) => this.applyAction(selection);
        if (this.ui.demonstrateBattleAction)
          await this.ui.demonstrateBattleAction(action, { wait: (ms) => this.timeline.wait(ms), submit });
        else await submit(action);
      }
    } finally {
      this.autoBattle = false;
    }
  }
  async turn(action) {
    if (this.autoBattle) return false;
    return this.applyAction(action);
  }
  async applyAction(action) {
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
  resultPlan(b, { story = true } = {}) {
    const drops = [];
    let committed = false;
    let commands = story
      ? this.story.resolve("battleResult", this.state, {
          battle: b,
          db: this.db,
        })
      : [];
    const fallback = !commands.length && b.result === "win" && b.trainerId;
    if (fallback) {
      const trainer = this.trainerDefinitions[b.trainerId];
      const amount = trainer.prize * (b.prizeMultiplier || 1);
      commands = [
        { type: "reward", id: trainerRewardId(b.trainerId), money: amount },
        {
          type: "dialog",
          name: trainer.name,
          lines: [
            this.state.story.rewards.includes(trainerRewardId(b.trainerId))
              ? "这次挑战已经完成。"
              : `${trainer.name}被打败了！`,
          ],
        },
      ];
    }
    const presentation = [];
    const defeatId = emeraldDefeatDialogue(this.state, b);
    if (b.result === "win" && b.trainer && (defeatId || fallback)) {
      const defeated = defeatId
        ? this.storyCatalog.resolveDialogue({ dialogue: defeatId }, this.state)
        : this.storyCatalog.resolveDialogue(commands.find(c => c.type === "dialog"), this.state);
      if (fallback) commands = commands.filter(c => c.type !== "dialog");
      const actor = this.trainerDefinitions[b.trainerId]?.actor || (b.script === "rival" ? (this.state.playerGender === "female" ? "BrendanNormal" : "MayNormal") : "Youngster");
      presentation.push({ ...b.snapshot(), kind: "text", text: "", dialogue: { name: "", lines: [`${this.state.playerName}击败了${this.trainerDefinitions[b.trainerId]?.name || "劲敌"}！`] } });
      if (defeated) presentation.push({ ...b.snapshot(), kind: "trainer-slide", text: "", duration: 48 * 1000 / 60,
        trainers: [{ ...battleTrainer(actor, false, b.trainerId), position: { x: 208, y: 40 }, slideOffset: 96 }], dialogue: defeated });
      const prize = commands.find(c => c.type === "reward" && c.money);
      if (prize && !this.state.story.rewards.includes(prize.id))
        presentation.push({ ...b.snapshot(), kind: "text", text: "", dialogue: { name: "", lines: [`${this.state.playerName}获得了 ¥${prize.money}！`] } });
    }
    // Money and the victory receipt commit together before post-battle field dialogue.
    // Keep item/story rewards in their authored continuation (bag-full branches included).
    const prizeId = b.trainerId && trainerRewardId(b.trainerId);
    const prize = b.result === "win" && commands.find(c => c.type === "reward" && c.id === prizeId &&
      c.money !== undefined && !c.items && !c.flags && !c.onResult);
    if (prize) commands = commands.filter(c => c !== prize);
    return {
      presentation,
      commit: () => {
        if (committed) return;
        const reward = b.spoils?.reward || 0;
        const money = reward
          ? b.rules.rewardCurrency({
              current: this.state.money,
              amount: reward,
            })
          : this.state.money;
        validateMoney(money);
        if (b.result === "caught" && !this.partyStorage.canReceive(this.state))
          throw new Error("Capture storage unavailable");
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
        // A cinematic capture (a scripted demonstration) never enters the player's storage.
        if (b.result === "caught" && !b.cinematicCapture) {
          if (!this.partyStorage.receive(this.state, structuredClone(b.enemy)))
            throw new Error("Captured monster could not be received");
          this.seen(b.enemy.species, true);
        }
        settleMoney(this.state, money);
        if (prize) grantReward(this.state, prize, { items: this.items, inventory: this.inventory });
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
  get battle() {
    return this.combat.battle;
  }
}
