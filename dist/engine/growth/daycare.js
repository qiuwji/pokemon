import { experienceAt, calculateStats, healMonster } from "../model.js";
/** Daycare owns persisted deposits and one pending egg. It never owns menus, animation or player movement. */
export class DaycareService {
  constructor({ state, breeding, db }) {
    Object.assign(this, { state, breeding, db });
  }
  deposit(party, uid) {
    const index = party.findIndex((m) => m.uid === uid),
      mon = party[index];
    if (
      !mon ||
      mon.egg ||
      this.state.slots.length >= 2 ||
      party.filter((m) => !m.egg && m.hp > 0).length - (mon.hp > 0 ? 1 : 0) < 1
    )
      return { ok: false };
    party.splice(index, 1);
    this.state.slots.push({ mon, steps: 0, initialLevel: mon.level });
    return { ok: true, uid };
  }
  withdraw(party, uid, wallet) {
    const index = this.state.slots.findIndex((s) => s.mon.uid === uid),
      slot = this.state.slots[index];
    if (!slot || party.length >= 6) return { ok: false };
    const price = 100 * (1 + slot.mon.level - slot.initialLevel);
    if (wallet.money < price)
      return { ok: false, reason: "Insufficient money" };
    slot.mon.stats = calculateStats(
      slot.mon,
      this.db.species[slot.mon.species],
    );
    healMonster(slot.mon, this.db);
    wallet.money -= price;
    this.state.slots.splice(index, 1);
    party.push(slot.mon);
    return { ok: true, uid, price };
  }
  advance(steps = 1) {
    if (!Number.isInteger(steps) || steps < 0)
      throw new Error("Invalid daycare steps");
    for (let i = 0; i < steps; i++) {
      for (const slot of this.state.slots) {
        slot.steps++;
        if (slot.mon.level < 100) {
          slot.mon.exp++;
          this.level(slot.mon);
        }
      }
      this.state.steps = (this.state.steps + 1) & 255;
      if (
        this.state.steps !== 255 ||
        this.state.egg ||
        this.state.slots.length !== 2
      )
        continue;
      const [a, b] = this.state.slots.map((s) => s.mon),
        score = this.breeding.compatibility(a, b);
      if (score > 0 && this.breeding.rng.int(100) < score)
        this.state.egg = this.breeding.create(a, b);
    }
    return this.state.egg?.uid || null;
  }
  level(mon) {
    while (
      mon.level < 100 &&
      mon.exp >=
        experienceAt(mon.level + 1, this.db.species[mon.species].growth)
    ) {
      mon.level++;
      for (const e of this.db.species[mon.species].learnset.filter(
        (e) => e.level === mon.level,
      )) {
        if (mon.moves.some((m) => m.id === e.move)) continue;
        mon.moves.push({ id: e.move, pp: this.db.moves[e.move].pp });
        if (mon.moves.length > 4) mon.moves.shift();
      }
    }
    // Withdraw recalculates stats and heals. Deposited creatures gain moves but never evolve.
  }
  collect(party) {
    if (!this.state.egg || party.length >= 6) return { ok: false };
    const egg = this.state.egg;
    party.push(egg);
    this.state.egg = null;
    return { ok: true, uid: egg.uid };
  }
  reject() {
    if (!this.state.egg) return false;
    this.state.egg = null;
    return true;
  }
}
