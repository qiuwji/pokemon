export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const ownerOf = (id, missing) => typeof id === 'string' && missing.has(id.split(':')[0]) ? id.split(':')[0] : null;
export const ownersOf = (refs, missing) => [...new Set(refs.map(id => ownerOf(id, missing)).filter(Boolean))];
export const snapshot = (target, key) => Object.hasOwn(target, key) ? { present: true, value: structuredClone(target[key]) } : { present: false };
export function assign(target, key, value) {
    if (value.present)
        target[key] = structuredClone(value.value);
    else
        delete target[key];
}
export function at(state, path) { return path.reduce((value, key) => value?.[key], state); }
export function replace(state, path, value, owners, park) {
    const target = at(state, path.slice(0, -1)), key = path.at(-1), before = snapshot(target, key);
    const after = value === undefined ? { present: false } : { present: true, value: structuredClone(value) };
    park(owners, { kind: 'field', path, before, after });
    assign(target, key, after);
}
export function restoreField(state, p) {
    const target = at(state, p.path.slice(0, -1));
    if (!target || !same(snapshot(target, p.path.at(-1)), p.after))
        return false;
    assign(target, p.path.at(-1), p.before);
    return true;
}
const safeKey = k => typeof k === 'string' && k.length <= 512 && !['__proto__', 'constructor', 'prototype'].includes(k);
export const validSnapshot = r => r && typeof r.present === 'boolean' && Object.keys(r).every(k => ['present', 'value'].includes(k)) && Object.hasOwn(r, 'value') === r.present;
export function validField(p, allowed) {
    return p?.kind === 'field' && Object.keys(p).every(k => ['kind', 'path', 'before', 'after'].includes(k)) &&
        Array.isArray(p.path) && p.path.every(safeKey) && allowed(p.path) && validSnapshot(p.before) && validSnapshot(p.after);
}
