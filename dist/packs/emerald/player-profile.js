/** Current-format protagonist identity; story content chooses a profile before leaving the truck. */
export function validatePlayerProfile({ gender, name }) {
  if (!["male", "female"].includes(gender) || typeof name !== "string" ||
      !name.trim() || name.length > 16) throw new Error("Invalid player profile");
  return { gender, name: name.trim() };
}
export function configurePlayer(state, profile) {
  const { gender, name } = validatePlayerProfile(profile);
  if (state.flags.playerConfigured) throw new Error("Player profile already configured");
  state.playerGender = gender;
  state.playerName = name;
  state.flags.playerConfigured = true;
}
