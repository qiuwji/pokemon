/** Conditional Emerald opening cast. Only pack data knows the homes, actors and intro flags. */
export function openingObjects(state) {
  const map = state.position.map, f = state.flags, female = state.playerGender === 'female';
  const own = female ? 'Mays' : 'Brendans';
  const native = (id, actor, localId, extra = {}) => ({
    id, actor, sourceLocalId: localId, kind: 'talk',
    ...extra,
  });
  if (map === 'InsideOfTruck') return [
    native('truck.box.top', 'MovingBox', 'LOCALID_TRUCK_BOX_TOP'),
    native('truck.box.left', 'MovingBox', 'LOCALID_TRUCK_BOX_BOTTOM_L'),
    native('truck.box.right', 'MovingBox', 'LOCALID_TRUCK_BOX_BOTTOM_R'),
  ];
  const home = /LittlerootTown_(Brendans|Mays)House_(1F|2F)/.exec(map);
  if (!home) return null;
  const isOwn = home[1] === own, mirrored = home[1] === 'Mays';
  if (home[2] === '1F') {
    if (!isOwn) return [
      native('neighbor.mom', 'Woman4', 'LOCALID_RIVALS_HOUSE_1F_MOM'),
      native('neighbor.sibling', 'NinjaBoy', '6', { name: '小男孩' }),
      ...(f.meetingRivalDownstairs ? [native('neighbor.rival.downstairs', mirrored ? 'MayNormal' : 'BrendanNormal', 'LOCALID_RIVALS_HOUSE_1F_RIVAL')] : []),
    ];
    const stage = f.introState ?? 7;
    // Native positions come from sourceLocalId; stage-specific positions are story projections.
    const cast = [native('house.mom', 'Mom', 'LOCALID_PLAYERS_HOUSE_1F_MOM',
      { kind: 'healMom', name: '妈妈', text: '旅行中要注意安全。' })];
    if (stage < 6) cast.push(
      native('house.mover.0', 'VigorothCarryingBox', mirrored ? '3' : '2', { name: '过动猿', text: '咕哦！' }),
      native('house.mover.1', 'VigorothFacingAway', mirrored ? '2' : '3', { name: '过动猿', text: '咕哦！' }),
    );
    return cast;
  }
  if (isOwn) return state.clock?.initialized && !f.roomChecked
    ? [native('house.mom.upstairs', 'Mom', 'LOCALID_PLAYERS_HOUSE_2F_MOM')]
    : [];
  const cast = [];
  if (!f.neighborMet) cast.push({
    id: 'neighbor.ball', x: mirrored ? 5 : 3, y: 4, actor: 'ItemBall', kind: 'talk', name: '精灵球',
    script: `LittlerootTown_${home[1]}House_2F_EventScript_RivalsPokeBall`,
    movement: { mode: 'still', dir: 'down', rangeX: 0, rangeY: 0 },
  });
  if (f.meetingRival || f.neighborMet) cast.push(native('neighbor.rival',
    mirrored ? 'MayNormal' : 'BrendanNormal', 'LOCALID_RIVALS_HOUSE_2F_RIVAL',
    { name: mirrored ? '小遥' : '小悠', text: '爸爸还在野外研究宝可梦呢。' }));
  return cast;
}
