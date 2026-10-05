/** Battle narration formats settled results; it never changes rule outcomes. */
const STATS = Object.freeze({ atk: "攻击", def: "防御", spa: "特攻", spd: "特防", spe: "速度", acc: "命中率", eva: "闪避率" });
export function stageMessage(name, stat, amount) {
  return `${name}的${STATS[stat] || stat}${Math.abs(amount) > 1 ? "大幅" : ""}${amount > 0 ? "提高" : "降低"}了！`;
}
