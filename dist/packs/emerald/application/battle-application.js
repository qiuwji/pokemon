import { GEN3_GLOBAL_HOOKS } from "../../../engine/rules/gen3/global-rules.js";
import { healMonster } from "../../../engine/model.js";
import { BattleSession } from "../../../engine/battle-session.js";
import { ITEMS } from "../pack.js";
import { EncounterService } from "../../../engine/encounters.js";
import { isWater } from "../../../engine/terrain.js";
import { createTrainerEncounter } from "../trainers.js";
import { bindApplicationPorts } from "./ports.js";
export const BATTLE_PORTS = Object.freeze([
  "battleStrategies",
  "busy",
  "catalog",
  "clearInput",
  "db",
  "director",
  "items",
  "moveEffects",
  "plugins",
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
]);
/** battle use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class BattleApplication {
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
        this.ui?.resetBattleMenu();
        this.ui?.drawBattleHUD();
        this.ui?.updateSide();
      },
      onResult: (b) => this.resultPlan(b),
    });
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
        const reward = b.spoils?.reward || 0;
        const money = reward
          ? b.rules.rewardCurrency({
              current: this.state.money,
              amount: reward,
            })
          : this.state.money;
        if (!Number.isSafeInteger(money) || money < 0)
          throw new Error("Invalid currency settlement");
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
        this.state.money = money;
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
