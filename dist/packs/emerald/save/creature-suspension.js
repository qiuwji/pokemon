import { validCreatureValues } from '../../../engine/creature-contract.js';
import { same, ownersOf, snapshot, assign, validSnapshot } from './suspension-values.js';
const collections = ['party', 'box', 'tradePartner', 'daycare.slots', 'daycare.egg'];
const fields = ['ability', 'heldItem', 'moves', 'pendingMoves', 'growthCompanions'];
const monsters = s => [...s.party, ...s.box, ...s.tradePartner, ...s.daycare.slots.map(r => r.mon), ...(s.daycare.egg ? [s.daycare.egg] : [])];
function collection(s, location) {
    return location === 'daycare.slots' ? s.daycare.slots : s[location];
}
export function creatureSuspension(db, catalog) {
    return {
        valid(p) {
            if (p?.kind === 'dex')
                return ['seen', 'caught'].includes(p.field) && Array.isArray(p.values) && p.values.every(id => typeof id === 'string');
            return p && ['creature', 'creatureField'].includes(p.kind) && collections.includes(p.location) &&
                typeof p.uid === 'string' && p.uid.length > 0 && (p.kind === 'creature' ?
                Object.keys(p).every(k => ['kind', 'location', 'uid', 'mon', 'slot'].includes(k)) && validCreatureValues(p.mon) && p.mon.uid === p.uid &&
                    (p.location !== 'daycare.slots' || (p.slot && same(p.slot.mon, p.mon) && Number.isSafeInteger(p.slot.steps) && p.slot.steps >= 0 && p.slot.initialLevel === p.mon.level)) :
                Object.keys(p).every(k => ['kind', 'location', 'uid', 'field', 'before', 'after'].includes(k)) && fields.includes(p.field) && validSnapshot(p.before) && validSnapshot(p.after));
        },
        suspend(s, missing, park) {
            for (const field of ['seen', 'caught']) {
                const values = s[field].filter(id => ownersOf([id], missing).length);
                if (values.length) {
                    park(ownersOf(values, missing), { kind: 'dex', field, values });
                    s[field] = s[field].filter(id => !values.includes(id));
                }
            }
            const removed = new Set();
            for (const location of collections) {
                const values = location === 'daycare.egg' ? (s.daycare.egg ? [s.daycare.egg] : []) : collection(s, location);
                for (const entry of [...values]) {
                    const mon = location === 'daycare.slots' ? entry.mon : entry;
                    if (!validCreatureValues(mon) || !Array.isArray(mon.moves) || mon.moves.length > 4 || mon.moves.some(m => typeof m.id !== 'string' || !Number.isInteger(m.pp) || m.pp < 0))
                        throw new Error('Invalid creature before suspension');
                    const owners = ownersOf([mon.species], missing);
                    if (owners.length) {
                        park(owners, { kind: 'creature', location, uid: mon.uid, mon: structuredClone(mon), ...(location === 'daycare.slots' ? { slot: structuredClone(entry) } : {}) });
                        removed.add(mon.uid);
                        if (location === 'daycare.egg')
                            s.daycare.egg = null;
                        else
                            values.splice(values.indexOf(entry), 1);
                        continue;
                    }
                    const change = (field, value, refs) => {
                        const owners = ownersOf(refs, missing);
                        if (!owners.length)
                            return;
                        const before = snapshot(mon, field), after = value === undefined ? { present: false } : { present: true, value };
                        park(owners, { kind: 'creatureField', location, uid: mon.uid, field, before, after });
                        assign(mon, field, after);
                    };
                    change('moves', mon.moves.filter(m => !ownersOf([m.id], missing).length), mon.moves.map(m => m.id));
                    if (mon.pendingMoves)
                        change('pendingMoves', mon.pendingMoves.filter(id => !ownersOf([id], missing).length), mon.pendingMoves);
                    change('heldItem', null, [mon.heldItem]);
                    change('ability', db.species[mon.species]?.abilities?.find(id => catalog.abilities[id]), [mon.ability]);
                }
            }
            // Preserve cross-creature links while the referenced creature is suspended.
            for (const mon of monsters(s))
                if (mon.growthCompanions?.some(uid => removed.has(uid))) {
                    const owners = [...new Set(s.suspendedContent.records.filter(r => r.payload.kind === 'creature' && removed.has(r.payload.uid)).flatMap(r => r.owners))];
                    const before = snapshot(mon, 'growthCompanions'), after = { present: true, value: mon.growthCompanions.filter(uid => !removed.has(uid)) };
                    park(owners, { kind: 'creatureField', location: 'party', uid: mon.uid, field: 'growthCompanions', before, after });
                    assign(mon, 'growthCompanions', after);
                }
        },
        restore(s, p) {
            if (p.kind === 'dex') {
                s[p.field] = [...new Set([...s[p.field], ...p.values])];
                return true;
            }
            const existing = monsters(s).find(m => m.uid === p.uid);
            if (p.kind === 'creatureField') {
                if (!existing || !same(snapshot(existing, p.field), p.after))
                    return false;
                assign(existing, p.field, p.before);
                return true;
            }
            if (existing)
                return false;
            if (p.location === 'daycare.egg') {
                if (s.daycare.egg)
                    return false;
                s.daycare.egg = structuredClone(p.mon);
                return true;
            }
            const values = collection(s, p.location), limit = p.location === 'box' ? 200 : p.location === 'daycare.slots' ? 2 : 6;
            // A full party can receive its returning creature in the PC without evicting anyone.
            if (values.length >= limit) {
                if (p.location !== 'party' || s.box.length >= 200)
                    return false;
                s.box.push(structuredClone(p.mon));
            }
            else
                values.push(structuredClone(p.location === 'daycare.slots' ? p.slot : p.mon));
            return true;
        },
    };
}
