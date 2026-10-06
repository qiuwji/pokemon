import { AttachedRules } from "./attachments.js";
import { TRAIT_OPERATIONS } from "../battle/trait-operations.js";
import { EffectRegistry } from "../effects.js";
/** Party scope reuses the attachment compiler for experience, encounter, friendship and egg clocks. */
export class PartyTraits {
  constructor({
    party,
    abilities,
    heldItems,
    operations = new EffectRegistry(TRAIT_OPERATIONS),
    onEvent = () => {},
    hooks = [],
  }) {
    this.party = party;
    this.runtime = new AttachedRules({
      definitions: { ability: abilities, heldItem: heldItems },
      operations,
      hooks,
      owners: (kind, id, hook, c) => {
        const candidates =
          hook.role === "actor"
            ? [c.actorUid]
            : hook.role === "target"
              ? [c.targetUid]
              : hook.role === "owner"
                ? [c.ownerUid]
                : party.map((m) => m.uid);
        return [...new Set(candidates)].filter((uid) =>
          party.some((m) => m.uid === uid && m[kind] === id),
        );
      },
      context: (c, uid, kind, id) => {
        const context = {
          ...c,
          owner: party.find((m) => m.uid === uid),
          attachmentKind: kind,
          attachmentId: id,
          attachment: (kind === "ability" ? abilities : heldItems)[id],
          emit: onEvent,
        };
        for (const key of [
          "allowed",
          "selected",
          "gender",
          "nature",
          "heldItem",
        ])
          Object.defineProperty(context, key, {
            get: () => c[key],
            set: (value) => {
              c[key] = value;
            },
            enumerable: true,
          });
        return context;
      },
    });
  }
  calculate(phase, value, mon, context = {}) {
    return this.runtime.pipeline.calculate(phase, value, {
      ...context,
      actorUid: mon.uid,
    });
  }
  run(phase, context = {}) {
    this.runtime.pipeline.run(phase, context);
  }
}
