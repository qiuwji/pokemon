import { experienceAt, calculateStats, healMonster } from "../model.js";
/** Deposits retain their original moves until withdrawal, so step experience cannot alter egg inheritance. */
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
      this.state.slots.some((s) => s.mon.uid === uid) ||
      party.filter((m) => !m.egg && m.hp > 0).length - (mon.hp > 0 ? 1 : 0) < 1
    )
      return { ok: false };
    party.splice(index, 1);
    this.state.slots.push({ mon, steps: 0, initialLevel: mon.level });
    return { ok: true, uid };
  }
  preview(slot) {
    const draft = structuredClone(slot.mon);
    if (draft.level < 100) {
      draft.exp = Math.min(
        experienceAt(100, this.db.species[draft.species].growth),
        draft.exp + slot.steps,
      );
      this.level(draft);
    }
    return { mon: draft, price: 100 * (1 + draft.level - slot.initialLevel) };
  }
  withdraw(party, uid, wallet) {
    const index = this.state.slots.findIndex((s) => s.mon.uid === uid),
      slot = this.state.slots[index];
    if (!slot || party.length >= 6) return { ok: false };
    const { mon: draft, price } = this.preview(slot);
    if (!Number.isInteger(wallet.money) || wallet.money < price)
      return { ok: false, reason: "零花钱不够支付培育费用。" };
    draft.stats = calculateStats(draft, this.db.species[draft.species]);
    healMonster(draft, this.db);
    Object.assign(slot.mon, draft);
    wallet.money -= price;
    this.state.slots.splice(index, 1);
    party.push(slot.mon);
    return { ok: true, uid, price };
  }
  advance(steps = 1) {
    if (
      !Number.isInteger(steps) ||
      steps < 0 ||
      steps > 100000 ||
      this.state.slots.some(
        (s) =>
          !Number.isInteger(s.steps) ||
          s.steps < 0 ||
          s.steps > 0xffffffff ||
          !this.db.species[s.mon.species],
      )
    )
      throw new Error("Invalid daycare steps");
    const counts = this.state.slots.map((s) => s.steps),
      snapshot = this.breeding.rng.snapshot?.();
    let egg = this.state.egg,
      clock = this.state.steps;
    try {
      for (let i = 0; i < steps; i++) {
        for (let j = 0; j < counts.length; j++)
          counts[j] = (counts[j] + 1) >>> 0;
        clock = (clock + 1) & 255;
        // Emerald checks the second occupied deposit's individual step counter.
        if (egg || counts.length !== 2 || (counts[1] & 255) !== 255) continue;
        const [a, b] = this.state.slots.map((s) => s.mon),
          score = this.breeding.compatibility(a, b);
        if (score > 0 && this.breeding.rng.int(100) < score)
          egg = this.breeding.create(a, b);
      }
    } catch (error) {
      if (snapshot !== undefined) this.breeding.rng.restore(snapshot);
      throw error;
    }
    this.state.slots.forEach((s, i) => (s.steps = counts[i]));
    this.state.steps = clock;
    this.state.egg = egg;
    return egg?.uid || null;
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
  }
  collect(party) {
    if (
      !this.state.egg ||
      party.length >= 6 ||
      party.some((m) => m.uid === this.state.egg.uid)
    )
      return { ok: false };
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
