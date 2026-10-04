import {
  readOnly,
  objectSchema,
  validateSchema,
  validateValue,
  localId,
} from "./extensions/values.js";
import {
  validateDialogueBindings,
  resolveDialogue,
} from "./dialogue-content.js";
import { storyProgram } from "./story-program.js";
import {
  validateStoryProjection,
  projectStoryObjects,
} from "./story-projection.js";
import { dialogueDescription } from "./dialogue.js";

const reference = (bundle, id) => (id.includes(":") ? id : `${bundle}.${id}`);
const entries = (value) => Object.entries(value || {});
const substitute = (value, parameters) => {
  if (Array.isArray(value)) return value.map((v) => substitute(v, parameters));
  if (!value || typeof value !== "object") return value;
  if (Object.keys(value).length === 1 && typeof value.$param === "string") {
    if (!Object.hasOwn(parameters, value.$param))
      throw new Error(`Unknown story parameter: ${value.$param}`);
    return structuredClone(parameters[value.$param]);
  }
  return Object.fromEntries(
    entries(value).map(([k, v]) => [k, substitute(v, parameters)]),
  );
};

/** One immutable directory for native and plugin scripts. No domain or browser dependencies. */
export class StoryCatalog {
  constructor(bundles = [], { queries, maps = {}, eventIds = new Set() } = {}) {
    this.scripts = new Map();
    this.dialogues = new Map();
    this.events = [];
    this.sources = [];
    this.projections = [];
    this.queries = queries;
    const knownEvents = new Set([
      ...eventIds,
      ...bundles.flatMap((bundle) =>
        entries(bundle.entries).map(([id]) => reference(bundle.id, id)),
      ),
    ]);
    const bundleIds = new Set();
    for (const bundle of bundles) {
      if (
        !/^[a-z][\w.-]*:[a-z][\w.-]*$/.test(bundle.id) ||
        bundle.version !== 1 ||
        bundleIds.has(bundle.id)
      )
        throw new Error(`Invalid story bundle: ${bundle.id}`);
      bundleIds.add(bundle.id);
      const data = readOnly(bundle);
      for (const rule of data.projections || []) {
        validateStoryProjection(rule, maps, queries, knownEvents);
        this.projections.push(rule);
      }
      for (const [id, definition] of entries(data.scripts)) {
        if (!localId(id) || !Array.isArray(definition.commands))
          throw new Error(`Invalid story script: ${bundle.id}.${id}`);
        const key = reference(data.id, id);
        if (this.scripts.has(key))
          throw new Error(`Duplicate story script: ${key}`);
        this.scripts.set(key, {
          ...definition,
          id: key,
          bundle: data.id,
          parameters: validateSchema(definition.parameters || objectSchema()),
        });
      }
      for (const [id, definition] of entries(data.dialogues)) {
        const key = reference(data.id, id);
        if (!localId(id) || this.dialogues.has(key))
          throw new Error(`Invalid story dialogue: ${key}`);
        validateDialogueBindings(definition, queries);
        const parameters = Object.fromEntries(
          Object.values(definition.bindings || {})
            .filter((value) => value?.param)
            .map((value) => [value.param, ""]),
        );
        dialogueDescription(
          resolveDialogue(definition, {
            queries: { read: () => "" },
            parameters,
          }),
        );
        this.dialogues.set(key, { ...definition, bundle: data.id });
      }
      for (const [id, entry] of entries(data.entries)) {
        const selector = entry.selector || {};
        if (
          !localId(id) ||
          !entry.trigger ||
          !entry.script ||
          Object.keys(selector).some(
            (k) =>
              ![
                "map",
                "objectId",
                "script",
                "kind",
                "reason",
                "localId",
              ].includes(k),
          ) ||
          Object.values(selector).some((v) => typeof v !== "string" || !v) ||
          (selector.map && !maps[selector.map])
        )
          throw new Error(`Invalid story entry: ${data.id}.${id}`);
        this.events.push({
          ...entry,
          id: reference(data.id, id),
          selector,
          build: (_state, context) => [
            {
              type: "script",
              id: reference(data.id, entry.script),
              input: {
                ...(entry.input || {}),
                ...(entry.contextParameters
                  ? Object.fromEntries(
                      Object.entries(entry.contextParameters).map(
                        ([key, field]) => {
                          if (!["id", "name", "text"].includes(field))
                            throw new Error("Invalid story context parameter");
                          return [key, context.object?.[field]];
                        },
                      ),
                    )
                  : {}),
              },
            },
          ],
        });
      }
      this.sources.push(
        ...(data.sources || []).map((source) => ({
          ...source,
          bundle: data.id,
        })),
      );
    }
    for (const event of this.events)
      this.script(event.build({}, { object: {} })[0].id);
    const calls = new Map();
    for (const [id, script] of this.scripts) {
      const targets = [];
      this.walk(script.commands, (c) => {
        const owner = bundles.find(
          (bundle) => bundle.id === script.bundle,
        )?.owner;
        if (owner) {
          const own = (id) =>
            typeof id === "string" &&
            (id.startsWith(owner + ":") || id.startsWith(owner + "."));
          if (
            (c.type === "flag" && !own(c.key)) ||
            (c.type === "setVariable" && !own(c.name)) ||
            (c.type === "reward" &&
              (!own(c.id) ||
                Object.keys(c.flags || {}).some((key) => !own(key)))) ||
            (c.type === "choice" && c.variable && !own(c.variable))
          )
            throw new Error(`Story state namespace denied: ${id}`);
        }
        if (c.type === "call")
          targets.push(this.script(reference(script.bundle, c.script)).id);
        if (c.type === "dialog" && c.dialogue)
          this.dialogue(reference(script.bundle, c.dialogue));
      });
      calls.set(id, targets);
    }
    const visit = (id, path = new Set()) => {
      if (path.has(id)) throw new Error(`Story call cycle: ${id}`);
      const next = new Set(path).add(id);
      for (const target of calls.get(id)) visit(target, next);
    };
    for (const id of calls.keys()) visit(id);
  }
  projectObjects(map, objects, state) {
    return projectStoryObjects(
      this.projections,
      map,
      objects,
      state,
      this.queries,
    );
  }
  walk(commands, fn) {
    for (const c of commands) {
      if (!c || typeof c.type !== "string")
        throw new Error("Invalid story script command");
      fn(c);
      for (const branch of [
        c.commands,
        c.then,
        c.else,
        ...Object.values(c.onResult || {}),
        ...(c.options || []).map((o) => o.commands),
      ])
        if (branch) this.walk(branch, fn);
    }
  }
  script(id) {
    const definition = this.scripts.get(id);
    if (!definition) throw new Error(`Unknown story script: ${id}`);
    return definition;
  }
  dialogue(id) {
    const definition = this.dialogues.get(id);
    if (!definition) throw new Error(`Unknown story dialogue: ${id}`);
    return definition;
  }
  commands(
    id,
    input = {},
    depth = 0,
    prefix = "",
    budget = { remaining: 2048 },
  ) {
    if (depth > 16) throw new Error("Story call depth exceeded");
    const script = this.script(id);
    validateValue(script.parameters, input, `story.${id}.input`);
    const expand = (commands) =>
      commands.flatMap((command) => {
        if (--budget.remaining < 0)
          throw new Error("Story program size exceeded");
        const c = substitute(command, input);
        if (prefix) {
          if (!localId(c.node))
            throw new Error(`Stable story node required: ${id}/${c.node}`);
          c.node = `${prefix}/${c.node}`;
        }
        if (c.type === "call") {
          const children = this.commands(
            reference(script.bundle, c.script),
            c.input || {},
            depth + 1,
            prefix ? c.node : "",
            budget,
          );
          return prefix
            ? [{ type: "sequence", node: c.node, commands: children }]
            : children;
        }
        if (c.type === "dialog" && c.dialogue)
          return [
            {
              ...c,
              dialogue: reference(script.bundle, c.dialogue),
              parameters: input,
            },
          ];
        for (const key of ["commands", "then", "else"])
          if (c[key]) c[key] = expand(c[key]);
        if (c.options)
          c.options = c.options.map((o) => ({
            ...o,
            commands: expand(o.commands || []),
          }));
        if (c.onResult)
          c.onResult = Object.fromEntries(
            entries(c.onResult).map(([key, branch]) => [key, expand(branch)]),
          );
        return [c];
      });
    return expand(script.commands);
  }
  program(id, input) {
    if (!this.script(id).durable)
      throw new Error(`Story script is not resumable: ${id}`);
    const commands = this.commands(id, input, 0, id);
    this.walk(commands, (c) => {
      if (c.type === "script")
        throw new Error("Nested story sessions must use call");
      if (c.type === "parallel")
        this.walk(c.commands, (child) => {
          if (["battle", "checkpoint", "script"].includes(child.type))
            throw new Error("Story suspension cannot run in parallel");
        });
    });
    return storyProgram(commands);
  }
  resolveDialogue(command, state) {
    if (!command.dialogue) return command;
    return {
      ...resolveDialogue(this.dialogue(command.dialogue), {
        queries: this.queries,
        state,
        parameters: command.parameters,
      }),
      type: "dialog",
      source: command.dialogue,
    };
  }
}

/** Plugin-facing registration returns stable exports; setup only stores data in the staged host. */
export function storyBundleExports(id, bundle) {
  return readOnly({
    id,
    scripts: Object.fromEntries(
      entries(bundle.scripts).map(([key]) => [key, reference(id, key)]),
    ),
    dialogues: Object.fromEntries(
      entries(bundle.dialogues).map(([key]) => [key, reference(id, key)]),
    ),
    entries: Object.fromEntries(
      entries(bundle.entries).map(([key]) => [key, reference(id, key)]),
    ),
  });
}

/** Reference-only index for world-overlay validation; content itself is validated at registration. */
export function storyDialogueIds(bundles) {
  return new Set(bundles.flatMap(bundle =>
    Object.keys(bundle.dialogues || {}).map(id => reference(bundle.id, id))));
}
