import { ContentSuspension } from '../../../engine/content-suspension.js';
import { storyDependencies } from '../../../engine/story-session.js';
import { creatureSuspension } from './creature-suspension.js';
import { worldSuspension } from './world-suspension.js';
import { runtimeSuspension } from './runtime-suspension.js';
export function createSaveContentResolver({ db, catalog, plugins, validate }) {
    return new ContentSuspension({
        adapters: { creatures: creatureSuspension(db, catalog), runtime: runtimeSuspension(), world: worldSuspension(db, plugins, catalog) },
        available: owner => !!plugins?.manifests.has(owner), validate,
        dependencies: state => [...new Set([...(plugins?.catalog.dependencies(state) || []), ...storyDependencies(state, plugins)])],
    });
}
