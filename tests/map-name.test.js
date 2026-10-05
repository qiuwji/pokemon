import test from 'node:test';
import assert from 'node:assert/strict';
import { MapNameDOM } from '../dist/adapters/map-name-dom.js';
test('Interior entry cancels the exterior name; exterior policy remains configurable', () => {
  const visible = new Set(), jobs = new Map(); let next = 0;
  const element = {textContent:'',classList:{add:k=>visible.add(k),remove:k=>visible.delete(k)}};
  const popup = new MapNameDOM({element,schedule:fn=>{jobs.set(++next,fn);return next;},cancel:id=>jobs.delete(id)});
  popup.show('未白镇',{indoor:false}); assert(visible.has('show')); assert.equal(jobs.size,1);
  popup.show('家',{indoor:true}); assert.equal(visible.size,0); assert.equal(jobs.size,0);
  popup.show('洞穴',{showMapName:false}); assert.equal(jobs.size,0);
  popup.show('古辰镇',{}); assert.equal(element.textContent,'古辰镇'); jobs.get(next)(); assert.equal(visible.size,0);
});
