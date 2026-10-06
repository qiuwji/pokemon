import { WorldStateService } from '../../../engine/world-state.js';
import { storyDialogueIds } from '../../../engine/story-catalog.js';
import { isWater, ledgeDirection, blockedDirection } from '../../../engine/terrain.js';
import { GEN3_ELEVATION } from '../../../engine/rules/gen3/elevation.js';
import { objectsFor, PACK } from '../pack.js';
import { ownersOf, replace, restoreField, validField } from './suspension-values.js';
const allowed = path => path[0] === 'worldState' && ['maps', 'visits'].includes(path[1]) &&
    (path.length === 3 || (path.length === 5 && path[3] === 'objects') || (path.length === 7 && path[3] === 'objects' && path[5] === 'changes' && ['actor', 'trainerId', 'dialogue', 'appearance'].includes(path[6])));
export function worldSuspension(db, plugins, catalog) {
    return {
        valid: p => p?.kind === 'location' ? p.original && p.original.position && typeof p.original.position.map === 'string' : validField(p, allowed),
        restore: (s, p) => p.kind === 'location' ? false : restoreField(s, p),
        suspend(s, missing, park) {
            for (const layer of ['maps', 'visits'])
                for (const [map, record] of Object.entries(s.worldState[layer])) {
                    const mapOwners = ownersOf([map, db.maps[map]?.tileset], missing);
                    if (mapOwners.length) {
                        replace(s, ['worldState', layer, map], undefined, mapOwners, park);
                        continue;
                    }
                    for (const [id, r] of Object.entries(record.objects)) {
                        const refs = [id, r.changes.actor, r.changes.trainerId, r.changes.dialogue, r.changes.appearance];
                        const owners = ownersOf(refs, missing);
                        if (!owners.length)
                            continue;
                        if (r.spawn || ownersOf([id], missing).length)
                            replace(s, ['worldState', layer, map, 'objects', id], undefined, owners, park);
                        else {
                            for (const field of ['actor', 'trainerId', 'dialogue', 'appearance']) {
                                const fieldOwners = ownersOf([r.changes[field]], missing);
                                if (fieldOwners.length)
                                    replace(s, ['worldState', layer, map, 'objects', id, 'changes', field], undefined, fieldOwners, park);
                            }
                        }
                    }
                }
            const owners = ownersOf([s.position.map, s.movement.mode], missing);
            if (!owners.length)
                return;
            park(owners, { kind: 'location', original: { position: structuredClone(s.position), mode: s.movement.mode, fieldEffects: structuredClone(s.fieldEffects), weather: structuredClone(s.weather) } });
            if (!db.maps[s.worldState.activeMap])
                s.worldState.activeMap = null;
            if (!db.maps[s.fieldEffects.activeMap])
                s.fieldEffects.activeMap = null;
            const dialogues = storyDialogueIds([...Object.values(db.stories || {}), ...(plugins?.storyBundles.values() || [])]);
            const world = new WorldStateService({ db, state: s.worldState, dialogues });
            const origins = [...(db.maps[s.position.map] ? [s.position] : []), PACK.safeReturn];
            let landing = null;
            for (const origin of origins) {
                const map = world.map(origin.map), view = { ...s, position: origin };
                const objects = world.projectObjects(origin.map, objectsFor(view, db)).filter(o => !o.hidden);
                const actors = Object.values(s.actors.records).filter(o => o.map === origin.map && !o.hidden);
                const candidates = [];
                for (let y = 0; y < map.height; y++)
                    for (let x = 0; x < map.width; x++)
                        candidates.push({ x, y });
                candidates.sort((a, b) => Math.abs(a.x - origin.x) + Math.abs(a.y - origin.y) - Math.abs(b.x - origin.x) - Math.abs(b.y - origin.y));
                for (const p of candidates) {
                    const index = p.y * map.width + p.x, behavior = map.behavior[index], block = map.blocks[index];
                    if (((block >> 10) & 3) || isWater(behavior) || ledgeDirection(behavior) || blockedDirection(behavior) || map.warps.some(w => w.x === p.x && w.y === p.y))
                        continue;
                    const pos = { map: origin.map, ...p, dir: origin.dir };
                    GEN3_ELEVATION.initialize(pos, map);
                    if ([...objects, ...actors].some(o => GEN3_ELEVATION.occupies(map, o, p.x, p.y, pos.elevation)))
                        continue;
                    landing = pos;
                    break;
                }
                if (landing)
                    break;
            }
            if (!landing)
                throw new Error('No safe plugin suspension landing');
            s.position = landing;
            s.movement.mode = 'walk';
            s.worldState.activeMap = landing.map;
            s.fieldEffects.activeMap = landing.map;
            // A visit-scoped effect of the abandoned map must not leak into the landing visit.
            for (const [id, r] of Object.entries(s.fieldEffects.records))
                if (r.map && r.map !== landing.map)
                    delete s.fieldEffects.records[id];
            if (s.weather.active?.map !== landing.map)
                s.weather.active = null;
            if (!catalog.movement.walk)
                throw new Error('Missing base movement policy');
        },
    };
}
