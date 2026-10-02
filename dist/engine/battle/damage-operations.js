import { SPECIES_WEIGHTS } from "../rules/gen3/reference-metadata.js";
const failed = (c) => {
  c.successful = false;
  c.skipDamage = true;
  c.emit("没有效果。", "failed");
};
/** Damage preparation only. Actual HP impacts and events remain in MoveExecutor. */
export const DAMAGE_OPERATIONS = {
  fixedDamage(c, s) {
    const values = {
      constant: () => s.amount,
      level: () => c.mon.level,
      half: () => Math.max(1, Math.floor(c.opponent.hp / 2)),
      endeavor: () => c.opponent.hp - c.mon.hp,
      psywave: () =>
        Math.max(
          1,
          Math.floor((c.mon.level * (50 + c.battle.rng.int(101))) / 100),
        ),
    };
    c.fixedDamage = values[s.mode]();
    if (c.fixedDamage <= 0) failed(c);
  },
  variablePower(c, s) {
    const m = c.mon;
    const methods = {
      flail: () => {
        const f = Math.floor((m.hp * 48) / m.stats.hp);
        return [
          [1, 200],
          [4, 150],
          [9, 100],
          [16, 80],
          [32, 40],
          [48, 20],
        ].find(([limit]) => f <= limit)[1];
      },
      return: () => Math.max(1, Math.floor(((m.friendship ?? 70) * 10) / 25)),
      frustration: () =>
        Math.max(1, Math.floor(((255 - (m.friendship ?? 70)) * 10) / 25)),
      eruption: () => Math.max(1, Math.floor((150 * m.hp) / m.stats.hp)),
      facade: () =>
        c.power * (["poison", "burn", "paralysis"].includes(m.status) ? 2 : 1),
      weight: () => {
        const w =
          c.battle.db.species[c.opponent.species].weight ??
          SPECIES_WEIGHTS[c.opponent.species];
        if (!Number.isFinite(w))
          throw new Error("Species weight metadata required");
        return w < 100
          ? 20
          : w < 250
            ? 40
            : w < 500
              ? 60
              : w < 1000
                ? 80
                : w < 2000
                  ? 100
                  : 120;
      },
    };
    c.power = methods[s.mode]();
  },
  hiddenPower(c) {
    const order = ["hp", "atk", "def", "spe", "spa", "spd"];
    const bits = (bit) =>
      order.reduce((v, k, i) => v | (((c.battle.forms.effective(c.mon).iv[k] >> bit) & 1) << i), 0);
    c.power = Math.floor((40 * bits(1)) / 63) + 30;
    const types = [
      "fighting",
      "flying",
      "poison",
      "ground",
      "rock",
      "bug",
      "ghost",
      "steel",
      "fire",
      "water",
      "grass",
      "electric",
      "psychic",
      "ice",
      "dragon",
      "dark",
    ];
    c.move.type = types[Math.floor((15 * bits(0)) / 63)];
  },
  stockpileDamage(c) {
    const r = c.battle.states.lookup("stockpile", c.actorSeat);
    if (!r) {
      failed(c);
      return;
    }
    c.baseMultiplier = r.data.count;
  },
  clearStockpile(c) {
    const r = c.battle.states.lookup("stockpile", c.actorSeat);
    if (r) c.battle.states.remove(r.key, "consumed");
  },
  minimizePower(c) {
    if (c.battle.states.lookup("minimize", c.targetSeat)) c.power *= 2;
  },
  breakScreens(c) {
    for (const id of ["reflect", "light_screen"]) {
      const r = c.battle.states.lookup(id, c.targetSeat);
      if (r) c.battle.states.remove(r.key, "broken");
    }
  },
};
DAMAGE_OPERATIONS.fixedDamage.validate = (s) => {
  if (
    !["constant", "level", "half", "endeavor", "psywave"].includes(s.mode) ||
    (s.mode === "constant" && (!Number.isInteger(s.amount) || s.amount < 1))
  )
    throw new Error("Invalid fixed damage");
};
DAMAGE_OPERATIONS.variablePower.validate = (s) => {
  if (
    ![
      "flail",
      "return",
      "frustration",
      "eruption",
      "facade",
      "weight",
    ].includes(s.mode)
  )
    throw new Error("Invalid power mode");
};
DAMAGE_OPERATIONS.hiddenPower.scope = "action";
DAMAGE_OPERATIONS.clearStockpile.scope = "action";
