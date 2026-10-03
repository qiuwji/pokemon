import { createMonster } from "./model.js";
import { teamRoster } from "./battle/roster.js";
const identifier = (id) =>
  typeof id === "string" && /^[a-zA-Z0-9_.:-]+$/.test(id);

/** Content validation is independent of field/story/UI. Creation happens only after all references resolve. */
export function validateTrainers(
  definitions,
  db,
  strategies = null,
  inventory = null,
) {
  const team = (members, path) => {
    if (!Array.isArray(members) || !members.length || members.length > 6)
      throw new Error(`Invalid trainer party ${path}`);
    for (const member of members) {
      if (
        !member ||
        Object.keys(member).some(
          (k) =>
            !["species", "level", "moves", "ability", "heldItem"].includes(k),
        ) ||
        !db.species[member.species] ||
        !Number.isInteger(member.level) ||
        member.level < 1 ||
        member.level > 100
      )
        throw new Error(`Invalid trainer member ${path}`);
      if (
        member.moves !== undefined &&
        (!Array.isArray(member.moves) ||
          !member.moves.length ||
          member.moves.length > 4 ||
          new Set(member.moves).size !== member.moves.length ||
          member.moves.some((id) => !db.moves[id]))
      )
        throw new Error(`Invalid trainer moves ${path}`);
      if (member.ability !== undefined && !db.abilities?.[member.ability])
        throw new Error(`Unknown trainer ability ${path}`);
      if (member.heldItem !== undefined && !db.heldItems?.[member.heldItem])
        throw new Error(`Unknown trainer item ${path}`);
    }
  };
  const strategy = (value) => {
    if (
      value !== undefined &&
      (!identifier(value) || (strategies && !strategies.has(value)))
    )
      throw new Error("Unknown trainer strategy");
  };
  for (const [id, t] of Object.entries(definitions)) {
    if (
      !identifier(id) ||
      !t ||
      Object.keys(t).some(
        (k) =>
          ![
            "name",
            "script",
            "prize",
            "format",
            "requiresPartners",
            "party",
            "rivals",
            "strategy",
            "actor",
            "bag",
          ].includes(k),
      ) ||
      typeof t.name !== "string" ||
      !t.name ||
      typeof t.script !== "string" ||
      !t.script ||
      !Number.isSafeInteger(t.prize) ||
      t.prize < 0 ||
      (t.format !== undefined && !["singles", "doubles"].includes(t.format)) ||
      (t.requiresPartners !== undefined &&
        (!Number.isInteger(t.requiresPartners) ||
          t.requiresPartners < 1 ||
          t.requiresPartners > 6)) ||
      (t.actor !== undefined && !db.actors?.[t.actor])
    )
      throw new Error(`Invalid trainer ${id}`);
    if (
      t.bag !== undefined &&
      (!t.bag ||
        typeof t.bag !== "object" ||
        Array.isArray(t.bag) ||
        Object.entries(t.bag).some(
          ([item, count]) =>
            !db.items?.[item] || !Number.isSafeInteger(count) || count < 1,
        ))
    )
      throw new Error("Invalid trainer inventory");
    if (inventory && t.bag) inventory.create(t.bag);
    team(t.party, id);
    strategy(t.strategy);
    if (
      t.rivals !== undefined &&
      (!Array.isArray(t.rivals) || t.rivals.length > 6)
    )
      throw new Error("Invalid rival ID or sides");
    const sides = new Set(["home", "away"]);
    for (const rival of t.rivals || []) {
      if (
        !rival ||
        Object.keys(rival).some(
          (k) => !["id", "name", "party", "strategy"].includes(k),
        ) ||
        !identifier(rival.id) ||
        sides.has(rival.id) ||
        typeof rival.name !== "string" ||
        !rival.name
      )
        throw new Error("Invalid rival ID or side");
      sides.add(rival.id);
      team(rival.party, rival.id);
      strategy(rival.strategy);
    }
  }
}
export function createTrainerTeam(trainer, db, rng) {
  validateTrainers(
    {
      selected: {
        ...trainer,
        script: trainer.script || "trainer",
        prize: trainer.prize ?? 0,
      },
    },
    db,
  );
  const seed = rng.snapshot();
  try {
    return trainer.party.map(({ species, level, moves, ability, heldItem }) => {
      const mon = createMonster(species, level, db, rng, { trainer: true });
      if (moves) mon.moves = moves.map((id) => ({ id, pp: db.moves[id].pp }));
      if (ability) mon.ability = ability;
      if (heldItem) mon.heldItem = heldItem;
      return mon;
    });
  } catch (error) {
    rng.restore(seed);
    throw error;
  }
}
export function createTrainerEncounter(
  trainer,
  { party, bag, db, rng, strategies, inventory },
) {
  if (!inventory)
    throw new Error("Trainer encounters require an inventory service");
  validateTrainers({ selected: trainer }, db, strategies, inventory);
  const seats = trainer.format === "doubles" ? 2 : 1;
  if (
    party.filter((m) => m.hp > 0 && !m.egg).length <
    (trainer.requiresPartners || seats)
  )
    throw new Error("需要两位还能战斗的伙伴才能参加这场挑战。");
  const seed = rng.snapshot();
  try {
    const enemyParty = createTrainerTeam(trainer, db, rng),
      topology = teamRoster(party, enemyParty, bag, seats);
    topology.sides[1].controllers[0].bag = inventory.create(trainer.bag || {});
    topology.sides[1].controllers[0].strategy = trainer.strategy || "random";
    for (const rival of trainer.rivals || []) {
      const members = createTrainerTeam(
          { name: rival.name, party: rival.party },
          db,
          rng,
        ),
        controllerId = `${rival.id}:controller`;
      topology.sides.push({
        id: rival.id,
        allianceId: rival.id,
        controllers: [
          {
            id: controllerId,
            kind: "ai",
            party: members,
            strategy: rival.strategy || "random",
          },
        ],
        seats: Array.from(
          { length: Math.min(seats, members.length) },
          (_, i) => ({ id: `${rival.id}:${i}`, controllerId }),
        ),
      });
    }
    return {
      enemyParty,
      topology,
      trainer: true,
      script: trainer.script,
      format: trainer.format || "singles",
      ...(strategies ? { ai: (b, seat) => strategies.decide(b, seat) } : {}),
    };
  } catch (error) {
    rng.restore(seed);
    throw error;
  }
}
