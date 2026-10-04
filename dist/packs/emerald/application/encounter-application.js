import { EncounterTickets } from "../../../engine/encounter-tickets.js";
import { EncounterPolicyRegistry } from "../../../engine/encounter-policies.js";
import { EMERALD_ENCOUNTER_POLICIES } from "../encounter-policies.js";
import { bindApplicationPorts } from "./ports.js";
import { readOnly } from "../../../engine/extensions/values.js";
export const ENCOUNTER_PORTS = Object.freeze([
  "catalog",
  "state",
  "world",
  "encounterTables",
  "encounterService",
  "startBattle",
  "plugins",
  "ui",
  "weatherView",
  "rng",
  "save",
  "db",
  "bindEncounterActor",
  "removeEncounterActor",
  "contactView",
  "startEncounterBattle",
  "partyStorage",
  "seen",
  "battle",
]);
/** Owns channel dispatch and sampling. Queries, policy selection and generation are separate. */
export class EncounterApplication {
  constructor(ports) {
    bindApplicationPorts(this, ports, ENCOUNTER_PORTS);
    this.policies = new EncounterPolicyRegistry(
      this.catalog.encounterPolicies || EMERALD_ENCOUNTER_POLICIES,
    );
    this.reset();
  }
  bind() {
    this.tickets = new EncounterTickets({
      state: this.state.encounters,
      maps: this.db.maps,
      actors: () => this.state.actors.records,
      owned: () => [
        ...this.state.party,
        ...this.state.box,
        ...this.state.daycare.slots.map((s) => s.mon),
        ...(this.state.daycare.egg ? [this.state.daycare.egg] : []),
        ...this.state.tradePartner,
      ],
    });
  }
  reset() {
    this.lastEncounterSteps = -5;
  }
  view() {
    return this.tickets.list();
  }
  removedActor(uid) {
    const id = this.tickets?.forActor(uid);
    if (id) {
      this.tickets.release(id);
      this.plugins?.events.emit("core:encounter-released", {
        id,
        actor: uid,
        reason: "actor-removed",
      });
    }
  }
  prepare({ actor, ...args }) {
    const a = this.bindEncounterActor(actor);
    if (!a || a.hidden || a.map !== this.state.position.map)
      return { ok: false, reason: "需要当前地图上的可见角色。" };
    if (this.tickets.forActor(actor))
      return { ok: false, reason: "角色已有遭遇凭证。" };
    const table = this.table({ ...args, map: a.map });
    if (!table) return { ok: false, reason: "这个地区没有对应的遇敌表。" };
    const seed = this.rng.seed;
    let ticket;
    try {
      const monster = this.encounterService().attempt({
        party: this.state.party,
        ...table,
        weather: this.weatherView().battle,
        checkRate: false,
        checkPermission: false,
      });
      if (!monster) return { ok: false, reason: "需要队伍中的伙伴。" };
      ticket = this.tickets.issue({
        actor,
        map: a.map,
        area: table.area,
        table: table.id,
        monster,
      });
    } catch (error) {
      this.rng.seed = seed;
      throw error;
    }
    this.plugins?.events.emit("core:encounter-prepared", ticket);
    this.save();
    return readOnly({ ok: true, ticket });
  }
  release(id) {
    const ticket = this.tickets.view(id);
    if (ticket.claimed) return false;
    this.tickets.release(id);
    this.plugins?.events.emit("core:encounter-released", {
      id,
      actor: ticket.actor,
      reason: "request",
    });
    this.save();
    return true;
  }
  async request({ ticket: id, contact }) {
    const t = this.tickets.view(id),
      p = this.state.position,
      a = this.bindEncounterActor(t.actor),
      edge = this.contactView().find(
        (c) =>
          c.sequence === contact &&
          [c.subject.id, c.target.id].includes("player") &&
          [c.subject.id, c.target.id].includes(t.actor),
      );
    if (
      !edge ||
      !a ||
      a.hidden ||
      a.map !== p.map ||
      t.map !== p.map ||
      t.claimed
    )
      return { ok: false, reason: "遭遇需要当前有效的角色接触。" };
    if (
      !this.state.party.some((m) => !m.egg && m.hp > 0) ||
      !this.partyStorage.canReceive(this.state)
    )
      return { ok: false, reason: "需要能战斗的伙伴和可用的收纳空间。" };
    if (!this.tickets.claim(id))
      return { ok: false, reason: "遭遇凭证已被使用。" };
    const monster = this.tickets.record(id).monster;
    try {
      const started = await this.startEncounterBattle(monster,
        (b) => this.resultPlan(id, b), () => this.tickets.unclaim(id));
      if (!started) {
        this.tickets.unclaim(id);
        return { ok: false, reason: "现在无法开始战斗。" };
      }
      this.plugins?.events.emit("core:encounter-started", {
        id,
        actor: t.actor,
        contact,
      });
      return { ok: true };
    } catch (error) {
      if (!this.battle) this.tickets.unclaim(id);
      throw error;
    }
  }
  resultPlan(id, b) {
    const ticket = this.tickets.view(id),
      monster = this.tickets.record(id).monster;
    let committed = false;
    return {
      commit: () => {
        if (committed) return;
        if (b.result === "caught") {
          if (!this.partyStorage.canReceive(this.state))
            throw new Error("Capture storage unavailable");
          if (!this.partyStorage.receive(this.state, monster))
            throw new Error("Captured monster could not be received");
          this.tickets.release(id);
          this.seen(monster.species, true);
        } else this.tickets.release(id);
        this.removeEncounterActor(ticket.actor);
        committed = true;
      },
      after: () => {
        this.plugins?.events.emit("core:encounter-resolved", {
          id,
          actor: ticket.actor,
          species: ticket.species,
          result: b.result,
        });
        this.ui?.updateSide();
        this.ui?.checkGrowth();
        this.save();
      },
    };
  }
  context(cell) {
    return {
      position: { ...this.state.position },
      steps: this.world.steps,
      lastEncounterSteps: this.lastEncounterSteps,
      mode: this.state.movement.mode,
      cell: cell || null,
      party: this.state.party,
      flags: this.state.flags,
      dialog: !!this.ui?.dialog,
      weather: this.weatherView(),
    };
  }
  inspect(channel) {
    return this.policies.resolve(
      channel,
      this.context(
        this.world.cell(this.state.position.x, this.state.position.y),
      ),
    );
  }
  table({ map = this.state.position.map, area, rod } = {}) {
    return this.encounterTables.effective(map, area, this.state, { rod });
  }
  sample(args) {
    const seed = this.rng.seed;
    let result;
    try {
      const table = this.table(args);
      if (!table) return { ok: false, reason: "这个地区没有对应的遇敌表。" };
      const sample = this.encounterService().sample({
        party: this.state.party,
        ...table,
        weather: this.weatherView().battle,
      });
      if (!sample) return { ok: false, reason: "需要队伍中的伙伴。" };
      result = readOnly({
        ok: true,
        sample: {
          ...sample,
          map: table.map,
          area: table.area,
          table: table.id,
        },
      });
    } catch (error) {
      this.rng.seed = seed;
      throw error;
    }
    this.plugins?.events.emit("core:encounter-sampled", result.sample);
    this.save();
    return result;
  }
  step(cell) {
    try {
      const selection = this.policies.resolve("step", this.context(cell));
      if (!selection?.decision) return;
      const { area, ...options } = selection.decision,
        table = this.table({ area });
      if (!table) return;
      const monster = this.encounterService().attempt({
        party: this.state.party,
        ...table,
        mode: this.state.movement.mode,
        ...options,
      });
      if (monster) {
        this.lastEncounterSteps = this.world.steps;
        void this.startBattle(monster);
      }
      this.plugins?.events.emit("core:encounter-attempt", {
        channel: "step",
        policy: selection.policy,
        area,
        steps: this.world.steps,
        encounter: !!monster,
      });
    } catch (error) {
      this.plugins?.events.emit("core:encounter-fault", {
        channel: "step",
        reason: error.message,
      });
      this.ui?.toast("遇敌策略发生错误：" + error.message);
    }
  }
}
