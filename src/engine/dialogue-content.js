import { readOnly } from "./extensions/values.js";

/** Small text language, not HTML. Substitution happens after parsing so values cannot inject styles. */
export function textRuns(text, bindings = {}) {
  if (typeof text !== "string" || text.length > 8192)
    throw new Error("Invalid dialogue shorthand");
  const runs = [],
    stack = [],
    style = {};
  const substitute = (value) =>
    value.replace(/\{\{([a-zA-Z][\w.-]*)\}\}/g, (_, key) => {
      if (!Object.hasOwn(bindings, key))
        throw new Error(`Unknown dialogue binding: ${key}`);
      const v = bindings[key];
      if (v !== null && !["string", "number", "boolean"].includes(typeof v))
        throw new Error(`Invalid dialogue binding: ${key}`);
      return String(v ?? "");
    });
  for (const part of text.split(
    /(\[(?:\/?b|\/?color(?:=#[\da-fA-F]{6})?|\/?effect(?:=[a-z][\w.:-]*)?|pause=\d+)\])/g,
  )) {
    if (!part) continue;
    const match = part.match(/^\[(\/?)(b|color|effect)(?:=(.+))?\]$/);
    if (match) {
      const [, closing, tag, value] = match;
      if (closing) {
        const entry = stack.pop();
        if (!entry || entry.tag !== tag)
          throw new Error("Unbalanced dialogue shorthand");
        Object.keys(style).forEach((key) => delete style[key]);
        Object.assign(style, entry.style);
      } else {
        if (tag !== "b" && !value)
          throw new Error("Invalid dialogue shorthand tag");
        stack.push({ tag, style: { ...style } });
        if (tag === "b") style.bold = true;
        else style[tag] = value;
      }
    } else if (/^\[pause=\d+\]$/.test(part)) {
      runs.push({ pauseMs: Number(part.slice(7, -1)) });
    } else runs.push({ text: substitute(part), ...style });
  }
  if (stack.length) throw new Error("Unbalanced dialogue shorthand");
  return runs.length ? runs : [{ text: "" }];
}

/** Templates read only declared scalar queries or call parameters; never object paths or eval. */
export function resolveDialogue(
  definition,
  { queries, state, parameters = {} } = {},
) {
  const bindings = {};
  for (const [key, value] of Object.entries(definition.bindings || {})) {
    if (value && typeof value === "object") {
      if (Object.keys(value).length !== 1)
        throw new Error(`Invalid dialogue binding: ${key}`);
      if (value.query) bindings[key] = queries.read(value.query, state);
      else if (
        typeof value.param === "string" &&
        Object.hasOwn(parameters, value.param)
      )
        bindings[key] = parameters[value.param];
      else throw new Error(`Unknown dialogue parameter: ${key}`);
    } else bindings[key] = value;
  }
  const lines = definition.lines.map((line) => {
    if (typeof line === "string") return { runs: textRuns(line, bindings) };
    const { text, ...fields } = line;
    if (fields.name !== undefined)
      fields.name = textRuns(fields.name, bindings)
        .map((run) => run.text || "")
        .join("");
    if (text !== undefined && fields.runs !== undefined)
      throw new Error("Dialogue line cannot contain both text and runs");
    if (fields.runs)
      fields.runs = fields.runs.map((run) =>
        run.text === undefined
          ? run
          : {
              ...run,
              text: run.text.replace(/\{\{([a-zA-Z][\w.-]*)\}\}/g, (_, key) => {
                if (!Object.hasOwn(bindings, key))
                  throw new Error(`Unknown dialogue binding: ${key}`);
                const value = bindings[key];
                if (
                  value !== null &&
                  !["string", "number", "boolean"].includes(typeof value)
                )
                  throw new Error(`Invalid dialogue binding: ${key}`);
                return String(value ?? "");
              }),
            },
      );
    return text === undefined
      ? fields
      : { ...fields, runs: textRuns(text, bindings) };
  });
  const { bindings: _bindings, ...fields } = definition;
  const name = textRuns(definition.name, bindings)
    .map((run) => run.text || "")
    .join("");
  return readOnly({ ...fields, name, lines });
}

export function validateDialogueBindings(definition, queries) {
  for (const value of Object.values(definition.bindings || {}))
    if (value?.query) queries.validate(value.query);
}
