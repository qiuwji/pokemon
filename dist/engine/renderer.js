import {SceneGraph,GridMotion,actorFrame} from './motion.js';
// Draw each 8x8 source tile into a 16x16 map grid. No pre-rendered scene images.
export class Renderer {
 constructor(canvas,db,assets){Object.assign(this,{canvas,db,assets});this.ctx=canvas.getContext('2d');this.ctx.imageSmoothingEnabled=false;this.graph=new SceneGraph(db.maps);this.motion=new GridMotion(this.graph);this.camera={x:0,y:0};this.shakeSide=-1;this.shakeUntil=0;this.fadeStart=0;this.lastZone=null;}
 moving(now=performance.now()){return this.motion.moving(now);}
 moved(from,to,jump=false,{running=false}={}){const smooth=this.motion.begin(from,to,performance.now(),{running,jump});if(!smooth){this.fadeStart=performance.now();this.lastZone=null;}}
 actor(name,x,y,dir='down',progress=1,foot=0,moving=false){const image=this.assets[`actor-${name}`],def=this.db.actors[name];if(!image||!def)return;let frame=actorFrame(dir,progress,foot,moving);if(frame.index*def.w>=image.width)frame={index:0,flip:false};const c=this.ctx,dx=Math.round(x),dy=Math.round(y);c.save();if(frame.flip){c.translate(dx+def.w,dy);c.scale(-1,1);c.drawImage(image,frame.index*def.w,0,def.w,def.h,0,0,def.w,def.h);}else c.drawImage(image,frame.index*def.w,0,def.w,def.h,dx,dy,def.w,def.h);c.restore();}
 tile(pack,value,x,y,now){const base=value&~3072;const animation=pack.animations[base];const index=animation?animation.frames[Math.floor(now/animation.ms)%animation.frames.length]:pack.lookup[base];if(index===undefined)return;const image=this.assets['tiles-'+pack.id];const sx=index%pack.columns*8,sy=Math.floor(index/pack.columns)*8;const c=this.ctx;if(value&3072){c.save();c.translate(x+(value&1024?8:0),y+(value&2048?8:0));c.scale(value&1024?-1:1,value&2048?-1:1);c.drawImage(image,sx,sy,8,8,0,0,8,8);c.restore();}else c.drawImage(image,sx,sy,8,8,x,y,8,8);}
 grid(pack,id,x,y,overlay,now){id&=1023;const vals=pack.metatiles[id];if(!vals)return;const layer=pack.attributes[id]>>12;if(overlay&&layer===1)return;if(!overlay){this.ctx.fillStyle=`rgb(${pack.background.join(',')})`;this.ctx.fillRect(x,y,16,16);}for(let i=overlay?4:0;i<8;i++)this.tile(pack,vals[i],x+i%2*8,y+Math.floor(i%4/2)*8,now);}
 drawMap(id,overlay,now){const m=this.db.maps[id],origin=this.graph.placements[id],pack=this.db.tilesets[m.tileset];const minX=Math.max(0,Math.floor(this.camera.x/16)-origin.x),maxX=Math.min(m.width,Math.ceil((this.camera.x+320)/16)-origin.x),minY=Math.max(0,Math.floor(this.camera.y/16)-origin.y),maxY=Math.min(m.height,Math.ceil((this.camera.y+224)/16)-origin.y);for(let y=minY;y<maxY;y++)for(let x=minX;x<maxX;x++)this.grid(pack,m.blocks[y*m.width+x],Math.round((origin.x+x)*16-this.camera.x),Math.round((origin.y+y)*16-this.camera.y),overlay,now);}
 world(world,npcs,now=performance.now()){
  const p=world.position,m=world.map,player=this.motion.sample(p,now),c=this.ctx;this.camera={x:Math.round(player.x-152),y:Math.round(player.y-104)};
  const ids=this.graph.visible(p.map,this.camera),pack=this.db.tilesets[m.tileset];
  // Borders use the same metatile grid, including animated source tiles.
  const origin=this.graph.placements[p.map];const startX=Math.floor(this.camera.x/16),startY=Math.floor(this.camera.y/16);for(let y=startY;y<startY+15;y++)for(let x=startX;x<startX+21;x++){const bx=((x-origin.x)%2+2)%2,by=((y-origin.y)%2+2)%2;this.grid(pack,m.border[by*2+bx],x*16-this.camera.x,y*16-this.camera.y,false,now);}
  for(const id of ids)this.drawMap(id,false,now);
  const all=ids.flatMap(id=>{const o=this.graph.placements[id];return npcs.view(id,now).map(n=>({...n,px:n.px+o.x*16,py:n.py+o.y*16}));});all.push({...player,player:true,px:player.x,py:player.y});all.sort((a,b)=>a.py-b.py);
  for(const n of all){const x=n.px-this.camera.x,y=n.py-this.camera.y;if(x<-32||x>352||y<-32||y>256)continue;
   if(n.player)this.actor(n.running?'BrendanRun':'BrendanNormal',x,y-16-n.lift,n.dir,n.progress,n.foot,n.moving);
   else if(n.species){const image=this.assets[n.species+'-front'];if(image){const hop=n.movement?.mode==='jog'?Math.sin(now/80)*1.3:0;c.drawImage(image,0,0,64,64,x-1,y-6-hop,20,20);}}
   else this.actor(n.actor,x,y-((this.db.actors[n.actor]?.h||16)-16),n.dir,n.progress,n.foot,n.moving);
  }
  for(const id of ids)this.drawMap(id,true,now);
  if(this.lastZone!==player.zone){if(this.lastZone!==null)this.fadeStart=now;this.lastZone=player.zone;}
  const fade=Math.max(0,1-(now-this.fadeStart)/160);if(fade>0){c.fillStyle=`rgba(13,29,20,${fade})`;c.fillRect(0,0,320,224);}
 }
 battle(player,enemy,{capture=false}={}){const c=this.ctx;c.fillStyle='#e8f9db';c.fillRect(0,0,320,224);c.drawImage(this.assets['battle-bg'],0,0,320,170);const shake=this.shakeUntil>performance.now()?Math.sin(performance.now()/25)*4:0;const front=this.assets[enemy.species+'-front'],back=this.assets[player.species+'-back'];if(front&&enemy.hp>0&&!capture)c.drawImage(front,0,0,64,64,208+(this.shakeSide===1?shake:0),12,85,85);if(back&&player.hp>0)c.drawImage(back,0,0,64,64,27+(this.shakeSide===0?shake:0),90,92,92);}
 hurt(side){this.shakeSide=side;this.shakeUntil=performance.now()+350;}
}
export async function loadAssets(db){for(const [id,pack] of Object.entries(db.tilesets))pack.id=id;const ids=['battle-bg',...Object.keys(db.tilesets).map(k=>'tiles-'+k),...Object.keys(db.actors).map(k=>'actor-'+k),...Object.keys(db.species).flatMap(k=>[k+'-front',k+'-back'])];const loaded={};await Promise.all(ids.map(id=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{loaded[id]=image;resolve();};image.onerror=()=>reject(new Error(`无法加载图像 ${id}`));image.src=`assets/${id}.png`;})));return loaded;}
