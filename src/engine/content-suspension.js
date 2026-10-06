import { jsonValue, localId } from './extensions/values.js';
const exact = (value, keys) => value && !Array.isArray(value) && Object.keys(value).every(k => keys.includes(k));
/** Save projection only. Domain adapters own reference checks and restoration; storage owns backup/commit. */
export class ContentSuspension {
    constructor({ adapters, available, validate, dependencies }) {
        Object.assign(this, { adapters, available, validate, dependencies });
    }
    validateArchive(archive) {
        if (archive === undefined)
            return true;
        jsonValue(archive, 2 * 1024 * 1024);
        if (!exact(archive, ['version', 'nextId', 'records']) || archive.version !== 1 ||
            !Number.isSafeInteger(archive.nextId) || archive.nextId < 1 || !Array.isArray(archive.records) || archive.records.length > 4096)
            throw new Error('Invalid suspended content');
        const ids = new Set();
        for (const r of archive.records) {
            if (!exact(r, ['id', 'domain', 'owners', 'payload']) || !Number.isSafeInteger(r.id) || r.id < 1 ||
                r.id >= archive.nextId || ids.has(r.id) || !Array.isArray(r.owners) || !r.owners.length ||
                r.owners.some(owner => !localId(owner)) || !this.adapters[r.domain]?.valid(r.payload))
                throw new Error('Invalid suspended content record');
            ids.add(r.id);
        }
        return true;
    }
    resolve(input) {
        let state = jsonValue(input, 2 * 1024 * 1024);
        this.validateArchive(state.suspendedContent);
        const missing = new Set([
            ...(state.contentDependencies || []), ...Object.keys(state.extensions || {}),
        ].filter(owner => !this.available(owner)));
        if (!missing.size && !state.suspendedContent?.records.length) {
            if (!this.validate(state))
                throw new Error("Save is invalid");
            return state;
        }
        const archive = state.suspendedContent ||= { version: 1, nextId: 1, records: [] };
        for (const [domain, adapter] of Object.entries(this.adapters)) {
            adapter.suspend(state, missing, (owners, payload) => {
                if (!adapter.valid(payload))
                    throw new Error('Invalid suspension plan');
                archive.records.push({ id: archive.nextId++, domain, owners: [...new Set(owners)], payload });
            });
        }
        state.contentDependencies = this.dependencies(state);
        // A bad native value remains a bad save. No archive is adopted before this full check.
        if (!this.validate(state))
            throw new Error('Projected save is invalid');
        // Retry dependent records after another record restores (e.g. actor before its appearance).
        let progress = true;
        while (progress) {
            progress = false;
            for (const record of [...state.suspendedContent.records]) {
                if (record.owners.some(owner => !this.available(owner)))
                    continue;
                const trial = structuredClone(state);
                try {
                    if (!this.adapters[record.domain].restore(trial, record.payload))
                        continue;
                    trial.suspendedContent.records = trial.suspendedContent.records.filter(r => r.id !== record.id);
                    trial.contentDependencies = this.dependencies(trial);
                    if (!this.validate(trial))
                        continue;
                    state = trial;
                    progress = true;
                }
                catch { /* Invalid definitions/capacity/conflicts retain the suspended record. */ }
            }
        }
        this.validateArchive(state.suspendedContent);
        if (input.suspendedContent === undefined && !state.suspendedContent.records.length)
            delete state.suspendedContent;
        return state;
    }
}
