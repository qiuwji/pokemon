/** Gen III menu policy. UI consumes these descriptors; actions still belong to their domain owners. */
export const FIELD_MOVE_BADGES = Object.freeze({
  cut: 'badgeStone', flash: 'badgeKnuckle', rock_smash: 'badgeDynamo',
  strength: 'badgeHeat', surf: 'badgeBalance', fly: 'badgeFeather',
  dive: 'badgeMind', waterfall: 'badgeRain',
});
export function partyFieldMoves(mon, { definitions, moves, actions, flags, capabilities }) {
  if (!mon || mon.egg) return [];
  return mon.moves.flatMap(({ id }) => {
    const candidates = actions.filter(a => definitions[a.id]?.partyMove === id)
      .sort((a,b) => (definitions[b.id].priority || 0) - (definitions[a.id].priority || 0));
    const action = candidates.find(a => a.ok) || candidates[0];
    const route = action ? 'action' : id === 'fly' ? 'fly' : id === 'surf' ? 'surf' : null;
    if (!route) return [];
    const badge = FIELD_MOVE_BADGES[id];
    const allowed = !badge || !!flags[badge];
    return [{ move: id, name: moves[id].name, route,
      ...(action ? { action: action.id } : {}),
      ok: allowed && (action ? action.ok : !!capabilities[id]),
      reason: !allowed ? '获得对应的道馆徽章后才能使用。' : action?.reason,
    }];
  });
}
