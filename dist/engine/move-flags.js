// Fixed Gen III include/constants/pokemon.h bit order and source spellings.
export const MOVE_FLAGS = Object.freeze([
  "makes_contact",
  "protect_affected",
  "magic_coat_affected",
  "snatch_affected",
  "mirror_move_affected",
  "kings_rock_affected",
]);
export function normalizeMoveFlags(value) {
  if (Number.isInteger(value) && value >= 0 && value < 64)
    return MOVE_FLAGS.filter((flag, index) => value & (1 << index));
  if (Array.isArray(value)) {
    // The existing source importer preserves a sole literal .flags = 0 as ["0"].
    if (value.length === 1 && value[0] === "0") return [];
    const names = value.map((flag) =>
      typeof flag === "string" && flag.startsWith("FLAG_")
        ? flag.slice(5).toLowerCase()
        : flag,
    );
    if (
      new Set(names).size === names.length &&
      names.every((flag) => MOVE_FLAGS.includes(flag))
    )
      return names;
  }
  throw new Error("Invalid move flags");
}
