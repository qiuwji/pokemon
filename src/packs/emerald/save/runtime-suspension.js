import { at, ownersOf, replace, restoreField, validField } from './suspension-values.js';
const allowed = path => {
    const routes = {
        bag: [['pockets'], ['pockets', '*'], ['pockets', '*', '*']], registeredItem: [[]],
        actors: [['records', '*']], appearances: [['records', '*']], encounters: [['records', '*']],
        fieldEffects: [['records', '*']], forms: [['*']], crops: [['trees', '*']], schedule: [['tasks', '*']],
        devices: [['records', '*'], ['timers', '*'], ['requests', '*']], weather: [['active'], ['overrides', '*']],
        facilities: [['results']], story: [['session']], movement: [['visited']],
    };
    return (routes[path[0]] || []).some(route => route.length === path.length - 1 && route.every((k, i) => k === '*' || k === path[i + 1]));
};
export function runtimeSuspension() {
    return {
        valid: p => validField(p, allowed), restore: restoreField,
        suspend(s, missing, park) {
            if (s.story.session?.status === "battle") throw new Error("Cannot suspend a live story battle");
            const remove = (path, refs, value) => {
                const owners = ownersOf(refs, missing);
                if (owners.length)
                    replace(s, path, value, owners, park);
            };
            for (const [pocket, slots] of Object.entries(s.bag.pockets)) {
                if (ownersOf([pocket], missing).length) {
                    remove(['bag', 'pockets', pocket], [pocket]);
                    continue;
                }
                for (let i = 0; i < slots.length; i++)
                    if (slots[i]) {
                        if (!Number.isSafeInteger(slots[i].count) || slots[i].count < 1)
                            throw new Error('Invalid suspended inventory count');
                        remove(['bag', 'pockets', pocket, String(i)], [slots[i].item], null);
                    }
            }
            if (s.registeredItem)
                remove(['registeredItem'], [s.registeredItem.item], null);
            const records = (root, section, refs) => {
                for (const [id, value] of Object.entries(at(s, [root, section]) || {}))
                    remove([root, section, id], refs(id, value));
            };
            records('actors', 'records', (_id, r) => [r.template, r.map, r.pose]);
            records('appearances', 'records', (_id, r) => [r.appearance, r.target.map]);
            // An appearance of a paused actor cannot outlive its target.
            for (const [key, r] of Object.entries(s.appearances.records))
                if (r.target.kind === 'actor' && !s.actors.records[r.target.uid]) {
                    const actor = s.suspendedContent.records.find(e => e.payload.path?.join('/') === `actors/records/${r.target.uid}`);
                    if (actor)
                        replace(s, ['appearances', 'records', key], undefined, actor.owners, park);
                }
            records('encounters', 'records', (_id, r) => [r.map, r.table, r.monster.species, r.monster.ability, r.monster.heldItem, ...r.monster.moves.map(m => m.id)]);
            records('fieldEffects', 'records', (id, r) => [id, r.map]);
            for (const [uid, r] of Object.entries(s.forms || {})) {
                remove(['forms', uid], [r.id]);
                if (s.forms[uid] && !([...s.party, ...s.box, ...s.daycare.slots.map(r => r.mon), ...(s.daycare.egg ? [s.daycare.egg] : [])].some(m => m.uid === uid))) {
                    const entry = s.suspendedContent.records.find(e => e.payload.kind === 'creature' && e.payload.uid === uid);
                    if (entry)
                        replace(s, ['forms', uid], undefined, entry.owners, park);
                }
            }
            records('crops', 'trees', (id, r) => [id, r.kind]);
            records('schedule', 'tasks', (_id, r) => [r.definition]);
            for (const field of ['records', 'timers', 'requests'])
                records('devices', field, (id, r) => [id, ...(field === 'requests' ? Object.values(r).map(v => v.action) : [])]);
            if (s.weather.active)
                remove(['weather', 'active'], [s.weather.active.map, s.weather.active.selection, s.weather.active.kind], null);
            records('weather', 'overrides', (id, r) => [id, r.weather]);
            const invalidResults = s.facilities.results.filter(r => ownersOf([r.facility], missing).length);
            if (invalidResults.length)
                remove(['facilities', 'results'], invalidResults.map(r => r.facility), s.facilities.results.filter(r => !invalidResults.includes(r)));
            if (s.story.session)
                remove(['story', 'session'], [s.story.session.script, s.story.session.event, ...(s.story.session.actors || []).map(a => a.actor)]);
            const invalidDestinations = s.movement.visited.filter(id => ownersOf([id], missing).length);
            if (invalidDestinations.length)
                remove(['movement', 'visited'], invalidDestinations, s.movement.visited.filter(id => !invalidDestinations.includes(id)));
        },
    };
}
