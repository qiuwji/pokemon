/** field_player_avatar.c Fishing_* at fixed reference revision; 60 frames per second. */
export function gen3FishingRules(rod) {
  const index = ["old", "good", "super"].indexOf(rod);
  if (index < 0) throw new Error("Unknown fishing rod");
  return Object.freeze({
    castDuration: 1000,
    dotDuration: (20 * 1000) / 60,
    reelDuration: ([36, 33, 30][index] * 1000) / 60,
    minimumRounds: (roll) => 1 + roll([1, 3, 6][index]),
    dots: (round, roll) => Math.min(10, roll(10) + (round === 0 ? 4 : 1)),
    bite: (lead, roll) =>
      (!lead?.egg &&
        ["suction_cups", "sticky_hold"].includes(lead?.ability) &&
        roll(100) > 14) ||
      roll(2) === 0,
    extraRound: (round, roll) =>
      round < 2 &&
      roll(100) <
        [
          [0, 0],
          [40, 10],
          [70, 30],
        ][index][round],
  });
}
