/** Data-only contracts shared by content authors and presentation adapters. */
export function validateMoveAnimation(definition, hasEffect = () => true) {
  if (
    !definition ||
    !Number.isFinite(definition.duration) ||
    definition.duration < 1 ||
    definition.duration > 10000 ||
    !Array.isArray(definition.tracks) ||
    definition.tracks.length > 64
  )
    throw new Error("Invalid move animation");
  for (const track of definition.tracks) {
    if (
      !track ||
      typeof track.effect !== "string" ||
      !hasEffect(track.effect) ||
      !Number.isFinite(track.start) ||
      !Number.isFinite(track.end) ||
      track.start < 0 ||
      track.end > 1 ||
      track.end <= track.start ||
      !["actor", "targets", "field"].includes(track.anchor)
    )
      throw new Error("Invalid animation track");
    if (
      track.parameters !== undefined &&
      (!track.parameters ||
        typeof track.parameters !== "object" ||
        Array.isArray(track.parameters))
    )
      throw new Error("Invalid visual parameters");
  }
  if (
    definition.lunge !== undefined &&
    (!Number.isFinite(definition.lunge) || Math.abs(definition.lunge) > 100)
  )
    throw new Error("Invalid animation lunge");
  return definition;
}
