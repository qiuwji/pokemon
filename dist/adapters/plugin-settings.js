export const PLUGIN_SETTINGS_KEY = 'emerald.plugin-selection.v1';

/** Preferences are external launch settings, not game save data or live plugin state. */
export function readPluginSettings(storage) {
  try {
    const value = JSON.parse(storage.getItem(PLUGIN_SETTINGS_KEY) || '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') return {};
    return Object.fromEntries(Object.entries(value).filter(([id,on])=>/^[a-z][a-z0-9-]*$/.test(id) && typeof on === 'boolean'));
  } catch { return {}; }
}
export function writePluginSettings(storage, selection) {
  if (!selection || Array.isArray(selection) || typeof selection !== 'object' || Object.entries(selection).some(([id,on])=>!/^[a-z][a-z0-9-]*$/.test(id) || typeof on !== 'boolean'))
    throw new Error('Invalid plugin selection');
  storage.setItem(PLUGIN_SETTINGS_KEY,JSON.stringify(selection));
}

/** Catalog-owned startup actions run through the same validated command bus as normal actions. */
export async function startPlugins(plugins, bus) {
  const issues=[];
  for (const plugin of plugins) for (const command of plugin.startup || []) {
    try {
      const result=await bus.execute(command,{},'system');
      if (result?.ok === false) issues.push(`${plugin.id}: ${result.reason || '初始化未完成'}`);
    } catch(error) { issues.push(`${plugin.id}: ${error.message}`); }
  }
  return issues;
}
