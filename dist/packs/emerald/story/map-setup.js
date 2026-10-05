/** Only data setup can preserve held input across a seamless map connection. */
export function isMapSetup(commands, catalog, depth = 0) {
  if (depth > 32) return false;
  return commands.every(c => {
    if (["setVariable", "worldPatch", "completeEvent", "checkpoint"].includes(c.type)) return true;
    if (c.type === "sequence") return isMapSetup(c.commands, catalog, depth + 1);
    if (c.type === "if") return isMapSetup(c.then || [], catalog, depth + 1) &&
      isMapSetup(c.else || [], catalog, depth + 1);
    if (c.type === "script") return !catalog.script(c.id).durable &&
      isMapSetup(catalog.commands(c.id, c.input), catalog, depth + 1);
    return false;
  });
}
