export const dialog = (dialogue, parameters = {}) => ({
  type: "dialog",
  dialogue,
  parameters,
});
export const battle = (species, level, options) => ({
  type: "battle",
  species,
  level,
  options,
});
export const flag = (name) => ({ flag: name });
export const not = (name) => ({ not: flag(name) });
export const all = (...conditions) => ({ all: conditions });
export const talkEvent = (id, kind, build, requires) => ({
  id,
  trigger: "interact",
  requires,
  selector: { kind },
  build,
});
