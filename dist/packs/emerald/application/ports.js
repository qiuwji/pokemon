/** Selected live dependencies preserve domain identities after save loading without exposing the facade. */
export function liveApplicationPorts(read, names, overrides = {}) {
  if (Reflect.ownKeys(overrides).some((name) => !names.includes(name)))
    throw new Error("Unknown application dependency override");
  const ports = {};
  for (const name of names)
    Object.defineProperty(ports, name, {
      enumerable: true,
      ...(Object.hasOwn(overrides, name)
        ? { value: overrides[name] }
        : { get: () => read(name) }),
    });
  return Object.freeze(ports);
}
/** Services may read only their declared dependencies and cannot replace dependencies they do not own. */
export function bindApplicationPorts(target, ports, names) {
  if (
    Reflect.ownKeys(ports).length !== names.length ||
    names.some((name) => !Object.hasOwn(ports, name))
  )
    throw new Error("Application dependency contract mismatch");
  const descriptors = Object.fromEntries(
    names.map((name) => {
      const descriptor = Object.getOwnPropertyDescriptor(ports, name);
      if (descriptor.set)
        throw new Error("Application dependencies must be read-only");
      return [
        name,
        {
          ...descriptor,
          configurable: false,
          ...(descriptor.get ? {} : { writable: false }),
        },
      ];
    }),
  );
  Object.defineProperties(target, descriptors);
}
