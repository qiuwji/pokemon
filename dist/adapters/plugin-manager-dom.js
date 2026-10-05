import { readPluginSettings, writePluginSettings } from './plugin-settings.js';

/** Browser launch panel outside the game. Changes only the next launch, never the running host. */
export function createPluginManager({ document: doc, storage, catalog, parameters, environment, restart,
  beforeOpen = () => {}, afterClose = () => {} }) {
  const panel=doc.getElementById('plugin-manager'), list=doc.getElementById('plugin-manager-list'),
    status=doc.getElementById('plugin-manager-status');
  const enabled=new Set((parameters.get('plugins') || '').split(',')),
    disabled=new Set((parameters.get('disable-plugins') || '').split(',')),
    preferences=readPluginSettings(storage), inputs=new Map();
  for (const entry of catalog.plugins) {
    const allowed=!entry.environment || entry.environment === environment;
    const row=doc.createElement('label'); row.className='plugin-row';
    const checkbox=doc.createElement('input'); checkbox.type='checkbox';
    checkbox.checked=allowed && !disabled.has(entry.id) &&
      (enabled.has(entry.id) || parameters.get(entry.flag || entry.id) === '1' || (preferences[entry.id] ?? entry.enabled));
    checkbox.disabled=!allowed;
    const description=doc.createElement('span'), title=doc.createElement('strong'), detail=doc.createElement('small');
    title.textContent=entry.name || entry.id;
    detail.textContent=allowed ? entry.description || entry.id : '仅限测试环境';
    description.append(title,detail); row.append(checkbox,description);list.append(row);inputs.set(entry.id,checkbox);
    checkbox.addEventListener('change',()=>{status.textContent='开关已调整。保存后重启游戏生效。';});
  }
  const close=()=>{panel.close();afterClose();};
  doc.getElementById('plugins-open').onclick=()=>{beforeOpen();panel.showModal();};
  doc.getElementById('plugins-close').onclick=close;
  panel.addEventListener('cancel',afterClose);
  // Prevent game keyboard shortcuts while this external panel owns input; retain native controls.
  panel.addEventListener('keydown',event=>event.stopPropagation());
  panel.addEventListener('keyup',event=>event.stopPropagation());
  const persist=()=>{
    const selection=Object.fromEntries([...inputs].map(([id,input])=>[id,input.checked]));
    for (const entry of catalog.plugins) if (selection[entry.id]) for(const dependency of entry.requires || [])
      if (!selection[dependency]) throw new Error(`${entry.name || entry.id} 需要先启用 ${dependency}`);
    writePluginSettings(storage,selection);
    status.textContent='已保存。重启游戏后生效；当前游戏保持原配置。';
  };
  doc.getElementById('plugins-save').onclick=()=>{try{persist();}catch(error){status.textContent=error.message;}};
  doc.getElementById('plugins-restart').onclick=()=>{
    try { persist(); restart(catalog.plugins); } catch(error) { status.textContent=error.message; }
  };
  return { get active(){return panel.open;}, close };
}
