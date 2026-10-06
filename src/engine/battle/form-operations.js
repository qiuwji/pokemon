export const FORM_OPERATIONS = {
  activateForm(c, s) {
    const b = c.battle,
      mon = s.target === "opponent" ? c.opponent : c.mon,
      seat = s.target === "opponent" ? c.targetSeat : c.actorSeat;
    if (!b.forms.activate(mon, s.id, b.roster.owner(seat).id)) {
      c.successful = false;
      c.emit("现在无法改变形态。", "failed");
      return;
    }
    c.emit("形态发生了变化！", "form", {
      targetSeat: seat,
      formId: s.id,
      message: { id: "form-changed", params: {} },
    });
    b.traits.enter(seat);
  },
  transform(c) {
    const b = c.battle,
      target = b.forms.effective(c.opponent);
    if (
      b.forms.records[c.mon.uid]?.kind === "transform" ||
      b.forms.records[c.opponent.uid]?.kind === "transform" ||
      b.actionLifecycle.hidden(c.targetSeat) ||
      b.states.lookup("substitute", c.targetSeat)
    ) {
      c.successful = false;
      c.emit("无法变身！", "failed");
      return;
    }
    const stats = Object.fromEntries(
      Object.entries(target.stats).filter(([k]) => k !== "hp"),
    );
    b.forms.overlay(
      c.mon,
      {
        species: target.species,
        stats,
        iv: target.iv,
        moves: b.forms
          .moves(c.opponent)
          .map((m) => ({ id: m.id, pp: Math.min(5, b.db.moves[m.id].pp) })),
        ability: target.ability,
        types: b.traits.types(c.targetSeat),
      },
      { kind: "transform", sourceUid: c.opponent.uid },
    );
    c.selfState.stages = { ...c.targetState.stages };
    c.emit("变成了对方的样子！", "form", { targetSeat: c.actorSeat });
  },
  mimic(c) {
    const b = c.battle,
      id = b.actionLifecycle.lastMove(c.targetSeat);
    if (
      !id ||
      ["mimic", "metronome", "struggle", "sketch", "transform"].includes(id) ||
      b.forms.records[c.mon.uid]?.kind === "transform" ||
      b.forms.moves(c.mon).some((m) => m.id === id)
    ) {
      c.successful = false;
      c.emit("无法模仿这个招式。", "failed");
      return;
    }
    const moves = structuredClone(b.forms.moves(c.mon));
    moves[c.action.index] = { id, pp: Math.min(5, b.db.moves[id].pp) };
    b.forms.overlay(c.mon, { moves }, { kind: "mimic" });
    c.emit("暂时学会了对方的招式！", "form", { targetSeat: c.actorSeat });
  },
};
FORM_OPERATIONS.activateForm.validate = (s) => {
  if (
    typeof s.id !== "string" ||
    !s.id ||
    (s.target !== undefined && !["self", "opponent"].includes(s.target))
  )
    throw new Error("Invalid form operation");
};
