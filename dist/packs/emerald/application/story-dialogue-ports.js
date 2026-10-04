import { recordDialogue } from "../../../engine/dialogue-history.js";
import { choiceOptions } from "../../../engine/story-choice.js";
import { changeStoryVariable } from "../../../engine/story-variables.js";
/** Dialogue presentation and confirmed history; domain consequences remain separate commands. */
export function createStoryDialoguePorts({
  catalog,
  queries,
  readState,
  readUI,
  validateDialogue,
}) {
  return {
    dialog: async (command) => {
      const c = catalog.resolveDialogue(command, readState());
      const description = validateDialogue(c);
      await readUI().say(c.name, c.lines, null, {
        speed: c.speed ?? 30,
        mode: c.mode ?? "typewriter",
      });
      recordDialogue(readState().story, description, c.source);
    },
    choose: async (c) => {
      const options = choiceOptions(c, readState(), queries);
      const value = await readUI().choose(c.name, c.prompt, options, c.cancel, {
        default: c.default,
        timeoutMs: c.timeoutMs,
      });
      if (
        !choiceOptions(c, readState(), queries).some(
          (o) => o.id === value && !o.disabled,
        )
      )
        throw new Error("Invalid story choice result");
      if (c.variable)
        changeStoryVariable(readState().story, { name: c.variable, value });
      recordDialogue(
        readState().story,
        validateDialogue({
          name: c.name,
          lines: [
            c.prompt,
            `选择：${options.find((o) => o.id === value).label}`,
          ],
        }),
      );
      return value;
    },
  };
}
