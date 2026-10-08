export function createDialogueHistoryInterface(
  game,
  { modal, escapeHTML, showMenu },
) {
  function showDialogueHistory() {
    const history = game.dialogueHistory();
    modal(
      "对话记录",
      history.length
        ? history
            .map(
              (entry) =>
                `<section class="panel">${entry.lines.map((line) => `<p><strong>${escapeHTML(line.name)}</strong> ${escapeHTML(line.text)}</p>`).join("")}</section>`,
            )
            .join("")
        : "<p>尚无已确认的对话。</p>",
      { type: "dialogue-history", back: showMenu },
    );
  }
  return { showDialogueHistory };
}
