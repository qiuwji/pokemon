import { openingBattleTransition } from "../battle-transitions.js";
import { BATTLE_RULES } from "../../../engine/battle-rules.js";
import { GEN3_GLOBAL_HOOKS } from "../../../engine/rules/gen3/global-rules.js";
import { healMonster } from "../../../engine/model.js";
import { StateCheckpoint } from "../../../engine/state-checkpoint.js";
import { validateMoney, settleMoney } from "../../../engine/currency.js";
import { BattleSession } from "../../../engine/battle-session.js";
import { ITEMS } from "../pack.js";
import { EncounterService } from "../../../engine/encounters.js";
import { isWater } from "../../../engine/terrain.js";
import { createTrainerEncounter, trainerRewardId } from "../trainers.js";
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
  "trainerDefinitions",
  "transitions",
  "ui",
  "world",
  "weatherView",
]);
/** battle use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class BattleApplication {
  musicContext() {
    return this.combat.battle || this.combat.enteringBattle;
  }
  constructor(ports) {
    bindApplicationPorts(this, ports, BATTLE_PORTS);
    this.combat = new BattleSession({
      director: this.director,
      transitions: this.transitions,
      onMessage: (text) => {
        this.ui.drawBattleHUD(text);
        this.ui.announce(text);
      },
      onChange: () => {
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
  async startEncounterBattle(monster, resultPlan, recover = null) {
    return this.startBattle(
      monster, {}, null,
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
    return this.combat.start({
      party,
      enemyParty: enemies,
      db: this.db,
      rng: this.rng,
      bag,
      items: this.items,
      effects: this.moveEffects,
      states: this.catalog.battleStates,
      augmentDefinitions: this.catalog.battleAugments,
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
      presentation: {
        transition: openingBattleTransition({trainer: !!options.trainer, party, opponents}),
        ...(options.trainer ? {
            trainers: [
              { actor: this.state.playerGender === "female" ? "MayNormal" : "BrendanNormal", back: true },
              {
                actor:
                  this.trainerDefinitions[options.trainerId]?.actor ||
                  (options.script === "rival" ? (this.state.playerGender === "female" ? "BrendanNormal" : "MayNormal") : "Youngster"),
              },
            ],
          } : {}),
      },
      traits: {
        abilities: this.catalog.abilities,
        heldItems: this.catalog.heldItems,
        hooks: [...GEN3_GLOBAL_HOOKS, ...this.ruleHooks],
      },
      ...options,
      rules: {
        ...options.rules,
        canCapture: (battle) =>
          (options.rules?.canCapture || BATTLE_RULES.canCapture)(battle) &&
          (!!context || this.partyStorage.canReceive(this.state)),
      },
    });
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
  resultPlan(b, { story = true } = {}) {
    const drops = [];
    let committed = false;
    let commands = story
      ? this.story.resolve("battleResult", this.state, {
          battle: b,
          db: this.db,
        })
      : [];
    if (!commands.length && b.result === "win" && b.trainerId) {
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
              : `全队获胜！获得了 ¥${amount}。`,
          ],
        },
      ];
    }
    return {
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
        if (b.result === "caught") {
          if (!this.partyStorage.receive(this.state, structuredClone(b.enemy)))
            throw new Error("Captured monster could not be received");
          this.seen(b.enemy.species, true);
        }
        settleMoney(this.state, money);
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
