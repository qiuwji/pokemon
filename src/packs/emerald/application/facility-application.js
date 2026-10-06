import {
  FacilityRegistry,
  FacilitySession,
} from "../../../engine/facilities.js";
import { changeMoney, settleMoney, validateMoney } from "../../../engine/currency.js";
import { grantReward } from "../../../engine/story.js";
import { healMonster } from "../../../engine/model.js";
import { readOnly } from "../../../engine/extensions/values.js";
import {
  EMERALD_FACILITIES,
  EMERALD_FACILITY_ACTIVITIES,
  projectFacilityTeam,
} from "../facilities.js";
import { TRAINERS } from "../trainers.js";
import { bindApplicationPorts } from "./ports.js";
export const FACILITY_PORTS = Object.freeze([
  "battle",
  "busy",
  "catalog",
  "conditionQueries",
  "db",
  "inventory",
  "plugins",
  "rng",
  "save",
  "state",
  "ui",
  "clearInput",
  "startFacilityBattle",
]);
/** Activity policies only return plans; this owner coordinates resources, isolated combat and lifecycle. */
export class FacilityApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, FACILITY_PORTS);
  }
  bind() {
    this.registry = new FacilityRegistry({
      definitions: this.catalog.facilities || EMERALD_FACILITIES,
      activities:
        this.catalog.facilityActivities || EMERALD_FACILITY_ACTIVITIES,
      references: {
        trainers: this.catalog.trainers || TRAINERS,
        species: this.db.species,
        items: this.catalog.items,
        battleWeather: this.catalog.battleWeather || {},
      },
      queries: this.conditionQueries,
    });
    this.session = new FacilitySession({
      registry: this.registry,
      state: this.state.facilities,
    });
    this.context = null;
    this.locked = false;
  }
  get facilityActive() {
    return this.session?.active === true;
  }
  view() {
    return readOnly({
      ...this.session.view(),
      definitions: Object.fromEntries(this.registry.definitions),
    });
  }
  worldView() {
    return {
      money: this.state.money,
      flags: this.state.flags,
      party: this.state.party,
      clock: this.state.clock,
      position: this.state.position,
    };
  }
  emit(event) {
    this.plugins?.events.emit("core:facility-event", event);
  }
  ready() {
    return !this.busy && !this.battle && !this.ui?.dialog && !this.locked;
  }
  enter(id, uids) {
    if (!this.ready()) return { ok: false, reason: "请先结束当前行动。" };
    const check = this.session.inspect(id, uids, this.state.party, this.state);
    if (!check.ok) return check;
    const definition = this.registry.get(id),
      party = projectFacilityTeam(
        uids.map((uid) => this.state.party.find((m) => m.uid === uid)),
        definition,
        this.db,
      );
    const bag = definition.team?.items
      ? structuredClone(this.state.bag)
      : this.inventory.create({});
    const result = this.session.enter(id, uids, this.state.party, this.state);
    this.context = { party, bag };
    this.clearInput();
    this.emit(result.event);
    return result;
  }
  economy(plan) {
    const draft = {
      bag: structuredClone(this.state.bag),
      money: this.state.money,
      flags: { ...this.state.flags },
      story: structuredClone(this.state.story),
    };
    if (plan.cost) {
      validateMoney(plan.cost.money ?? 0);
      if (draft.money < (plan.cost.money || 0))
        throw new Error("没有足够的游戏币（金钱）。");
      settleMoney(draft, changeMoney(draft.money, -(plan.cost.money ?? 0)));
      const debit = this.inventory.apply(
        draft.bag,
        Object.entries(plan.cost.items || {}).map(([item, count]) => ({
          kind: "remove",
          item,
          count,
        })),
      );
      if (!debit.ok) throw new Error(debit.reason);
    }
    if (
      plan.reward &&
      !grantReward(
        draft,
        { id: `${plan.transaction}.reward`, ...plan.reward },
        { items: this.catalog.items, inventory: this.inventory },
      )
    )
      throw new Error("Facility reward already settled");
    return draft;
  }
  commit(plan, draft) {
    validateMoney(draft.money);
    const result = this.session.commit(plan);
    this.state.bag = draft.bag;
    settleMoney(this.state, draft.money);
    this.state.story = draft.story;
    if (!this.facilityActive) this.context = null;
    return result;
  }
  notify(result) {
    this.emit(result.event);
    this.ui?.updateSide();
    if (!this.facilityActive) this.save();
  }
  async action(id, input = {}) {
    if (!this.facilityActive || !this.ready())
      return { ok: false, reason: "当前不能执行设施操作。" };
    this.locked = true;
    const seed = this.rng.snapshot(),
      before = structuredClone(this.context);
    let installed = false;
    try {
      const action = this.session.action(id),
        rolls = action.draws.map((n) => this.rng.int(n)),
        plan = this.session.prepareAction(id, input, this.worldView(), rolls),
        draft = this.economy(plan);
      if (!plan.battle) {
        const result = this.commit(plan, draft);
        installed = true;
        this.notify(result);
        return { ok: true };
      }
      const definition = this.registry.get(this.session.view().active.facility);
      if (definition.team?.healBetween)
        this.context.party.forEach((m) => healMonster(m, this.db));
      let ticket;
      try {
        const started = await this.startFacilityBattle(plan.battle.trainerId, {
          ...this.context,
          environment: { weather: plan.battle.weather ?? null },
          resultPlan: (battle) => this.resultPlan(ticket, battle),
          recover: () => this.session.cancelBattle(ticket),
        });
        if (!started) throw new Error("Facility battle could not start");
      } finally {
        // Presentation may fail after combat installation. Commit the matching session once so it can resume.
        if (this.battle) {
          installed = true;
          const result = this.commit(plan, draft);
          ticket = result.ticket;
          this.notify(result);
        }
      }
      return { ok: true };
    } catch (error) {
      if (!installed) {
        this.context = before;
        this.rng.restore(seed);
      }
      throw error;
    } finally {
      this.locked = false;
    }
  }
  resultPlan(ticket, battle) {
    this.session.checkTicket(ticket);
    let committed = false, result;
    return {
      commit: () => {
        if (committed) return;
        const plan = this.session.prepareResult(
          ticket,
          battle.result,
          this.worldView(),
        );
        result = this.commit(plan, this.economy(plan));
        committed = true;
      },
      after: () => {
        this.notify(result);
        this.ui?.showFacility?.();
        this.ui?.updateSide();
        if (!this.facilityActive) this.save();
      },
    };
  }
  claim() {
    if (!this.facilityActive || !this.ready())
      return { ok: false, reason: "请先结束当前行动。" };
    const plan = this.session.prepareClaim();
    this.notify(this.commit(plan, this.economy(plan)));
    return { ok: true };
  }
  quit() {
    if (!this.facilityActive || !this.ready())
      return { ok: false, reason: "请先完成当前对战。" };
    const plan = this.session.prepareQuit();
    this.notify(this.commit(plan, this.economy(plan)));
    return { ok: true };
  }
}
