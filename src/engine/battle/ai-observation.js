import { readOnly } from "../extensions/values.js";

/** Deterministic 32-bit hash so each controller's AI stream is derived from the battle seed + id. */
export function hashSeed(seed, id) {
  let hash = 0x811c9dc5 ^ (seed >>> 0);
  const text = `${seed >>> 0}:${id}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function speciesOf(battle, mon) {
  const effective = battle.forms.effective(mon);
  const species = battle.db.species[effective.species];
  return {
    species: effective.species,
    name: battle.name(mon),
    level: effective.level,
    types: [...(effective.types || species.types)],
  };
}

/**
 * A public record never carries data a side has not observed: an opponent's moves, ability, held
 * item and exact stats stay absent unless `full`. Hidden data is therefore never read and then
 * erased — it is simply not part of the projection.
 */
export function publicRecord(battle, seat, mon, { full }) {
  if (!mon) return null;
  const base = {
    uid: mon.uid,
    seat,
    hp: mon.hp,
    maxHP: mon.stats.hp,
    status: mon.status ?? null,
    stages: seat ? { ...battle.conditions.get(seat).stages } : {},
    ...speciesOf(battle, mon),
  };
  if (!full) return base;
  return {
    ...base,
    ability: battle.forms.effective(mon).ability,
    heldItem: mon.heldItem ?? null,
    stats: { ...battle.forms.effective(mon).stats },
    moves: battle
      .forms.moves(mon)
      .map((slot) => slot.id)
      .filter(Boolean),
  };
}

function seatOfUid(battle, controllerId, uid) {
  for (const seat of battle.roster.seats.values())
    if (
      seat.controllerId === controllerId &&
      battle.roster.occupant(seat.id)?.uid === uid
    )
      return seat.id;
  return null;
}

/** Own creatures are always fully known; opposing creatures are limited to what is on the field. */
export function teamView(battle, controller) {
  return readOnly(
    controller.party.map((mon) =>
      publicRecord(battle, seatOfUid(battle, controller.id, mon.uid), mon, {
        full: true,
      }),
    ),
  );
}

export function opponentsView(battle, controllerId, { full }) {
  const controller = battle.roster.controllers.get(controllerId);
  const alliance = battle.roster.sides.get(controller.sideId).allianceId;
  const records = [];
  for (const seat of battle.roster.seats.values()) {
    if (battle.roster.sides.get(seat.sideId).allianceId === alliance) continue;
    const mon = battle.roster.occupant(seat.id);
    if (!mon) continue;
    if (!full && !(mon.hp > 0)) continue;
    records.push(publicRecord(battle, seat.id, mon, { full }));
  }
  return readOnly(records);
}

/**
 * Accumulated public knowledge for one observer. In `observed` mode it only holds the opposing
 * side currently on the field; `full` mirrors the entire party for tests and special rules.
 */
export function publicKnowledge(battle, controllerId, { full }) {
  return readOnly({
    mode: full ? "full" : "observed",
    opponents: opponentsView(battle, controllerId, { full }),
  });
}

export function observationFor({
  battle,
  controllerId,
  actorUid,
  mode,
  replacementReason = null,
  decisionId,
  decisionRound,
  candidates,
  analyses,
  memory,
  parameters,
  intent = null,
}) {
  const controller = battle.roster.controllers.get(controllerId);
  return readOnly({
    decisionId,
    mode,
    replacementReason,
    decisionRound,
    controller: controllerId,
    ...(actorUid ? { actor: actorUid } : {}),
    team: teamView(battle, controller),
    opponents: opponentsView(battle, controllerId, { full: mode === "full" }),
    intent,
    parameters: parameters ?? {},
    memory: memory ?? {},
    candidates,
    analyses,
    knowledge: publicKnowledge(battle, controllerId, { full: mode === "full" }),
  });
}
