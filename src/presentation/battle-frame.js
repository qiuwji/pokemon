/** Applies detached visual channels; it never commits domain state. */
export function applyBattleFrame(result, sampled) {
  const { actors, combatants } = result;
  for (const pose of sampled.poses || []) {
    const target = actors.find(a => a.seatId === pose.seatId);
    if (target) Object.assign(target, pose);
  }
  result.sprites = sampled.sprites || [];
  if (sampled.statusBoxes?.length) result.statusBoxes = sampled.statusBoxes;
  const scene = sampled.scenes?.[0];
  if (scene) {
    result.background = { x: scene.backgroundX || 0, split: scene.split || false };
    result.clip = scene.clip;
    if (scene.hideTrainers) result.trainers = [];
    if (scene.hideBall) { result.ball = null; result.balls = []; }
  }
  result.healthBars = sampled.healthBars || [];
  for (const bar of result.healthBars) {
    const mon = combatants.find(c => c.seatId === bar.seatId)?.monster;
    if (mon) mon.hp = bar.hp;
  }
  if (sampled.trainers !== undefined) result.trainers = sampled.trainers;
  if (sampled.effects !== undefined) result.effects = sampled.effects;
  if (sampled.ball !== undefined) result.ball = sampled.ball && { ...sampled.ball };
  if (sampled.balls !== undefined) result.balls = sampled.balls;
  if (sampled.background !== undefined) result.background = sampled.background;
  if (sampled.clip !== undefined) result.clip = sampled.clip;
  for (const visual of sampled.monsterViews || []) {
    const c = result.combatants.find(c => c.seatId === visual.seatId);
    if (c) c.monster = { ...visual.monster, stats: { ...visual.monster.stats } };
  }
}
