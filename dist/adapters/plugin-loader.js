/** Trusted project plugins are selected by a data catalog, never by arbitrary URL code. */
export async function loadPluginCatalog({
  url,
  content,
  parameters = new URLSearchParams(),
  environment = "production",
  readJSON = async (location) => {
    const response = await fetch(location);
    if (!response.ok)
      throw new Error(`Plugin resource unavailable: ${location}`);
    return response.json();
  },
  importModule = (location) => import(location.href),
}) {
  const manifest = await readJSON(url);
  if (manifest?.version !== 1 || !Array.isArray(manifest.plugins))
    throw new Error("Invalid plugin catalog");
  const records = new Map();
  const localURL = (value) => {
    if (typeof value !== "string" || !/^\.\.?\//.test(value))
      throw new Error("Plugin catalog requires relative local paths");
    const target = new URL(value, url);
    if (target.origin !== url.origin)
      throw new Error("External plugin module rejected");
    return target;
  };
  for (const entry of manifest.plugins) {
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !/^[a-z][a-z0-9-]*$/.test(entry.id) ||
      records.has(entry.id) ||
      typeof entry.enabled !== "boolean" ||
      typeof entry.export !== "string" ||
      (entry.environment !== undefined &&
        !["test", "production"].includes(entry.environment)) ||
      (entry.flag !== undefined && typeof entry.flag !== "string") ||
      (entry.requires !== undefined &&
        (!Array.isArray(entry.requires) ||
          entry.requires.some((id) => typeof id !== "string"))) ||
      (entry.arguments !== undefined &&
        (!Array.isArray(entry.arguments) ||
          entry.arguments.some((value) => typeof value !== "string")))
    )
      throw new Error(`Invalid plugin catalog entry: ${entry?.id}`);
    localURL(entry.module);
    records.set(entry.id, entry);
  }
  const list = (name) =>
    new Set((parameters.get(name) || "").split(",").filter(Boolean));
  const enabled = list("plugins"),
    disabled = list("disable-plugins");
  for (const id of [...enabled, ...disabled])
    if (!records.has(id)) throw new Error(`Unknown catalog plugin: ${id}`);
  const selected = new Set();
  for (const [id, entry] of records) {
    if (disabled.has(id)) continue;
    if (
      entry.enabled ||
      enabled.has(id) ||
      parameters.get(entry.flag || id) === "1"
    ) {
      if (entry.environment && entry.environment !== environment)
        throw new Error(
          `Plugin ${id} requires ${entry.environment} environment`,
        );
      selected.add(id);
    }
  }
  const ordered = [],
    active = new Set(),
    complete = new Set();
  const visit = (id) => {
    if (complete.has(id)) return;
    if (active.has(id))
      throw new Error(`Plugin catalog dependency cycle: ${id}`);
    active.add(id);
    for (const dependency of records.get(id).requires || []) {
      if (!selected.has(dependency))
        throw new Error(`Plugin ${id} needs enabled ${dependency}`);
      visit(dependency);
    }
    active.delete(id);
    complete.add(id);
    ordered.push(records.get(id));
  };
  for (const id of selected) visit(id);
  const plugins = [];
  for (const entry of ordered) {
    const module = await importModule(localURL(entry.module));
    let plugin = module[entry.export];
    if (entry.arguments) {
      const args = [];
      for (const reference of entry.arguments) {
        if (reference.startsWith("content:")) {
          let value = content;
          for (const key of reference.slice(8).split(".")) {
            if (
              ["__proto__", "constructor", "prototype"].includes(key) ||
              !value ||
              !Object.hasOwn(value, key)
            )
              throw new Error(`Plugin ${entry.id}: missing ${reference}`);
            value = value[key];
          }
          args.push(value);
        } else if (reference.startsWith("json:"))
          args.push(await readJSON(localURL(reference.slice(5))));
        else
          throw new Error(`Plugin ${entry.id}: invalid argument ${reference}`);
      }
      if (typeof plugin !== "function")
        throw new Error(`Plugin ${entry.id}: factory missing`);
      plugin = plugin(...args);
    }
    if (plugin?.id !== entry.id)
      throw new Error(`Plugin catalog identity mismatch: ${entry.id}`);
    plugins.push(plugin);
  }
  return plugins;
}
