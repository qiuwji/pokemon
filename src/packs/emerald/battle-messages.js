/**
 * Battle narration catalog (pack content), mirroring the categories in the reference
 * `src/battle_message.c`. Domain events carry a stable `message: {id, params}`; the host
 * resolves it through the presentation registry so wording and placeholders live in one
 * place. Plugins may override or add ids through `api.presentation.message`.
 */
const STAGES = Object.freeze({
  atk: "攻击", def: "防御", spa: "特攻", spd: "特防", spe: "速度", acc: "命中率", eva: "闪避率",
});
/** Base templates registered by the pack; plugins can override the same target ids. */
export const BATTLE_MESSAGE_TEMPLATES = Object.freeze({
  "wild-appeared": () => "野生的宝可梦出现了！",
  "stage": ({ name, stat, amount }) =>
    `${name}的${STAGES[stat] || stat}${Math.abs(amount) > 1 ? "大幅" : ""}${amount > 0 ? "提高" : "降低"}了！`,
  "captured": ({ mon }) => `太好了！捉到了 ${mon}！`,
  "trainer-challenge": () => "训练家发起了挑战！",
  "used-move": ({ mon, move }) => `${mon} 使用了 ${move}！`,
  "attack-missed": () => "攻击没有命中！",
  "no-effect": () => "没有效果。",
  "super-effective": () => "效果拔群！",
  "not-very-effective": () => "效果不太好…",
  "critical-hit": () => "击中了要害！",
  // Reference sequences critical/effectiveness in battle scripts; here it is one settled line.
  "move-result": ({ critical, type }) =>
    `${critical ? "击中了要害！ " : ""}${
      type === 0
        ? "没有效果。"
        : type > 1
          ? "效果拔群！"
          : type < 1
            ? "效果不太好…"
            : "攻击命中了！"
    }`,
  "fainted": ({ mon }) => `${mon}倒下了！`,
  "status-inflicted": () => "陷入了异常状态！",
  "confused": () => "陷入了混乱！",
  "attracted": () => "陷入了着迷！",
  "form-changed": () => "形态发生了变化！",
  "weather-damage": () => "受到了天气伤害！",
  "weather-calm": () => "天气恢复了平静。",
  "weather-changed": () => "天气发生变化！",
  "ball-thrown": ({ item }) => `投出了${item}！`,
  "fled": () => "成功逃脱了！",
  "cannot-flee": () => "无法逃跑！",
  "escape-failed": () => "没能逃脱！",
});

/** Resolve a base battle message id to display text. Unknown ids are a content bug. */
export function battleMessage(id, params = {}) {
  const template = BATTLE_MESSAGE_TEMPLATES[id];
  if (!template) throw new Error(`Unknown battle message ${id}`);
  return template(params);
}

export const BATTLE_MESSAGE_IDS = Object.freeze(
  Object.keys(BATTLE_MESSAGE_TEMPLATES),
);
