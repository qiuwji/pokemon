/** The pack owns affected runtime caches; the generic plugin runtime only sees commit/rollback. */
export function beginActorEffects({ npcs, appearances, encounters, events }) {
  const batch = events.beginBatch();
  const collections = [npcs.states, npcs.scene?.pins, npcs.scene?.hidden, appearances?.leases, encounters?.claims]
    .filter(Boolean).map(collection => [collection, [...collection]]);
  const records = [...new Set([...npcs.states.values(), ...(npcs.scene?.pins.values() || [])])]
    .map(n => [n, { ...n }]);
  const sequence = npcs.motionResults.sequence;
  return {
    commit: () => batch.commit(),
    rollback() {
      for (const [collection, entries] of collections) {
        collection.clear();
        for (const entry of entries) {
          if (collection instanceof Map) collection.set(...entry);
          else collection.add(entry);
        }
      }
      for (const [n, fields] of records) {
        for (const key of Object.keys(n)) if (!Object.hasOwn(fields, key)) delete n[key];
        Object.assign(n, fields);
      }
      npcs.motionResults.sequence = sequence;
      batch.rollback();
    },
  };
}
