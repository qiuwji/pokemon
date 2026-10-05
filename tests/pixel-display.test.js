import test from 'node:test';
import assert from 'node:assert/strict';
import { PixelDisplay } from '../dist/adapters/pixel-display.js';
import { cameraProjection,projectWorld,unprojectScreen,pixelProjection } from '../dist/engine/camera-view.js';
import { Renderer } from '../dist/adapters/canvas-renderer.js';

test('Raster resizing matches real device pixels, keeps smoothing off and disconnects listeners',()=>{
  const ctx={},canvas={width:320,height:224,getContext:()=>ctx,getBoundingClientRect:()=>({width:613,height:429})};
  const renderer=new Renderer(canvas,{maps:{}},{});let callback,disconnected=false,removed;
  const win={devicePixelRatio:2,ResizeObserver:class {constructor(fn){callback=fn;}observe(){}disconnect(){disconnected=true;}},
    addEventListener(){},removeEventListener(_event,fn){removed=fn;}};
  const display=new PixelDisplay(canvas,(w,h)=>renderer.resizeSurface(w,h),{window:win});
  assert.deepEqual([canvas.width,canvas.height],[1226,858]);assert.equal(ctx.imageSmoothingEnabled,false);
  win.devicePixelRatio=1;callback([{contentRect:{width:480,height:336}}]);assert.equal(canvas.width,480);
  display.dispose();assert(disconnected);assert.equal(removed,display.measure);
});
test('Default field projection fits whole pixels without changing visible grid bounds or pointer inversion',()=>{
  const size={width:1226,height:858},view=cameraProjection({columns:15,rows:10,zoom:1},{x:102.6,y:50.9},size);
  const raster=pixelProjection(view,size);assert.equal(raster.scale,5);assert.equal(raster.width,240);assert.equal(raster.height,160);
  assert(Number.isInteger(raster.offsetX));assert(Number.isInteger(raster.x*raster.scale));
  const point={x:raster.x+17,y:raster.y+19};assert.deepEqual(unprojectScreen(projectWorld(point,raster),raster),point);
  assert.equal(unprojectScreen({x:0,y:0},raster),null);
  assert.equal(pixelProjection(view,size,false),view);
  const small={...view,scale:0.5};assert.equal(pixelProjection(small,size),small);
});


test('Public camera queries and browser drawing share the same raster projection',async()=>{
  const {session,manifest}=await import('./helpers/session.js');let api;
  const s=session([manifest('pixel-query',a=>{api=a;})]);
  const size={width:1226,height:858,raster:true};
  const view=await api.commands.dispatch('core.camera.view',{size});
  const renderer=new Renderer({ ...size,getContext:()=>({}) },s.db,{}, {
    projection:(surface,now)=>s.game.cameraProjection(surface,now),
    cameraConfiguration:()=>s.game.cameraConfiguration(),
  });
  assert.deepEqual(renderer.cameraAt(s.game.state.position,s.game.timeline.now()),view);
  const point={x:view.x+24,y:view.y+30};
  const projected=await api.commands.dispatch('core.camera.project',{point,size});
  assert.deepEqual(await api.commands.dispatch('core.camera.unproject',{point:projected,size}),point);
  await assert.rejects(api.commands.dispatch('core.camera.view',{size:{...size,raster:'true'}}));
});
