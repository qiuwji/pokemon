/** Native 240×160 single-party window coordinates from src/data/party_menu.h.
 * This module formats snapshots only; no rules, timers or state mutation.
 */
export function partyMenuCards(party, { db, escapeHTML: escape, hpTrack, selectedUid }) {
  return Array.from({length:6}, (_, index) => {
    const mon = party[index];
    if (!mon) return index ? `<div class="native-party-card empty slot-${index}" aria-hidden="true"></div>` : '';
    const name = mon.egg ? '蛋' : mon.nickname || db.species[mon.species].name;
    const iconId = mon.egg ? 'egg' : mon.species;
    const icon = db.resources?.[`${iconId}-icon`] || `assets/${iconId}-icon.png`;
    const gender = mon.gender === 'male' || mon.gender === '♂' ? '♂' : mon.gender === 'female' || mon.gender === '♀' ? '♀' : '';
    return `<button class="native-party-card slot-${index}${mon.egg ? ' egg' : ''}${selectedUid === mon.uid ? ' active' : ''}" data-mon="${index}" aria-label="${escape(name)}${mon.egg ? '' : `，等级${mon.level}，HP ${mon.hp}/${mon.stats.hp}`}"><span class="party-icon"><img src="${escape(icon)}" alt=""></span><span class="party-name">${escape(name)}</span>${mon.egg ? '' : `<span class="party-level">Lv.${mon.level}</span><span class="party-gender">${gender}</span>${hpTrack(mon)}<span class="party-hp">${mon.hp}/${mon.stats.hp}</span>${mon.status || mon.hp === 0 ? '<span class="party-status">' + escape(mon.hp === 0 ? '濒死' : mon.status) + '</span>' : ''}`}</button>`;
  }).join('');
}
/** Spatial navigation is temporary UI state and never changes party order. */
export function partyMenuNavigation(root, doc, direction) {
  const actions = [...root.querySelectorAll('[data-party-action]')];
  if (actions.length) {
    const index = Math.max(0,actions.indexOf(doc.activeElement));
    const delta = direction === 'up' || direction === 'left' ? -1 : 1;
    actions[(index + delta + actions.length) % actions.length].focus();
    return true;
  }
  const buttons = [...root.querySelectorAll('[data-mon]')], cancel = root.querySelector('[data-party-cancel]');
  const index = buttons.indexOf(doc.activeElement);
  if (index < 0) { (direction === 'up' ? buttons.at(-1) : buttons[0])?.focus(); return true; }
  let target;
  if (direction === 'left') target = buttons[0];
  else if (direction === 'right') target = index === 0 ? buttons[1] || cancel : cancel;
  else if (direction === 'down') target = buttons[index + 1] || cancel;
  else target = index === 0 ? cancel : buttons[index - 1];
  target?.focus();
  return true;
}
