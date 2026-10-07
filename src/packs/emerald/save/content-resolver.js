import { ContentSuspension } from '../../../engine/content-suspension.js';
import { storyDependencies } from '../../../engine/story-session.js';
import { creatureSuspension } from './creature-suspension.js';
import { worldSuspension } from './world-suspension.js';
import { runtimeSuspension } from './runtime-suspension.js';
import { migrateNativeBerryMarkers, migrateNativeCropDefinitions } from './native-migrations.js';
import { jsonValue } from '../../../engine/extensions/values.js';
class EmeraldSaveContentResolver extends ContentSuspension {
    resolve(input) {
        const migrated = migrateNativeCropDefinitions(jsonValue(input, 2 * 1024 * 1024), this.cropCatalog);
        return migrateNativeBerryMarkers(super.resolve(migrated));
    }
}
export function createSaveContentResolver({ db, catalog, plugins, validate }) {
    const resolver = new EmeraldSaveContentResolver({
        adapters: { creatures: creatureSuspension(db, catalog), runtime: runtimeSuspension(), world: worldSuspension(db, plugins, catalog) },
        available: owner => !!plugins?.manifests.has(owner), validate,
        dependencies: state => [...new Set([...(plugins?.catalog.dependencies(state) || []), ...storyDependencies(state, plugins)])],
    });
    resolver.cropCatalog = catalog;
    return resolver;
}
