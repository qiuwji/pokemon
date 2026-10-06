import test from 'node:test';
import assert from 'node:assert/strict';
import { readPluginSettings, writePluginSettings, startPlugins } from '../src/adapters/plugin-settings.js';
import { loadPluginCatalog } from '../src/adapters/plugin-loader.js';
import { createPluginManager } from '../src/adapters/plugin-manager-dom.js';
const storage = () => {
  const records=new Map();
  return {getItem:key=>records.get(key)||null,setItem:(key,value)=>records.set(key,value)};
};
test('Saved launch selection changes catalog loading; explicit URL selection has defined precedence',async()=>{
  const store=storage();writePluginSettings(store,{one:false,two:true});
  const catalog={version:1,plugins:['one','two'].map(id=>({id,enabled:id==='one',module:`./${id}.js`,export:'plugin'}))};
  const load=parameters=>loadPluginCatalog({url:new URL('https://local.test/plugins/catalog.json'),manifest:catalog,
    selection:readPluginSettings(store),parameters:new URLSearchParams(parameters),
    importModule:url=>({plugin:{id:url.pathname.split('/').at(-1).split('.')[0]}})});
  assert.deepEqual((await load('')).map(p=>p.id),['two']);
  assert.deepEqual((await load('plugins=one&disable-plugins=two')).map(p=>p.id),['one']);
  assert.throws(()=>writePluginSettings(store,{one:'true'}),/Invalid/);
  assert.throws(()=>writePluginSettings(store,[]),/Invalid/);
});
test('Startup failures are reported without preventing other catalog-owned startup actions',async()=>{
  const commands=[];
  const issues=await startPlugins([{id:'a',startup:['a:first','a:second']},{id:'b',startup:['b:third']}],{
    execute:async(id,args,source)=>{commands.push({id,args,source});if(id==='a:first')return {ok:false,reason:'Full'};return {ok:true};},
  });
  assert.deepEqual(issues,['a: Full']);assert.equal(commands.length,3);
  assert(commands.every(c=>c.source==='system'));
  await assert.rejects(loadPluginCatalog({url:new URL('https://local.test/plugins/catalog.json'),manifest:{version:1,plugins:[
    {id:'a',enabled:true,module:'./a.js',export:'plugin',startup:['core.item.use']},
  ]}}),/Invalid plugin catalog entry/);
});
test('External plugin manager saves next-launch settings and does not restart until requested',()=>{
  const nodes=new Map(),create=()=>({children:[],open:false,append(...children){this.children.push(...children);},
    addEventListener(){},showModal(){this.open=true;},close(){this.open=false;}});
  const document={createElement:create,getElementById:id=>{if(!nodes.has(id))nodes.set(id,create());return nodes.get(id);}};
  const store=storage();let restarts=0,clears=0;
  const manager=createPluginManager({document,storage:store,parameters:new URLSearchParams(),environment:'production',
    catalog:{plugins:[{id:'demo',enabled:false}]},restart:()=>restarts++,beforeOpen:()=>clears++});
  document.getElementById('plugins-open').onclick();assert(manager.active);assert.equal(clears,1);
  const checkbox=document.getElementById('plugin-manager-list').children[0].children[0];checkbox.checked=true;
  document.getElementById('plugins-save').onclick();assert.equal(restarts,0);
  assert.deepEqual(readPluginSettings(store),{demo:true});
  document.getElementById('plugins-restart').onclick();assert.equal(restarts,1);
  manager.close();assert.equal(manager.active,false);
});
