// Canvas adapter. Tile assets and actors are supplied by the content pack.
export class Renderer {
 constructor(canvas,db,assets){Object.assign(this,{canvas,db,assets});this.ctx=canvas.getContext('2d');this.ctx.imageSmoothingEnabled=false;this.camera={x:0,y:0};this.previous=null;this.animStart=0;this.duration=130;this.shakeSide=-1;this.shakeUntil=0;}
 moved(from,to,jump=false){this.previous=from.map===to.map?from:null;this.animStart=performance.now();this.duration=jump?220:130;this.jumping=jump;}
 actor(name,x,y,dir='down',step=false){const image=this.assets[`actor-${name}`],def=this.db.actors[name];if(!image||!def)return;let frame=({down:0,up:1,left:2,right:2})[dir]||0;if(step&&image.width>=def.w*9)frame+=Math.floor(performance.now()/100)%2?3:6;if(frame*def.w>=image.width)frame=0;
  const c=this.ctx;const dx=Math.round(x),dy=Math.round(y);c.save();if(dir==='right'){c.translate(dx+def.w,dy);c.scale(-1,1);c.drawImage(image,frame*def.w,0,def.w,def.h,0,0,def.w,def.h);}else c.drawImage(image,frame*def.w,0,def.w,def.h,dx,dy,def.w,def.h);c.restore();}
 world(world,objects){
  const c=this.ctx,m=world.map,p=world.position;const t=Math.min(1,(performance.now()-this.animStart)/this.duration);let px=p.x*16,py=p.y*16;
  if(this.previous){px=this.previous.x*16+(px-this.previous.x*16)*t;py=this.previous.y*16+(py-this.previous.y*16)*t;}
  const cam={x:Math.round(Math.max(0,Math.min(m.width*16-320,px-152))),y:Math.round(Math.max(0,Math.min(m.height*16-224,py-104)))};this.camera=cam;
  const border=this.assets[`${m.id}-border`];c.fillStyle='#77ba96';c.fillRect(0,0,320,224);if(border){const pattern=c.createPattern(border,'repeat');c.fillStyle=pattern;c.fillRect(0,0,320,224);}
  c.drawImage(this.assets[m.id],-cam.x,-cam.y);
  const all=[...objects.map(o=>({...o,px:o.x*16,py:o.y*16})),{player:true,px,py,y:p.y}].sort((a,b)=>a.py-b.py);
  for(const o of all){const x=o.px-cam.x,y=o.py-cam.y;
   if(o.player){const lift=this.jumping&&t<1?Math.sin(t*Math.PI)*8:0;this.actor('BrendanNormal',x,y-16-lift,p.dir,t<1);}
   else if(o.species){const image=this.assets[o.species+'-front'];if(image)c.drawImage(image,0,0,64,64,x-1,y-6,20,20);}
   else {const a=this.db.actors[o.actor];this.actor(o.actor,x,y-((a?.h||16)-16),o.dir||'down');}
  }
  c.drawImage(this.assets[`${m.id}-over`],-cam.x,-cam.y);
 }
 battle(player,enemy,{capture=false}={}){
  const c=this.ctx;c.fillStyle='#e8f9db';c.fillRect(0,0,320,224);c.drawImage(this.assets['battle-bg'],0,0,320,170);
  const shake=this.shakeUntil>performance.now()?Math.sin(performance.now()/25)*4:0;
  const front=this.assets[enemy.species+'-front'],back=this.assets[player.species+'-back'];
  if(front&&enemy.hp>0&&!capture)c.drawImage(front,0,0,64,64,208+(this.shakeSide===1?shake:0),12,85,85);
  if(back&&player.hp>0)c.drawImage(back,0,0,64,64,27+(this.shakeSide===0?shake:0),90,92,92);
 }
 hurt(side){this.shakeSide=side;this.shakeUntil=performance.now()+350;}
}
export async function loadAssets(db){const ids=['battle-bg',...Object.keys(db.maps).flatMap(k=>[k,k+'-over',k+'-border']),...Object.keys(db.actors).map(k=>'actor-'+k),...Object.keys(db.species).flatMap(k=>[k+'-front',k+'-back'])];const loaded={};await Promise.all(ids.map(id=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>{loaded[id]=image;resolve();};image.onerror=()=>reject(new Error(`无法加载图像 ${id}`));image.src=`assets/${id}.png`;})));return loaded;}
