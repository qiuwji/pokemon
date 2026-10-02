import { executeCalledMove } from "./called-moves.js";
import { GEN3_REFERENCE_MOVES } from "../rules/gen3/reference-metadata.js";
const forbiddenCopy = new Set([
  "metronome",
  "struggle",
  "sketch",
  "mimic",
  "counter",
  "mirror_coat",
  "protect",
  "detect",
  "endure",
  "destiny_bond",
  "sleep_talk",
  "thief",
  "follow_me",
  "snatch",
  "helping_hand",
  "covet",
  "trick",
  "focus_punch",
]);
const forbiddenTalkAssist = new Set([
  "sleep_talk",
  "assist",
  "mirror_move",
  "metronome",
]);
const fail = (c) => {
  c.successful = false;
  c.emit("没有可调用的招式。", "failed");
};
const supported = (b, id) => {
  const m = b.db.moves[id];
  return (
    m &&
    Object.hasOwn(b.moveEffects.definitions, m.effect) &&
    b.moveEffects.supports(m.effect)
  );
};
export const COPY_OPERATIONS = {
  callMove(c, s) {
    const b = c.battle;
    let candidates;
    if (s.mode === "metronome") {
      // The original move catalog defines the pool; plugin-only moves require their own caller policy.
      candidates = Object.keys(GEN3_REFERENCE_MOVES).filter(
        (id) => !forbiddenCopy.has(id) && supported(b, id),
      );
    } else if (s.mode === "assist") {
      candidates = b.roster
        .owner(c.actorSeat)
        .party.filter((mon) => mon.uid !== c.mon.uid && !mon.egg)
        .flatMap((mon) => mon.moves.map((slot) => slot.id))
        .filter(
          (id) =>
            !forbiddenTalkAssist.has(id) &&
            !forbiddenCopy.has(id) &&
            supported(b, id),
        );
    } else {
      candidates = b
        .movesFor(c.actorSeat)
        .map((slot) => slot.id)
        .filter((id) => {
          if (
            !supported(b, id) ||
            forbiddenTalkAssist.has(id) ||
            ["focus_punch", "uproar"].includes(id)
          )
            return false;
          const move = { ...b.db.moves[id], id },
            definition = b.moveEffects.get(move.effect);
          return (
            definition.action?.kind !== "charge" &&
            move.effect !== "bide" &&
            b.traits.calculate("move-availability", 1, {
              actorSeat: c.actorSeat,
              move,
            }) > 0
          );
        });
    }
    if (!candidates.length) return fail(c);
    c.successful = executeCalledMove(
      c,
      candidates[b.rng.int(candidates.length)],
    );
  },
  sketch(c) {
    const b = c.battle,
      id = b.actionLifecycle.lastMove(c.targetSeat, { successful: false });
    if (
      !id ||
      ["struggle", "sketch"].includes(id) ||
      !supported(b, id) ||
      b.forms.records[c.mon.uid]?.kind === "transform" ||
      c.action.index < 0 ||
      c.mon.moves.some((slot) => slot.id === id)
    )
      return fail(c);
    c.mon.moves[c.action.index] = { id, pp: b.db.moves[id].pp };
    // A copied temporary move layer must not hide the newly permanent slot.
    const record = b.forms.records[c.mon.uid];
    if (record?.overrides?.moves)
      record.overrides.moves[c.action.index] = {
        ...c.mon.moves[c.action.index],
      };
    c.emit("永久学会了对方的招式！", "learn", {
      targetSeat: c.actorSeat,
      moveId: id,
    });
  },
};
COPY_OPERATIONS.callMove.validate = (s) => {
  if (!["metronome", "assist", "sleep_talk"].includes(s.mode))
    throw new Error("Invalid called move policy");
};
