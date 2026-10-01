import { stageMultiplier } from "./model.js";
import { BATTLE_RULES } from "./battle-rules.js";
import { MoveEffectRegistry } from "./move-effects.js";
import { createItemService } from "./items.js";
const STRUGGLE = {
  name: "挣扎",
  power: 50,
  accuracy: 0,
  pp: 1,
  priority: 0,
  type: "normal",
  effect: "recoil",
  chance: 0,
};
export class Battle {
  constructor({
    party,
    enemy,
    db,
    rng,
    bag,
    trainer = false,
    script = null,
    effects = {},
    rules = {},
    items = createItemService(),
  }) {
    Object.assign(this, {
      party,
      enemy,
      db,
      rng,
      bag,
      trainer,
      script,
      items,
    });
    this.rules = { ...BATTLE_RULES, ...rules };
    this.moveEffects =
      effects instanceof MoveEffectRegistry
        ? effects
        : new MoveEffectRegistry({ definitions: effects });
    this.moveEffects.validateMoves(db.moves);
    this.active = party.findIndex((m) => m.hp > 0);
    this.stages = [{}, {}];
    this.confused = [0, 0];
    this.focus = [false, false];
    this.protected = [false, false];
    this.bide = [null, null];
    this.traps = [0, 0];
    this.flinched = [false, false];
    this.participants = new Set([this.active]);
    this.turn = 0;
    this.fleeAttempts = 0;
    this.ended = false;
    this.result = null;
    this.events = [];
  }
  get player() {
    return this.party[this.active];
  }
  name(mon) {
    return this.db.species[mon.species].name;
  }
  emit(text, kind = "text", extra = {}) {
    const event = {
      text,
      kind,
      player: this.view(this.player),
      enemy: this.view(this.enemy),
      ...extra,
    };
    this.events.push(event);
    return event;
  }
  view(mon) {
    return {
      species: mon.species,
      level: mon.level,
      gender: mon.gender,
      hp: mon.hp,
      stats: { hp: mon.stats.hp },
      status: mon.status,
      exp: mon.exp,
    };
  }
  speed(mon, side) {
    return Math.floor(
      mon.stats.spe *
        stageMultiplier(this.stages[side].spe || 0) *
        (mon.status === "paralysis" ? 0.25 : 1),
    );
  }
  changeStage(side, key, n) {
    const before = this.stages[side][key] || 0;
    this.stages[side][key] = Math.min(6, Math.max(-6, before + n));
    return before !== this.stages[side][key];
  }
  enemyMove() {
    const options = this.enemy.moves
      .map((m, i) => ({ ...m, index: i }))
      .filter(
        (m) =>
          m.pp > 0 && this.moveEffects.supports(this.db.moves[m.id].effect),
      );
    return options.length ? options[this.rng.int(options.length)].index : -1;
  }
  /** @param {import("./contracts.js").BattleAction} action */
  act(action) {
    this.events = [];
    if (this.ended) return this.events;
    if (this.player.hp <= 0 && action.kind !== "switch") {
      this.emit("请选择一只还能战斗的宝可梦。", "invalid");
      return this.events;
    }
    if (action.kind === "move" && this.player.moves.some((m) => m.pp > 0)) {
      const selected = this.player.moves[action.index];
      if (!selected || selected.pp <= 0) {
        this.emit("这个招式没有剩余 PP。", "invalid");
        return this.events;
      }
      const definition = this.moveEffects.get(
        this.db.moves[selected.id].effect,
      );
      if (definition.supported === false) {
        this.emit(definition.reason, "invalid");
        return this.events;
      }
    }
    if (action.kind === "item" && !action.item) {
      this.emit("请选择要使用的道具。", "invalid");
      return this.events;
    }
    const wasFainted = this.player.hp <= 0;
    if (action.kind === "switch") {
      const m = this.party[action.index];
      if (!m || m.hp <= 0 || action.index === this.active) {
        this.emit("这只宝可梦无法替换上场。", "invalid");
        return this.events;
      }
      this.active = action.index;
      this.participants.add(action.index);
      this.stages[0] = {};
      this.confused[0] = 0;
      this.focus[0] = false;
      this.bide[0] = null;
      this.emit(`去吧，${this.name(m)}！`, "switch");
      if (wasFainted && this.rules.forcedReplacementFree) return this.events;
    } else if (["item", "potion", "ball"].includes(action.kind)) {
      const id =
        action.item || (action.kind === "ball" ? "pokeball" : "potion");
      const plan = this.items.prepare({
        id,
        bag: this.bag,
        party: this.party,
        index: action.index ?? this.active,
        context: "battle",
        enemy: this.enemy,
        canCapture: this.rules.canCapture(this),
      });
      if (!plan.ok) {
        this.emit(plan.reason, "invalid");
        return this.events;
      }
      if (!this.items.commit(plan, this.bag, id)) {
        this.emit("道具无法使用。", "invalid");
        return this.events;
      }
      if (plan.target) {
        this.emit(
          `${this.name(plan.target)} 使用了${plan.item.name}。`,
          "heal",
          { side: 0, targetIndex: action.index ?? this.active },
        );
      } else {
        this.emit(`投出了${plan.item.name}！`, "ball");
        const result = this.rules.captureCheck(
          this.enemy,
          this.db.species[this.enemy.species],
          this.rng,
          plan.captureBonus,
        );
        this.emit(
          result.caught
            ? `太好了！捉到了 ${this.name(this.enemy)}！`
            : `${"晃动…".repeat(result.shakes)}宝可梦挣脱了！`,
          "capture",
          result,
        );
        if (result.caught) {
          this.ended = true;
          this.result = "caught";
          return this.events;
        }
      }
    } else if (action.kind === "run") {
      if (!this.rules.canEscape(this)) {
        this.emit("这场战斗无法逃跑。", "invalid");
        return this.events;
      }
      this.fleeAttempts++;
      const odds =
        Math.floor(
          (this.speed(this.player, 0) * 128) /
            Math.max(1, this.speed(this.enemy, 1)),
        ) +
        30 * this.fleeAttempts;
      if (
        this.player.ability === "run_away" ||
        this.speed(this.player, 0) >= this.speed(this.enemy, 1) ||
        this.rng.int(256) < odds
      ) {
        this.ended = true;
        this.result = "escaped";
        this.emit("成功逃脱了！", "end");
        return this.events;
      }
      this.emit("没能逃脱！");
    } else if (action.kind !== "move") return this.events;
    this.turn++;
    this.protected = [false, false];
    this.flinched = [false, false];
    const ei = this.enemyMove();
    if (action.kind === "move") {
      const available = this.player.moves.some((m) => m.pp > 0);
      const pi = available ? action.index : -1;
      const pm = pi < 0 ? STRUGGLE : this.db.moves[this.player.moves[pi].id];
      const em = ei < 0 ? STRUGGLE : this.db.moves[this.enemy.moves[ei].id];
      const first =
        pm.priority !== em.priority
          ? pm.priority > em.priority
          : this.speed(this.player, 0) !== this.speed(this.enemy, 1)
            ? this.speed(this.player, 0) > this.speed(this.enemy, 1)
            : this.rng.next() < 0.5;
      for (const side of first ? [0, 1] : [1, 0]) {
        if (this.ended || this.player.hp <= 0 || this.enemy.hp <= 0) break;
        this.executeMove(side, side === 0 ? pi : ei);
        this.checkFaint();
      }
    } else {
      this.executeMove(1, ei);
      this.checkFaint();
    }
    if (!this.ended) {
      for (const side of [0, 1]) {
        const mon = side === 0 ? this.player : this.enemy;
        if (mon.hp <= 0) continue;
        if (mon.status === "poison" || mon.status === "burn") {
          mon.hp = Math.max(
            0,
            mon.hp -
              Math.max(
                1,
                Math.floor(mon.stats.hp / this.rules.residualDivisor),
              ),
          );
          this.emit(
            `${this.name(mon)} 受到了${mon.status === "poison" ? "中毒" : "灼伤"}伤害！`,
            "hurt",
            { side },
          );
          this.checkFaint();
          if (this.ended) break;
        }
        if (this.traps[side] > 0) {
          this.traps[side]--;
          mon.hp = Math.max(
            0,
            mon.hp -
              Math.max(1, Math.floor(mon.stats.hp / this.rules.trapDivisor)),
          );
          this.emit(`${this.name(mon)} 受到了持续伤害！`, "hurt", { side });
          this.checkFaint();
        }
      }
    }
    return this.events;
  }
  canAct({ side, mon, opponent: target, other }) {
    if (this.flinched[side]) {
      this.emit(`${this.name(mon)} 因畏缩无法行动！`);
      return false;
    }
    if (mon.status === "sleep") {
      if (--mon.sleep <= 0) {
        mon.status = null;
        this.emit(`${this.name(mon)} 醒来了！`);
      } else {
        this.emit(`${this.name(mon)} 正在熟睡。`);
        return false;
      }
    }
    if (mon.status === "freeze") {
      if (this.rng.next() < this.rules.thawChance) {
        mon.status = null;
        this.emit("冰冻解除了！");
      } else {
        this.emit(`${this.name(mon)} 被冻住了！`);
        return false;
      }
    }
    if (
      mon.status === "paralysis" &&
      this.rng.next() < this.rules.thawChance5
    ) {
      this.emit(`${this.name(mon)} 因麻痹无法行动！`);
      return false;
    }
    if (this.confused[side] > 0) {
      this.confused[side]--;
      if (this.confused[side] && this.rng.next() < this.rules.confusionChance) {
        const hurt = this.rules.damage(
          mon,
          mon,
          { power: 40, type: "normal" },
          {
            ...this.db,
            typeChart: {},
            species: {
              ...this.db.species,
              [mon.species]: { ...this.db.species[mon.species], types: [] },
            },
          },
          this.rng,
          { aStages: this.stages[side], dStages: this.stages[side] },
        ).amount;
        mon.hp = Math.max(0, mon.hp - hurt);
        this.emit(`${this.name(mon)} 在混乱中攻击了自己！`, "hurt", { side });
        return false;
      }
    }
    if (this.bide[side]) {
      const b = this.bide[side];
      if (--b.turns > 0) {
        this.emit(`${this.name(mon)} 正在忍耐！`);
        return false;
      }
      target.hp = Math.max(0, target.hp - b.damage * 2);
      this.bide[side] = null;
      this.emit("释放了忍耐的力量！", "hurt", { side: other });
      return false;
    }
    return true;
  }
  executeMove(side, index) {
    const mon = side === 0 ? this.player : this.enemy;
    const opponent = side === 0 ? this.enemy : this.player;
    const slot = mon.moves[index];
    const move = index < 0 ? STRUGGLE : this.db.moves[slot.id];
    const definition = this.moveEffects.get(move.effect);
    const c = {
      battle: this,
      side,
      other: 1 - side,
      mon,
      opponent,
      move,
      definition,
      power: move.power,
      dealt: 0,
      emit: this.emit.bind(this),
    };
    if (definition.supported === false || !this.canAct(c)) return;
    if (slot) slot.pp--;
    const event = this.emit(`${this.name(mon)} 使用了 ${move.name}！`, "move", {
      side,
      move: {
        id: slot?.id || "struggle",
        type: move.type,
        power: move.power,
        effect: move.effect,
      },
    });
    if (!this.moveHits(c)) {
      event.move.successful = false;
      return;
    }
    if (
      this.fury &&
      !definition.beforeDamage?.some((s) => s.op === "streakPower")
    )
      this.fury[side] = 0;
    if (definition.primary) {
      this.moveEffects.run("primary", c);
      return;
    }
    this.moveEffects.run("beforeDamage", c);
    this.dealMoveDamage(c);
    this.moveEffects.run("afterDamage", c);
    if (
      c.dealt &&
      opponent.hp > 0 &&
      definition.secondary?.length &&
      opponent.ability !== "shield_dust" &&
      this.rng.next() * 100 < move.chance
    )
      this.moveEffects.run("secondary", c);
  }
  moveHits(c) {
    if (c.definition.target === "self") return true;
    if (this.protected[c.other]) {
      this.emit("对方保护了自己！");
      return false;
    }
    const stages =
      (this.stages[c.side].acc || 0) - (this.stages[c.other].eva || 0);
    if (
      c.definition.alwaysHits ||
      this.rules.accuracy({ move: c.move, stages, rng: this.rng })
    )
      return true;
    this.emit("攻击没有命中！");
    return false;
  }
  dealMoveDamage(c) {
    const options = c.definition.hits || [1];
    const hits =
      options.length === 1 ? options[0] : options[this.rng.int(options.length)];
    for (let i = 0; i < hits && c.opponent.hp > 0; i++) {
      const critical = this.rules.critical({
        stage: (this.focus[c.side] ? 2 : 0) + (c.definition.criticalStage || 0),
        rng: this.rng,
        chances: this.rules.criticalChances,
      });
      const power = this.rules.environmentPower({
        power: c.power,
        type: c.move.type,
        waterSport: this.waterSport,
        mudSport: this.mudSport,
      });
      const result = this.rules.damage(
        c.mon,
        c.opponent,
        c.move,
        this.db,
        this.rng,
        {
          aStages: this.stages[c.side],
          dStages: this.stages[c.other],
          critical,
          power,
        },
      );
      const amount = Math.min(
        Math.max(0, c.opponent.hp - (c.definition.minimumHP || 0)),
        result.amount,
      );
      c.opponent.hp -= amount;
      c.dealt += amount;
      this.emit(
        `${result.critical ? "击中了要害！ " : ""}${result.type === 0 ? "没有效果。" : result.type > 1 ? "效果拔群！" : result.type < 1 ? "效果不太好…" : "攻击命中了！"}`,
        "hurt",
        { side: c.other },
      );
    }
    if (this.bide[c.other]) this.bide[c.other].damage += c.dealt;
  }
  checkFaint() {
    if (this.ended) return;
    if (this.enemy.hp <= 0) {
      this.emit(`${this.name(this.enemy)} 倒下了！`, "faint", { side: 1 });
      this.ended = true;
      this.result = "win";
      const living = [...this.participants].filter((i) => this.party[i].hp > 0);
      const spec = this.db.species[this.enemy.species];
      const total = Math.floor(
        (spec.expYield * this.enemy.level * (this.trainer ? 1.5 : 1)) / 7,
      );
      for (const i of living) {
        const m = this.party[i];
        const xp = Math.max(1, Math.floor(total / living.length));
        this.emit(`${this.name(m)} 获得了 ${xp} 点经验！`);
        for (const ev of this.rules.grantExperience(m, xp, spec, this.db))
          this.emit(ev.text, ev.kind);
      }
    } else if (this.player.hp <= 0) {
      this.emit(`${this.name(this.player)} 倒下了！`, "faint", { side: 0 });
      if (!this.party.some((m) => m.hp > 0)) {
        this.ended = true;
        this.result = "loss";
        this.emit("没有能够继续战斗的宝可梦了…", "end");
      }
    }
  }
}
