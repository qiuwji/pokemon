/** Injectable decision policy. Default deliberately uses seeded random legal moves, not original AI. */
export function randomDecision(battle, seat) {
  const mon = battle.roster.occupant(seat);
  const choices = battle
    .movesFor(seat)
    .map((m, index) => ({ ...m, index }))
    .filter((m) => battle.moveAvailable(seat, m.index));
  const index = choices.length
    ? choices[battle.rng.int(choices.length)].index
    : -1;
  const move =
    index < 0
      ? { effect: "recoil", target: "selected" }
      : battle.db.moves[battle.movesFor(seat)[index].id];
  const options = battle.roster.opposing(seat);
  const target =
    battle.targeting.mode(move) === "selected" && options.length
      ? {
          kind: "seat",
          id: options[options.length === 1 ? 0 : battle.rng.int(options.length)]
            .id,
        }
      : undefined;
  return { kind: "move", seat, actor: mon.uid, index, target };
}
