const clamp = t => Math.max(0, Math.min(1, t));
const lerp = (a, b, t) => a + (b - a) * t;
/** Pure cosmetic sampling over detached frame state. */
export function sampleBattleActions(result, { e, previous, t, subject, actor, pose }, { registry, intro, typeColors }) {
  const { layout, combatants } = result;
  if (e.kind === "recall" && actor) {
    actor.scale = 1 - t;
    actor.opacity = 1 - t;
    result.effects = [{ kind: "release", source: pose, target: pose, side: pose.back ? 0 : 1, t: 1 - t }];
  } else if (e.kind === "move" && actor && registry?.moves.has(e.move?.id)) {
    const lunge = registry.animation(e.move).lunge || 0;
    if (lunge) {
      actor.x = Math.round(
        Math.sin(t * Math.PI) * (pose.back ? lunge : -lunge),
      );
      actor.y = -Math.round(Math.sin(t * Math.PI) * 6);
    }
    result.effects = registry.sampleMove(e, layout, t);
  } else if (
    ["stage", "status", "barrier"].includes(e.kind) &&
    layout.has(e.targetSeat)
  ) {
    result.effects = [
      {
        kind:
          e.kind === "stage"
            ? "stages"
            : e.kind === "status"
              ? "ailment"
              : "shield",
        target: layout.get(e.targetSeat),
        source: layout.get(e.actorSeat) || layout.get(e.targetSeat),
        ...(e.amount === undefined ? {} : { amount: e.amount }),
        status: e.status || "confusion",
        t,
      },
    ];
  } else if (e.kind === "form" && actor) {
    actor.flash = t > 0.25 && t < 0.6;
    actor.scale = 1 + Math.sin(t * Math.PI) * 0.12;
  } else if (e.kind === "hurt" && actor) {
    if (e.hit)
      result.effects = [
        {
          kind: "contact",
          source: layout.get(e.actorSeat) || pose,
          target: pose,
          t: 0.5 + t * 0.4,
          type: e.moveType ?? null,
          color: typeColors?.(e.moveType) ?? null,
        },
      ];
    actor.x = Math.round(Math.sin(t * Math.PI * 10) * 5 * (1 - t));
    actor.flash = t < 0.65 && Math.floor(t * 12) % 2 === 0;
  } else if (e.kind === "faint" && actor) {
    actor.y = Math.round(t * 55);
    actor.opacity = 1 - t;
  } else if (e.kind === "switch" && actor) {
    const entry = combatants.find((c) => c.seatId === subject),
      old = previous.combatants.find((c) => c.seatId === subject)?.monster,
      trainer = pose.back ? { x: 65, y: 158 } : { x: 248, y: 74 },
      ballResource = intro?.ballResource;
    // Recall the outgoing Pokémon with a beam into its ball, then throw the next one out.
    if (t < 0.4) {
      entry.monster = old;
      actor.scale = old?.hp > 0 ? 1 - t / 0.4 : 0;
      const recall = clamp(t / 0.4),
        ball = {
          resource: ballResource,
          x: lerp(pose.x, trainer.x, recall),
          y: lerp(pose.baseline - 19, trainer.y, recall),
          angle: recall * Math.PI * 4,
          sealed: false,
        };
      result.ball = ball;
      result.effects =
        old?.hp > 0
          ? [
              {
                kind: "beam",
                source: pose,
                target: ball,
                t: Math.min(1, recall * 3),
                color: "#f85858",
                lineWidth: 4,
                growth: 1,
              },
            ]
          : [];
    } else {
      // The ball is thrown and lands before the Pokémon appears, not alongside it.
      actor.scale = clamp((t - 0.8) / 0.2);
      const send = clamp((t - 0.4) / 0.4);
      result.ball = {
        resource: ballResource,
        x: lerp(trainer.x, pose.x, send),
        y:
          lerp(trainer.y, pose.baseline - 19, send) -
          Math.sin(send * Math.PI) * 40,
        angle: (1 - send) * Math.PI * 4,
        sealed: false,
      };
      const openT = clamp((t - 0.8) / 0.2);
      result.effects =
        openT > 0
          ? [
              {
                kind: "release",
                side: pose.back ? 0 : 1,
                source: pose,
                target: pose,
                t: openT,
              },
            ]
          : [];
    }
  } else if (["heal", "level"].includes(e.kind) && pose)
    result.effects = [
      {
        kind: "heal",
        side: pose.back ? 0 : 1,
        source: pose,
        target: pose,
        t,
      },
    ];
  else return false;
  return true;
}
