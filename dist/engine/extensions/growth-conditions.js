import { GrowthConditions } from "../growth/conditions.js";
import { readOnly, validateValue } from "./values.js";
/** Adapt declarative extension predicates to the existing condition registry. */
export function extensionGrowthConditions(
  definitions = {},
  evaluate = (fn, ...args) => fn(...args),
) {
  const predicates = {};
  for (const [id, definition] of Object.entries(definitions)) {
    const predicate = (context, condition) =>
      evaluate(
        definition.test,
        readOnly({
          mon: context.mon,
          party: context.party,
          bag: context.bag,
          item: context.item,
          trigger: context.trigger,
          hour: context.hour,
        }),
        readOnly(condition),
      );
    predicate.validate = (condition) =>
      validateValue(definition.schema, condition);
    predicates[id] = predicate;
  }
  return new GrowthConditions(predicates);
}
