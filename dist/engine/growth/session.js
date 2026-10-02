import { DaycareService } from "./daycare.js";
import { BreedingService } from "./breeding.js";
import { HatchService } from "./hatching.js";
import { EvolutionService } from "./evolution.js";
import { FriendshipService } from "./friendship.js";

/** Reusable growth orchestration. Storage, player permissions and presentation are injected by the application. */
export class GrowthSession {
  constructor({
    state,
    db,
    rng,
    abilities,
    heldItems,
    hooks = [],
    conditions,
    hour = () => 12,
  }) {
    Object.assign(this, { state, db, rng, hour });
    this.friendship = new FriendshipService({ abilities, heldItems, hooks });
    this.evolutions = new EvolutionService({
      db,
      abilities,
      heldItems,
      hooks,
      conditions,
    });
    this.hatching = new HatchService({ abilities, heldItems, hooks });
    this.daycare = new DaycareService({
      state: state.daycare,
      db,
      breeding: new BreedingService({ db, rng }),
    });
  }
  advance(steps = 1) {
    if (!Number.isInteger(steps) || steps < 0 || steps > 100000)
      throw new Error("Invalid growth step count");
    const clock = { ...this.state.growth },
      friendshipSteps = this.state.friendshipSteps;
    const eggs = this.state.party
      .filter((m) => m.egg)
      .map((mon) => ({
        mon,
        data: { ...mon.egg, parents: [...mon.egg.parents] },
      }));
    const friendship = this.state.party.map((mon) => ({
      mon,
      value: mon.friendship,
    }));
    const deposits = this.state.daycare.slots.map((s) => s.steps),
      pending = this.state.daycare.egg,
      daycareClock = this.state.daycare.steps;
    const random = this.rng.snapshot();
    const ready = [];
    try {
      for (let i = 0; i < steps; i++) {
        this.state.friendshipSteps =
          ((this.state.friendshipSteps || 0) + 1) % 128;
        if (this.state.friendshipSteps === 0)
          for (const mon of this.state.party)
            if (!mon.egg && this.rng.int(2) === 0)
              this.friendship.change(mon, "walk", { party: this.state.party });
        this.daycare.advance();
        ready.push(
          ...this.hatching.advance(this.state.growth, this.state.party),
        );
      }
    } catch (error) {
      Object.assign(this.state.growth, clock);
      this.state.friendshipSteps = friendshipSteps;
      for (const { mon, data } of eggs) mon.egg = data;
      for (const { mon, value } of friendship) {
        if (value === undefined) delete mon.friendship;
        else mon.friendship = value;
      }
      this.state.daycare.slots.forEach((s, i) => (s.steps = deposits[i]));
      this.state.daycare.egg = pending;
      this.state.daycare.steps = daycareClock;
      this.rng.restore(random);
      throw error;
    }
    return {
      hatchReady: ready,
      eggWaiting: this.state.daycare.egg?.uid || null,
    };
  }
  evolutionPlan(mon, options = {}) {
    return this.evolutions.prepare(mon, {
      party: this.state.party,
      bag: this.state.bag,
      hour: this.hour(),
      ...options,
    });
  }
  readyEgg() {
    return this.state.party.find((m) => m.egg?.ready) || null;
  }
}
