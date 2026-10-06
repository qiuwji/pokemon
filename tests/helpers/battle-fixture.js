import { loadContentSync } from "../../tools/content-io.mjs";
import { createBag } from "./inventory-fixture.js";
import { Battle } from "../../src/engine/battle.js";
import { Random, createMonster } from "../../src/engine/model.js";
import { GEN3_ABILITIES } from "../../src/engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../../src/engine/rules/gen3/held-items.js";
const base = loadContentSync();
/** Real creature values and complete default attachments; individual tests override only relevant rules. */
export function battleFixture({
  moves = {},
  format = "singles",
  hooks = [],
  rules = {},
  states = {},
} = {}) {
  const definitions = Object.fromEntries(
    Object.entries(moves).map(([id, value]) => [
      id,
      {
        name: id,
        effect: id,
        type: "normal",
        power: 0,
        accuracy: 100,
        pp: 20,
        priority: 0,
        chance: 0,
        target: "selected",
        ...value,
      },
    ]),
  );
  const db = { ...base, moves: { ...base.moves, ...definitions } },
    rng = new Random(231);
  const make = (species) => createMonster(species, 30, db, rng);
  const p = make("treecko"),
    r = make("mudkip"),
    e = make("zigzagoon"),
    er = make("poochyena");
  const b = new Battle({
    party: [p, r],
    enemyParty: [e, er],
    format,
    db,
    rng,
    trainer: true,
    bag: createBag({}),
    traits: { abilities: GEN3_ABILITIES, heldItems: GEN3_HELD_ITEMS, hooks },
    rules: {
      accuracy: () => true,
      critical: () => false,
      damage: () => ({ amount: 6, type: 1, critical: false }),
      grantExperience: () => [],
      ...rules,
    },
    states,
  });
  const use = (
    seat,
    id,
    target = seat === b.homeSeat ? b.awaySeat : b.homeSeat,
  ) => {
    b.roster.occupant(seat).moves = [{ id, pp: 20 }];
    b.executeMove(seat, 0, { kind: "seat", id: target });
  };
  return { b, p, r, e, er, db, rng, use };
}
