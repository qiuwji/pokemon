import { loadContentSync } from "../tools/content-io.mjs";
import { createBag } from "./helpers/inventory-fixture.js";
import test from "node:test";
import assert from "node:assert/strict";
import { Battle } from "../src/engine/battle.js";
import { Random, createMonster } from "../src/engine/model.js";
import { BATTLE_RULES } from "../src/engine/battle-rules.js";
import { GEN3_ABILITIES } from "../src/engine/rules/gen3/abilities.js";
import { GEN3_HELD_ITEMS } from "../src/engine/rules/gen3/held-items.js";
import { HELD_ITEM_METADATA } from "../generated/engine/rules/gen3/held-catalog.js";
const original = loadContentSync();
function setup({
  ability = "overgrow",
  enemyAbility = "pickup",
  item = null,
  enemyItem = null,
  move = "tackle",
  trainer = true,
  extraMoves = {},
  format = "singles",
} = {}) {
  const db = { ...original, moves: { ...original.moves, ...extraMoves } },
    rng = new Random(751);
  const p = createMonster("treecko", 30, db, rng),
    e = createMonster("zigzagoon", 30, db, rng),
    r = createMonster("mudkip", 30, db, rng),
    er = createMonster("poochyena", 30, db, rng);
  Object.assign(p, {
    ability,
    heldItem: item,
    moves: [{ id: move, pp: db.moves[move].pp }],
  });
  Object.assign(e, { ability: enemyAbility, heldItem: enemyItem });
  const b = new Battle({
    party: [p, r],
    enemyParty: [e, er],
    db,
    rng,
    bag: createBag({}),
    trainer,
    format,
    rules: {
      critical: () => false,
      accuracy: () => true,
      grantExperience: () => [],
      damage: () => ({ amount: 4, type: 1, critical: false }),
    },
  });
  return { b, p, e, r, er, db, rng };
}
const ctx = (b) => ({
  actorSeat: b.homeSeat,
  targetSeat: b.awaySeat,
  move: { type: "normal", power: 50 },
  stat: "atk",
});
for (const [ability, phase, value, expected, stat, type] of [
  ["huge_power", "attack", 11, 22, "atk", "normal"],
  ["pure_power", "attack", 11, 22, "atk", "normal"],
  ["guts", "attack", 11, 16, "atk", "normal"],
  ["hustle", "attack", 11, 16, "atk", "normal"],
  ["marvel_scale", "defense", 11, 16, "def", "normal"],
  ["thick_fat", "attack", 11, 5, "spa", "fire"],
  ["overgrow", "power", 35, 52, "atk", "grass"],
  ["blaze", "power", 35, 52, "atk", "fire"],
  ["torrent", "power", 35, 52, "atk", "water"],
  ["swarm", "power", 35, 52, "atk", "bug"],
  ["compound_eyes", "accuracy", 33, 42, "atk", "normal"],
  ["hustle", "accuracy", 33, 26, "atk", "normal"],
  ["serene_grace", "secondary-chance", 30, 60, "atk", "normal"],
  ["pressure", "pp-cost", 1, 2, "atk", "normal"],
])
  test(`Gen III numeric ${ability}/${phase} uses integer source arithmetic`, () => {
    const isTarget = ["marvel_scale", "thick_fat", "pressure"].includes(
      ability,
    );
    const { b, p, e } = setup(
      isTarget ? { enemyAbility: ability } : { ability },
    );
    p.status = e.status = "poison";
    p.hp = e.hp = 1;
    assert.equal(
      b.traits.calculate(phase, value, {
        ...ctx(b),
        stat,
        move: { type, power: 35 },
      }),
      expected,
    );
  });
for (const [ability, status] of [
  ["limber", "paralysis"],
  ["insomnia", "sleep"],
  ["vital_spirit", "sleep"],
  ["immunity", "poison"],
  ["magma_armor", "freeze"],
  ["water_veil", "burn"],
])
  test(`${ability} prevents its status, and cures it on re-entry`, () => {
    const { b, e } = setup({ enemyAbility: ability });
    assert.equal(
      b.applyStatus(b.awaySeat, status, { sourceSeat: b.homeSeat }),
      false,
    );
    e.status = status;
    e.sleep = 3;
    b.traits.enter(b.awaySeat);
    assert.equal(e.status, null);
  });
for (const [ability, key] of [
  ["clear_body", "def"],
  ["white_smoke", "spe"],
  ["keen_eye", "acc"],
  ["hyper_cutter", "atk"],
])
  test(`${ability} rejects hostile drops while allowing self-inflicted changes`, () => {
    const { b } = setup({ enemyAbility: ability });
    assert.equal(
      b.changeStage(b.awaySeat, key, -1, { sourceSeat: b.homeSeat }),
      false,
    );
    assert.equal(b.changeStage(b.awaySeat, key, -1), true);
  });
test("Ability immunities keep statuses, flinch, attraction and secondary effects in independent phases", () => {
  const { b, p, e } = setup({ enemyAbility: "own_tempo" });
  assert.equal(b.applyConfusion(b.awaySeat, b.homeSeat), false);
  e.ability = "inner_focus";
  assert.equal(b.applyFlinch(b.awaySeat, b.homeSeat), false);
  e.ability = "oblivious";
  p.gender = "♂";
  e.gender = "♀";
  assert.equal(b.applyAttraction(b.awaySeat, b.homeSeat), false);
  e.ability = "shield_dust";
  const s = { ...ctx(b), allowed: true };
  b.traits.run("secondary", s);
  assert.equal(s.allowed, false);
});
for (const [ability, status] of [
  ["static", "paralysis"],
  ["poison_point", "poison"],
  ["flame_body", "burn"],
])
  test(`${ability} responds to contact but not non-contact hits`, () => {
    const { b, p } = setup({ enemyAbility: ability });
    b.rng.next = () => 0;
    b.traits.run("after-hit", { ...ctx(b), amount: 4 });
    assert.equal(p.status, null);
    b.traits.run("contact", { ...ctx(b), amount: 4 });
    assert.equal(p.status, status);
  });
test("Effect Spore and Cute Charm delegate to status and attraction permissions", () => {
  const { b, p, e } = setup({ enemyAbility: "effect_spore" });
  b.rng.next = () => 0;
  b.rng.int = () => 0;
  b.traits.run("contact", { ...ctx(b), amount: 4 });
  assert.equal(p.status, "poison");
  e.ability = "cute_charm";
  p.gender = "♂";
  e.gender = "♀";
  b.traits.run("contact", { ...ctx(b), amount: 4 });
  assert.equal(b.conditions.get(b.homeSeat).attractedTo, e.uid);
});
for (const ability of ["battle_armor", "shell_armor"])
  test(`${ability} blocks critical permission without changing ordinary damage`, () => {
    const { b } = setup({ enemyAbility: ability });
    const c = { ...ctx(b), allowed: true };
    b.traits.run("critical-check", c);
    assert.equal(c.allowed, false);
  });
for (const [ability, weather] of [
  ["drizzle", "rain"],
  ["drought", "sun"],
  ["sand_stream", "sand"],
])
  test(`${ability} sets indefinite weather on entry`, () => {
    const { b } = setup({ ability });
    assert.deepEqual(b.weather, { kind: weather, turns: null });
  });
test("Speed doubles before stages, then held-item halving and paralysis use separate integer boundaries", () => {
  const { b, p } = setup({ ability: "swift_swim", item: "macho_brace" });
  p.stats.spe = 11;
  p.status = "paralysis";
  b.weather = { kind: "rain" };
  b.conditions.get(b.homeSeat).stages.spe = -1;
  assert.equal(b.speed(p, b.homeSeat), 1);
  p.heldItem = null;
  p.status = null;
  assert.equal(b.speed(p, b.homeSeat), 14);
  p.ability = "chlorophyll";
  b.weather.kind = "sun";
  assert.equal(b.speed(p, b.homeSeat), 14);
});
test("Accuracy floors stages before abilities and evasion items; immunity does not heal behind Protect", () => {
  let observed;
  BATTLE_RULES.accuracy({
    move: { accuracy: 50 },
    stages: -1,
    rng: { int: () => 99 },
    modifier: (v) => {
      observed = v;
      return v;
    },
  });
  assert.equal(observed, 37);
  const { b, e } = setup({
    ability: "hustle",
    enemyAbility: "sand_veil",
    enemyItem: "bright_powder",
  });
  b.weather = { kind: "sand" };
  assert.equal(b.traits.calculate("accuracy", 37, ctx(b)), 20);
  e.ability = "water_absorb";
  e.hp = 10;
  b.conditions.get(b.awaySeat).protected = true;
  const c = b.moves.context(
    b.homeSeat,
    b.awaySeat,
    { type: "water", power: 50, accuracy: 100 },
    {},
  );
  assert.equal(b.moves.hits(c), false);
  assert.equal(e.hp, 10);
});
test("Choice Band floors before Hustle, and Thick Fat before Plus/Minus", () => {
  const { b, p, e } = setup({ ability: "hustle", item: "choice_band" });
  assert.equal(b.traits.calculate("attack", 11, ctx(b)), 24);
  p.ability = "plus";
  e.ability = "minus";
  assert.equal(
    b.traits.calculate("attack", 11, { ...ctx(b), stat: "spa" }),
    16,
  );
  e.ability = "thick_fat";
  const r = b.roster.owner(b.awaySeat).party[1];
  r.ability = "minus"; // Benched Minus must not boost.
  assert.equal(
    b.traits.calculate("attack", 11, {
      ...ctx(b),
      stat: "spa",
      move: { type: "fire" },
    }),
    5,
  );
});
test("Flash Fire remembers the boost for fire only; Color Change changes projected types until leave", () => {
  const { b, e } = setup({ enemyAbility: "flash_fire" });
  const c = { ...ctx(b), move: { type: "fire", power: 50 }, allowed: true };
  b.traits.run("immunity", c);
  assert.equal(c.allowed, false);
  assert.equal(
    b.traits.calculate("base-damage", 11, {
      actorSeat: b.awaySeat,
      targetSeat: b.homeSeat,
      move: { type: "fire" },
    }),
    16,
  );
  e.ability = "color_change";
  b.traits.run("after-hit", { ...ctx(b), amount: 4, move: { type: "water" } });
  assert.deepEqual(b.traits.types(b.awaySeat), ["water"]);
  b.actions.switch(b.awaySeat, 1);
  assert.deepEqual(
    b.traits.types(b.awaySeat),
    original.species.poochyena.types,
  );
});
test("Wonder Guard blocks neutral damaging hits but allows weaknesses and status; Soundproof uses imported flags", () => {
  const { b } = setup({ enemyAbility: "wonder_guard" });
  for (const [type, power, allowed] of [
    ["normal", 50, false],
    ["fighting", 50, true],
    ["normal", 0, true],
  ]) {
    const c = { ...ctx(b), move: { type, power }, allowed: true };
    b.traits.run("immunity", c);
    assert.equal(c.allowed, allowed);
  }
  b.enemy.ability = "soundproof";
  const c = { ...ctx(b), move: { sound: true }, allowed: true };
  b.traits.run("immunity", c);
  assert.equal(c.allowed, false);
  assert.equal(original.moves.growl.sound, true);
  assert.equal(original.moves.tackle.sound, false);
});
test("Truant alternates without PP loss, Early Bird decreases the sleep counter twice, and Speed Boost skips its entry turn", () => {
  const { b, p } = setup({ ability: "truant" });
  b.executeMove(0, 0);
  const pp = p.moves[0].pp;
  b.executeMove(0, 0);
  assert.equal(p.moves[0].pp, pp);
  b.executeMove(0, 0);
  assert.equal(p.moves[0].pp, pp - 1);
  p.ability = "early_bird";
  p.status = "sleep";
  p.sleep = 2;
  b.executeMove(0, 0);
  assert.equal(p.status, null);
  p.ability = "speed_boost";
  b.traits.run("round-end", { ownerSeat: b.homeSeat });
  assert.equal(b.conditions.get(b.homeSeat).stages.spe, undefined);
  b.turn = 1;
  b.traits.run("round-end", { ownerSeat: b.homeSeat });
  assert.equal(b.conditions.get(b.homeSeat).stages.spe, 1);
});
test("Rain Dish, Shed Skin and Sand Veil residual rules respect weather suppression and living owners", () => {
  const { b, p, e } = setup({ ability: "rain_dish" });
  b.weather = { kind: "rain" };
  p.hp = 10;
  b.traits.run("round-end", { ownerSeat: b.homeSeat });
  assert.equal(p.hp, 10 + Math.max(1, Math.floor(p.stats.hp / 16)));
  e.ability = "air_lock";
  const before = p.hp;
  b.traits.run("round-end", { ownerSeat: b.homeSeat });
  assert.equal(p.hp, before);
  p.ability = "shed_skin";
  p.status = "poison";
  b.rng.next = () => 0;
  b.traits.run("round-end", { ownerSeat: b.homeSeat });
  assert.equal(p.status, null);
  p.ability = "sand_veil";
  e.ability = "pickup";
  b.weather.kind = "sand";
  const c = { actorSeat: b.homeSeat, weather: "sand", allowed: true };
  b.traits.run("weather-immunity", c);
  assert.equal(c.allowed, false);
});
for (const [ability, type, free] of [
  ["shadow_tag", "normal", false],
  ["magnet_pull", "steel", false],
  ["magnet_pull", "normal", true],
  ["arena_trap", "flying", true],
  ["arena_trap", "normal", false],
])
  test(`${ability} switch boundary for ${type}`, () => {
    const { b, p } = setup({ enemyAbility: ability });
    b.conditions.get(b.homeSeat).types = [type];
    const c = { actorSeat: b.homeSeat, allowed: true };
    b.traits.run("switch-check", c);
    assert.equal(c.allowed, free);
    if (ability === "arena_trap") {
      p.ability = "levitate";
      c.allowed = true;
      b.traits.run("switch-check", c);
      assert.equal(c.allowed, true);
    }
  });
test("Sticky Hold blocks only transfer; Roar respects Suction Cups; Damp spends PP and prevents self-destruction", () => {
  const { b, p, e } = setup({
    move: "thief",
    enemyAbility: "sticky_hold",
    enemyItem: "leftovers",
  });
  const hp = e.hp;
  b.executeMove(0, 0);
  assert.equal(e.hp, hp - 4);
  assert.equal(e.heldItem, "leftovers");
  assert.equal(p.heldItem, null);
  e.ability = "pickup";
  b.executeMove(0, 0);
  assert.equal(p.heldItem, "leftovers");
  assert.equal(e.heldItem, null);
  const a = setup({ move: "roar", enemyAbility: "suction_cups" });
  a.b.executeMove(0, 0);
  assert.equal(a.b.enemy.uid, a.e.uid);
  a.e.ability = "pickup";
  a.b.executeMove(0, 0);
  assert.equal(a.b.enemy.uid, a.er.uid);
  const x = setup({ move: "explosion", enemyAbility: "damp" });
  const pp = x.p.moves[0].pp;
  x.b.executeMove(0, 0);
  assert.equal(x.p.hp, x.p.stats.hp);
  assert.equal(x.p.moves[0].pp, pp - 1);
  x.e.ability = "pickup";
  x.b.executeMove(0, 0);
  assert.equal(x.p.hp, 0);
});
test("Sturdy blocks Gen III OHKO but has no full-HP survival rule", () => {
  const custom = {
    name: "断头台",
    effect: "ohko",
    type: "normal",
    power: 1,
    accuracy: 100,
    pp: 5,
    priority: 0,
  };
  const { b, e } = setup({
    move: "custom",
    enemyAbility: "sturdy",
    extraMoves: { custom },
  });
  b.rng.int = () => 0;
  b.executeMove(0, 0);
  assert.equal(e.hp, e.stats.hp);
  e.ability = "pickup";
  b.executeMove(0, 0);
  assert.equal(e.hp, 0);
});
for (const [id, meta] of Object.entries(HELD_ITEM_METADATA).filter(([, v]) =>
  v.holdEffect.endsWith("_power"),
))
  test(`${id} boosts its matching raw attack and leaves other types unchanged`, () => {
    const { b } = setup({ item: id }),
      type = meta.holdEffect.replace("_power", "");
    assert.equal(
      b.traits.calculate("attack", 11, { ...ctx(b), move: { type } }),
      id === "sea_incense" ? 11 : 12,
    );
    assert.equal(
      b.traits.calculate("attack", 11, {
        ...ctx(b),
        move: { type: type === "water" ? "fire" : "water" },
      }),
      11,
    );
  });
for (const [id, status] of [
  ["cheri_berry", "paralysis"],
  ["chesto_berry", "sleep"],
  ["pecha_berry", "poison"],
  ["rawst_berry", "burn"],
  ["aspear_berry", "freeze"],
  ["lum_berry", "poison"],
])
  test(`${id} immediately cures its status once`, () => {
    const { b, e } = setup({ enemyItem: id });
    assert.equal(
      b.applyStatus(b.awaySeat, status, { sourceSeat: b.homeSeat }),
      true,
    );
    assert.equal(e.status, null);
    assert.equal(e.heldItem, null);
  });
test("Lum, Persim, Mental and White Herb react immediately at their own applied phase", () => {
  for (const id of ["lum_berry", "persim_berry"]) {
    const { b, e } = setup({ enemyItem: id });
    assert.equal(b.applyConfusion(b.awaySeat, b.homeSeat), true);
    assert.equal(b.conditions.get(b.awaySeat).confused, 0);
    assert.equal(e.heldItem, null);
  }
  const { b, p, e } = setup({ enemyItem: "mental_herb" });
  p.gender = "♂";
  e.gender = "♀";
  b.applyAttraction(b.awaySeat, b.homeSeat);
  assert.equal(b.conditions.get(b.awaySeat).attractedTo, null);
  assert.equal(e.heldItem, null);
  e.heldItem = "white_herb";
  b.changeStage(b.awaySeat, "atk", -1, { sourceSeat: b.homeSeat });
  assert.equal(b.conditions.get(b.awaySeat).stages.atk, 0);
  assert.equal(e.heldItem, null);
});
for (const [id, key] of [
  ["liechi_berry", "atk"],
  ["ganlon_berry", "def"],
  ["salac_berry", "spe"],
  ["petaya_berry", "spa"],
  ["apicot_berry", "spd"],
])
  test(`${id} consumes before raising a stat, avoiding reentrant activations`, () => {
    const { b, p } = setup();
    p.hp = 1;
    p.heldItem = id;
    b.traits.run("after-action", { actorSeat: b.homeSeat });
    assert.equal(p.heldItem, null);
    assert.equal(b.conditions.get(b.homeSeat).stages[key], 1);
    assert.equal(b.events.filter((e) => e.kind === "item").length, 1);
  });
for (const [id, , nature] of [
  ["figy_berry", "atk", 5],
  ["wiki_berry", "spa", 3],
  ["mago_berry", "spe", 2],
  ["aguav_berry", "spd", 4],
  ["iapapa_berry", "def", 1],
])
  test(`${id} heals and confuses a nature that dislikes its flavor`, () => {
    const { b, p } = setup();
    p.hp = 1;
    p.heldItem = id;
    p.nature = nature;
    b.traits.run("after-action", { actorSeat: b.homeSeat });
    assert.equal(p.hp, 1 + Math.floor(p.stats.hp / 8));
    assert(b.conditions.get(b.homeSeat).confused > 0);
    assert.equal(p.heldItem, null);
  });
test("Leppa, Lansat and Starf restore PP, add focus or raise one non-maxed stat once", () => {
  const { b, p } = setup();
  p.moves[0].pp = 0;
  p.heldItem = "leppa_berry";
  b.traits.run("after-action", { actorSeat: b.homeSeat });
  assert.equal(p.moves[0].pp, 10);
  assert.equal(p.heldItem, null);
  p.hp = 1;
  p.heldItem = "lansat_berry";
  b.traits.run("after-action", { actorSeat: b.homeSeat });
  assert.equal(b.conditions.get(b.homeSeat).focus, true);
  p.heldItem = "starf_berry";
  b.traits.run("after-action", { actorSeat: b.homeSeat });
  assert.equal(
    Object.values(b.conditions.get(b.homeSeat).stages).reduce(
      (n, v) => n + v,
      0,
    ),
    2,
  );
  assert.equal(p.heldItem, null);
});
test("Quick Claw cannot defeat move priority; Focus Band survives a lethal hit; Kings Rock respects Inner Focus", () => {
  const { b, p, e } = setup({ item: "quick_claw" });
  p.stats.spe = 1;
  e.stats.spe = 100;
  b.rng.int = () => 0;
  const home = { seat: b.homeSeat, kind: "move", index: 0 },
    away = { seat: b.awaySeat, kind: "move", index: 0 };
  e.moves[0] = { id: "quick_attack", pp: 30 };
  assert.equal(b.rounds.order([home, away])[0].seat, b.awaySeat);
  e.moves[0].id = "tackle";
  assert.equal(b.rounds.order([home, away])[0].seat, b.homeSeat);
  e.heldItem = "focus_band";
  b.rng.next = () => 0;
  const lethal = { ...ctx(b), amount: e.hp };
  b.traits.run("damage", lethal);
  assert.equal(lethal.amount, e.hp - 1);
  p.heldItem = "kings_rock";
  e.ability = "inner_focus";
  b.traits.run("after-hit", {
    ...ctx(b),
    amount: 4,
    opponent: e,
    move: { flags: ["FLAG_KINGS_ROCK_AFFECTED"] },
  });
  assert.equal(b.conditions.get(b.awaySeat).flinched, false);
  e.ability = "pickup";
  b.traits.run("after-hit", {
    ...ctx(b),
    amount: 4,
    opponent: e,
    move: { flags: ["FLAG_KINGS_ROCK_AFFECTED"] },
  });
  assert.equal(b.conditions.get(b.awaySeat).flinched, true);
});
for (const [id, species, phase, stat, expected] of [
  ["deep_sea_tooth", "clamperl", "attack", "spa", 22],
  ["deep_sea_scale", "clamperl", "defense", "spd", 22],
  ["light_ball", "pikachu", "attack", "spa", 22],
  ["metal_powder", "ditto", "defense", "def", 22],
  ["thick_club", "cubone", "attack", "atk", 22],
  ["soul_dew", "latias", "attack", "spa", 16],
  ["soul_dew", "latios", "defense", "spd", 16],
])
  test(`${id} applies only to its supported species and stat`, () => {
    const { b, p, e } = setup({
      item: phase === "attack" ? id : null,
      enemyItem: phase === "defense" ? id : null,
    });
    const owner = phase === "attack" ? p : e;
    owner.species = species;
    assert.equal(b.traits.calculate(phase, 11, { ...ctx(b), stat }), expected);
    owner.species = "treecko";
    assert.equal(b.traits.calculate(phase, 11, { ...ctx(b), stat }), 11);
  });
test("Critical held items use species restrictions, Smoke Ball and Run Away bypass traps, Amulet Coin applies once", () => {
  const { b, p, e } = setup({ item: "scope_lens" });
  assert.equal(b.traits.calculate("critical-stage", 0, ctx(b)), 1);
  p.heldItem = "lucky_punch";
  p.species = "chansey";
  assert.equal(b.traits.calculate("critical-stage", 0, ctx(b)), 2);
  p.species = "treecko";
  assert.equal(b.traits.calculate("critical-stage", 0, ctx(b)), 0);
  p.heldItem = "stick";
  p.species = "farfetchd";
  assert.equal(b.traits.calculate("critical-stage", 0, ctx(b)), 2);
  p.species = "treecko";
  e.ability = "shadow_tag";
  for (const [held, ability] of [
    ["smoke_ball", "overgrow"],
    [null, "run_away"],
  ]) {
    p.heldItem = held;
    p.ability = ability;
    const c = { actorSeat: b.homeSeat, allowed: true, guaranteed: false };
    b.traits.run("escape-check", c);
    assert.equal(c.guaranteed, true);
  }
  p.heldItem = "amulet_coin";
  b.traits.enter(b.homeSeat);
  b.traits.enter(b.homeSeat);
  assert.equal(b.prizeMultiplier, 2);
});

test("Lightning Rod redirects to an opposing seat without granting electric immunity, retaining a chosen rod target", () => {
  const { b, p, e, er } = setup({ format: "doubles" });
  er.ability = "lightning_rod";
  const c = {
    actorSeat: b.homeSeat,
    move: { type: "electric", effect: "hit", target: "selected", power: 20 },
    targetSeats: [b.awaySeat],
  };
  b.traits.run("target-selection", c);
  assert.deepEqual(c.targetSeats, ["away:1"]);
  const immunity = {
    actorSeat: b.homeSeat,
    targetSeat: "away:1",
    move: c.move,
    allowed: true,
  };
  b.traits.run("immunity", immunity);
  assert.equal(immunity.allowed, true);
  e.ability = "lightning_rod";
  c.targetSeats = [b.awaySeat];
  c.redirected = false;
  b.traits.run("target-selection", c);
  assert.deepEqual(c.targetSeats, [b.awaySeat]);
  p.ability = "lightning_rod";
  er.ability = e.ability = "pickup";
  c.targetSeats = [b.awaySeat];
  c.redirected = false;
  b.traits.run("target-selection", c);
  assert.deepEqual(c.targetSeats, [b.awaySeat]);
});

for (const [ability, type] of [
  ["volt_absorb", "electric"],
  ["water_absorb", "water"],
])
  test(`${ability} heals damaging hits but does not absorb a status move`, () => {
    const { b, e } = setup({ enemyAbility: ability });
    e.hp = 1;
    const c = { ...ctx(b), move: { type, power: 20 }, allowed: true };
    b.traits.run("immunity", c);
    assert.equal(c.allowed, false);
    assert.equal(e.hp, 1 + Math.floor(e.stats.hp / 4));
    c.allowed = true;
    c.move.power = 0;
    b.traits.run("immunity", c);
    assert.equal(c.allowed, true);
  });

test("A new held item reuses a canonical effect with its own parameter and no canonical-ID lookup", () => {
  const { b } = setup();
  const remove = b.traits.pipeline.register({
    id: "test-entry",
    phase: "entry",
    apply: () => {},
  });
  remove();
  // Construct through the public attachment injection instead of patching a canonical global table.
  const rng = new Random(18),
    mon = createMonster("treecko", 15, original, rng),
    enemy = createMonster("zigzagoon", 15, original, rng);
  mon.hp = 1;
  mon.heldItem = "extension:berry";
  const battle = new Battle({
    party: [mon],
    enemy,
    db: original,
    rng,
    bag: createBag({}),
    traits: {
      abilities: GEN3_ABILITIES,
      heldItems: {
        ...GEN3_HELD_ITEMS,
        "extension:berry": { ...GEN3_HELD_ITEMS.oran_berry, parameter: 7 },
      },
    },
  });
  assert.equal(mon.hp, 8);
  assert.equal(mon.heldItem, null);
  assert.equal(battle.events.filter((e) => e.kind === "item").length, 1);
});

test("Experience belongs to every interactive alliance rather than only the first human side", () => {
  const rng = new Random(82),
    one = createMonster("treecko", 10, original, rng),
    two = createMonster("mudkip", 10, original, rng),
    enemy = createMonster("zigzagoon", 10, original, rng),
    awards = [];
  const side = (id, mon, kind) => ({
    id,
    allianceId: id,
    controllers: [
      { id: `${id}:owner`, kind, party: [mon], bag: createBag({}) },
    ],
    seats: [{ id: `${id}:seat`, controllerId: `${id}:owner` }],
  });
  const b = new Battle({
    topology: {
      sides: [
        side("one", one, "human"),
        side("two", two, "human"),
        side("third", enemy, "ai"),
      ],
    },
    db: original,
    rng,
    trainer: true,
    rules: {
      experienceAward: () => 100,
      experienceFinal: ({ amount }) => amount,
      grantExperience: (m, n) => {
        awards.push({ uid: m.uid, amount: n });
        return [];
      },
    },
  });
  enemy.hp = 0;
  b.checkFaint();
  assert.deepEqual(awards, [
    { uid: one.uid, amount: 100 },
    { uid: two.uid, amount: 100 },
  ]);
  b.checkFaint();
  assert.equal(awards.length, 2);
  assert.equal(b.ended, false);
});
