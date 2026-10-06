import {
  objectSchema,
  validateSchema,
  validateValue,
  jsonValue,
  readOnly,
} from "../extensions/values.js";

/**
 * Shared contracts for the two-layer AI strategy system. Trainer strategies own controller-level
 * plans; creature strategies own an individual's action preferences. Nothing here touches a Battle,
 * RNG or domain object: registration detaches callbacks and the host later synthesises answers.
 */
export const SCORE_LIMIT = 1_000_000;
export const MAX_SCORES = 4096;
export const MAX_REASONS = 8;
export const MAX_REASON_LENGTH = 80;
export const MAX_VARIANTS = 8;
export const MAX_VARIANT_ATTACHMENTS = 2;
export const MAX_BAND = 1_000_000;
export const INFORMATION_MODES = Object.freeze(["observed", "full"]);
export const CHOICE_MODES = Object.freeze(["best", "topBand"]);

const emptySchema = () => objectSchema({}, []);
export const schemaOrEmpty = (value) =>
  value === undefined ? emptySchema() : validateSchema(value);

const isFn = (value) => typeof value === "function";
const exactKeys = (value, keys) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  Object.keys(value).every((key) => keys.includes(key));

/** Legacy trainers declare no `version`; v2 trainers declare `version: 2`. */
export function isTrainerStrategyV2(definition) {
  return definition?.version === 2;
}

export function normalizeTrainerStrategy(value, evaluate) {
  const original = value;
  if (original?.version === undefined) {
    if (!isFn(original?.decide))
      throw new Error("Battle strategy requires decide");
    return {
      ...original,
      decide: (context) => evaluate(original.decide, readOnly(context)),
    };
  }
  if (original.version !== 2)
    throw new Error("Unknown trainer strategy version");
  return buildV2("Trainer strategy", original, evaluate, ["scoreJoint"]);
}

export function normalizeCreatureStrategy(value, evaluate) {
  const original = value;
  if (original?.version !== 1)
    throw new Error("Unknown creature strategy version");
  return buildV2("Creature strategy", original, evaluate, []);
}

function buildV2(label, original, evaluate, jointKeys) {
  if (
    !exactKeys(original, [
      "version",
      "parameters",
      "memory",
      "init",
      "score",
      ...jointKeys,
    ])
  )
    throw new Error(`Invalid ${label}`);
  if (!isFn(original.score)) throw new Error(`${label} requires score`);
  if (original.init !== undefined && !isFn(original.init))
    throw new Error(`${label} init must be a function`);
  const definition = {
    version: original.version,
    parameters: schemaOrEmpty(original.parameters),
    memory: schemaOrEmpty(original.memory),
    score: (context) => evaluate(original.score, readOnly(context)),
    ...(original.init
      ? { init: (context) => evaluate(original.init, readOnly(context)) }
      : {}),
  };
  for (const key of jointKeys) {
    if (original[key] === undefined) continue;
    if (!isFn(original[key])) throw new Error(`${label} ${key} must be a function`);
    definition[key] = (context) => evaluate(original[key], readOnly(context));
  }
  // Without `init`, the initial memory is `{}`; reject at registration if that already fails.
  if (!original.init) validateValue(definition.memory, {}, "memory");
  return definition;
}

/** Validate and normalise a single `{ id, parameters }` strategy reference. */
export function validateStrategyRef(
  ref,
  { path, lookup, label, v2Only = false },
) {
  if (!exactKeys(ref, ["id", "parameters"]) || typeof ref?.id !== "string")
    throw new Error(`Invalid ${label} reference ${path}`);
  const definition = lookup(ref.id);
  if (!definition) throw new Error(`Unknown ${label} ${ref.id}`);
  if (v2Only && !isTrainerStrategyV2(definition))
    throw new Error(`Trainer strategy ${ref.id} must declare version 2`);
  const parameters = ref.parameters === undefined ? {} : ref.parameters;
  validateValue(definition.parameters, parameters, `${path}.parameters`);
  return { id: ref.id, parameters: jsonValue(parameters) };
}

function validateReasons(reasons, path) {
  const value = reasons === undefined ? [] : reasons;
  if (!Array.isArray(value) || value.length > MAX_REASONS)
    throw new Error(`${path}: too many reasons`);
  for (const reason of value)
    if (typeof reason !== "string" || reason.length > MAX_REASON_LENGTH)
      throw new Error(`${path}: invalid reason`);
  return [...value];
}

/**
 * Validate a strategy `ScoreResult`. Candidate ids must belong to the offered set, values are
 * finite and bounded, unknown fields and duplicate ids are rejected, and `nextMemory` (if present)
 * is checked against the strategy's memory schema. Missing candidates simply contribute zero.
 */
export function validateScoreResult(result, candidateIds, memorySchema) {
  if (!exactKeys(result, ["scores", "nextMemory"]))
    throw new Error("Strategy score must return an object");
  if (!Array.isArray(result.scores) || result.scores.length > MAX_SCORES)
    throw new Error("Strategy score requires scores");
  const seen = new Set();
  const scores = result.scores.map((entry, index) => {
    if (!exactKeys(entry, ["candidateId", "value", "reasons"]))
      throw new Error(`scores[${index}]: invalid entry`);
    if (typeof entry.candidateId !== "string" || !candidateIds.has(entry.candidateId))
      throw new Error(`scores[${index}]: unknown candidate`);
    if (seen.has(entry.candidateId))
      throw new Error(`scores[${index}]: duplicate candidate`);
    seen.add(entry.candidateId);
    if (!Number.isFinite(entry.value) || Math.abs(entry.value) > SCORE_LIMIT)
      throw new Error(`scores[${index}]: value out of range`);
    return {
      candidateId: entry.candidateId,
      value: entry.value,
      reasons: validateReasons(entry.reasons, `scores[${index}].reasons`),
    };
  });
  let nextMemory;
  if (result.nextMemory !== undefined) {
    if (!memorySchema) throw new Error("Strategy returned memory but none is declared");
    validateValue(memorySchema, result.nextMemory, "nextMemory");
    nextMemory = jsonValue(result.nextMemory);
  }
  return { scores, nextMemory };
}

/** Validate the joint (combination) scoring contribution of a trainer strategy. */
export function validateJointScores(entries, proposalIds) {
  if (!Array.isArray(entries) || entries.length > MAX_SCORES)
    throw new Error("scoreJoint must return an array");
  const seen = new Set();
  return entries.map((entry, index) => {
    if (!exactKeys(entry, ["proposalId", "value", "reasons"]))
      throw new Error(`joint[${index}]: invalid entry`);
    if (typeof entry.proposalId !== "string" || !proposalIds.has(entry.proposalId))
      throw new Error(`joint[${index}]: unknown proposal`);
    if (seen.has(entry.proposalId))
      throw new Error(`joint[${index}]: duplicate proposal`);
    seen.add(entry.proposalId);
    if (!Number.isFinite(entry.value) || Math.abs(entry.value) > SCORE_LIMIT)
      throw new Error(`joint[${index}]: value out of range`);
    return {
      proposalId: entry.proposalId,
      value: entry.value,
      reasons: validateReasons(entry.reasons, `joint[${index}].reasons`),
    };
  });
}

/** `ai.choice` selection policy; `band` only widens selection under `topBand`. */
export function validateChoice(choice, path) {
  if (choice === undefined) return { mode: "best", band: 0 };
  if (!exactKeys(choice, ["mode", "band"]))
    throw new Error(`Invalid ${path}`);
  const mode = choice.mode ?? "best",
    band = choice.band ?? 0;
  if (!CHOICE_MODES.includes(mode))
    throw new Error(`Invalid ${path} mode`);
  if (!Number.isInteger(band) || band < 0 || band > MAX_BAND)
    throw new Error(`Invalid ${path} band`);
  if (mode === "best" && band !== 0)
    throw new Error(`${path}: band requires topBand`);
  return { mode, band };
}

/** Declarative attachment variants; parameter values are checked against the attachment schema. */
export function validateVariants(variants, attachment) {
  const list = variants === undefined ? [] : variants;
  if (!Array.isArray(list) || list.length > MAX_VARIANTS)
    throw new Error("Invalid ai variants");
  return list.map((variant, index) => {
    if (!exactKeys(variant, ["attachments"]) || !Array.isArray(variant.attachments))
      throw new Error(`variants[${index}]: invalid variant`);
    if (
      !variant.attachments.length ||
      variant.attachments.length > MAX_VARIANT_ATTACHMENTS
    )
      throw new Error(`variants[${index}]: invalid attachment count`);
    const attachments = variant.attachments.map((entry, slot) => {
      if (!exactKeys(entry, ["id", "parameters"]) || typeof entry?.id !== "string")
        throw new Error(`variants[${index}].attachments[${slot}]: invalid attachment`);
      const schema = attachment(entry.id);
      if (!schema)
        throw new Error(
          `variants[${index}].attachments[${slot}]: unknown attachment ${entry.id}`,
        );
      const parameters = entry.parameters === undefined ? {} : entry.parameters;
      validateValue(
        schema,
        parameters,
        `variants[${index}].attachments[${slot}].parameters`,
      );
      return { id: entry.id, parameters: jsonValue(parameters) };
    });
    return { attachments };
  });
}

/**
 * Full `ai` binding for a controller: a trainer squad may attach a controller-level strategy, an
 * individual default and variants; a wild creature may attach only a creature strategy. Difficulty
 * lives entirely in which strategies are bound plus `parameters`/`choice.band`, never in hidden info.
 */
export function validateAiBinding(
  ai,
  { path, trainerLookup, creatureLookup, attachment },
) {
  if (
    !exactKeys(ai, ["trainer", "creature", "information", "choice", "variants"])
  )
    throw new Error(`Invalid trainer ai ${path}`);
  const information = ai.information ?? "observed";
  if (!INFORMATION_MODES.includes(information))
    throw new Error(`Invalid trainer ai information ${path}`);
  return {
    ...(ai.trainer === undefined
      ? {}
      : {
          trainer: validateStrategyRef(ai.trainer, {
            path: `${path}.trainer`,
            lookup: trainerLookup,
            label: "trainer strategy",
            v2Only: true,
          }),
        }),
    ...(ai.creature === undefined
      ? {}
      : {
          creature: validateStrategyRef(ai.creature, {
            path: `${path}.creature`,
            lookup: creatureLookup,
            label: "creature strategy",
          }),
        }),
    information,
    choice: validateChoice(ai.choice, `${path}.choice`),
    variants: validateVariants(ai.variants, attachment),
  };
}

/** Trainer squads and wild creatures share the same binding contract. */
export const validateTrainerAi = validateAiBinding;

/** Per-party-member creature override; only valid when the parent trainer enables the ai contract. */
export function validateMemberAi(ai, { path, creatureLookup }) {
  return validateStrategyRef(ai, {
    path,
    lookup: creatureLookup,
    label: "creature strategy",
  });
}
