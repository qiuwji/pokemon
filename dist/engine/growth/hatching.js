import { PartyTraits } from "../rules/party-traits.js";
/** The saved egg clock follows Emerald's 255 tick boundary in an unsigned 8-bit counter. */
export class HatchService {
  constructor({ abilities, heldItems, hooks = [] }) {
    Object.assign(this, { abilities, heldItems, hooks });
  }
  advance(clock, party, steps = 1) {
    if (
      !Number.isInteger(steps) ||
      steps < 0 ||
      !Number.isInteger(clock.hatchTick) ||
      clock.hatchTick < 0 ||
      clock.hatchTick > 255
    )
      throw new Error("Invalid hatch clock");
    if (
      party.some(
        (m) =>
          m.egg &&
          (!Number.isInteger(m.egg.cycles) ||
            m.egg.cycles < 0 ||
            !Array.isArray(m.egg.parents)),
      )
    )
      throw new Error("Invalid egg cycles");
    const ready = [];
    const traits = new PartyTraits({
      party,
      abilities: this.abilities,
      heldItems: this.heldItems,
      hooks: this.hooks,
    });
    const rate = traits.calculate("hatch-rate", 1, party[0] || { uid: null });
    if (!Number.isInteger(rate) || rate < 1)
      throw new Error("Invalid hatch rate");
    for (let step = 0; step < steps; step++) {
      clock.hatchTick = (clock.hatchTick + 1) & 255;
      if (clock.hatchTick !== 255) continue;
      for (const mon of party) {
        if (!mon.egg || mon.egg.ready) continue;
        if (mon.egg.cycles === 0) {
          mon.egg.ready = true;
          ready.push(mon.uid);
          break;
        }
        mon.egg.cycles = Math.max(0, mon.egg.cycles - rate);
      }
    }
    return ready;
  }
  hatch(mon) {
    if (!mon?.egg?.ready) return null;
    const egg = mon.egg;
    delete mon.egg;
    mon.friendship = 120;
    mon.hp = mon.stats.hp;
    mon.status = null;
    return {
      kind: "hatch",
      uid: mon.uid,
      species: mon.species,
      parents: [...egg.parents],
    };
  }
}
