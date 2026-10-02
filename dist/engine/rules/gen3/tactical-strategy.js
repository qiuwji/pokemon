/** Optional transparent heuristic policy. Original AI script bytecode is not reproduced by this heuristic. */
export const TACTICAL_STRATEGY = {
  decide({ analyses, roll }) {
    const scored = analyses.map((a, index) => {
      if (a.kind === "item") return { index, score: 30 };
      if (a.kind === "switch") return { index, score: 1 };
      let score = 10;
      for (const t of a.targets) {
        if (t.opposing) {
          score += (t.estimatedDamage / Math.max(1, t.maxHP)) * 100;
          if (t.estimatedDamage >= t.hp && t.estimatedDamage > 0) score += 100;
          if (a.move.power > 0 && t.type === 0) score -= 200;
        } else if (t.uid !== a.actor.uid)
          score -= (t.estimatedDamage / Math.max(1, t.maxHP)) * 150;
      }
      const primary = a.definition.primary || [];
      if (
        primary.some(
          (s) =>
            s.op === "restoreHP" || s.op === "weatherHeal" || s.op === "rest",
        )
      )
        score += a.actor.hp < a.actor.maxHP / 2 ? 60 : -100;
      if (
        primary.some((s) => s.op === "status") &&
        a.targets.every((t) => t.status)
      )
        score -= 100;
      if (primary.some((s) => s.op === "stages" && s.target === "self"))
        score += a.actor.hp > a.actor.maxHP / 2 ? 10 : -10;
      if (a.move.effect === "splash") score -= 200;
      return { index, score };
    });
    const best = Math.max(...scored.map((s) => s.score)),
      choices = scored.filter((s) => s.score === best);
    return choices[
      Math.min(choices.length - 1, Math.floor(roll * choices.length))
    ].index;
  },
};
