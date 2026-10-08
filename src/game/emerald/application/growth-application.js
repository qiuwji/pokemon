import { extensionGrowthConditions } from "../../../engine/extensions/growth-conditions.js";
import { emptyInventory } from "../../../engine/inventory.js";
import { StateCheckpoint } from "../../../engine/state-checkpoint.js";
import { learnPendingMove } from "../../../engine/party.js";
import { createMonster } from "../../../engine/model.js";
import { GrowthSession } from "../../../engine/growth/session.js";
import { GrowthDirector } from "../../../presentation/growth-director.js";
import { TradeService } from "../../../engine/growth/trading.js";
import { bindApplicationPorts } from "./ports.js";
export const GROWTH_PORTS = Object.freeze([
  "battle",
  "busy",
  "canManageParty",
  "catalog",
  "inventory",
  "clearInput",
  "db",
  "learning",
  "plugins",
  "reducedMotion",
  "rng",
  "ruleHooks",
  "save",
  "seen",
  "state",
  "timeline",
  "ui",
]);
/** growth use cases. Dependencies are live, explicitly selected ports; no application facade is injected. */
export class GrowthApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, GROWTH_PORTS);
    this.trading = new TradeService({ db: this.db });
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
          bag: emptyInventory(),
        });
        if (plan)
          await this.growthDirector.play({
            kind: "evolution",
            from: mon.species,
            to: plan.to,
            commit: () => this.evolutions.commit(plan),
          });
      }
      while (given.pendingMoves?.length) {
        const index = given.moves.findIndex((slot) =>
          this.learning.canForget(slot.id),
        );
        learnPendingMove(given, index < 0 ? null : index, this.db, {
          protectedMoves: this.learning.protectedMoves,
        });
      }
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
  bind() {
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
      inventory: this.inventory,
      conditions: extensionGrowthConditions(
        this.catalog.growthConditions,
        (fn, ...args) => this.plugins.runtime.evaluate(fn, ...args),
      ),
      hour: () => Math.floor((this.state.clock?.localMs || 0) / 3600000) % 24,
    });
    this.friendship = this.growth.friendship;
    this.evolutions = this.growth.evolutions;
    this.growthDirector = new GrowthDirector({
      timeline: this.timeline,
      reducedMotion: this.reducedMotion,
    });
    this.growthBusy = false;
  }
}
