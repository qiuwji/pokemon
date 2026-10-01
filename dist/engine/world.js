export const DIRECTIONS={down:[0,1],up:[0,-1],left:[-1,0],right:[1,0]};
export class World {
 constructor(maps,position,{objects=()=>[],onStep=()=>{},onBlocked=()=>{},onMap=()=>{}}={}){this.maps=maps;this.position=position;Object.assign(this,{objects,onStep,onBlocked,onMap});this.steps=0;}
 get map(){return this.maps[this.position.map];}
 resolve(id){return Object.keys(this.maps).find(k=>k.replace(/_/g,'').toUpperCase()===id.replace(/^MAP_/,'').replace(/_/g,''));}
 cell(x,y){const m=this.map;if(x<0||y<0||x>=m.width||y>=m.height)return null;const i=y*m.width+x;return {block:m.blocks[i],behavior:m.behavior[i],collision:(m.blocks[i]>>10)&3,elevation:m.blocks[i]>>12};}
 enter(map,x,y,dir=this.position.dir){Object.assign(this.position,{map,x,y,dir});this.onMap(map);}
 move(dir){
  const [dx,dy]=DIRECTIONS[dir];const p=this.position;p.dir=dir;let x=p.x+dx,y=p.y+dy,m=this.map;let cell=this.cell(x,y);
  if(!cell){const c=m.connections.find(c=>c.direction===dir);const id=c&&this.resolve(c.map);if(id){const dest=this.maps[id];if(dir==='up'){x=p.x-c.offset;y=dest.height-1;}if(dir==='down'){x=p.x-c.offset;y=0;}if(dir==='left'){x=dest.width-1;y=p.y-c.offset;}if(dir==='right'){x=0;y=p.y-c.offset;}
    const i=y*dest.width+x;if(x<0||y<0||x>=dest.width||y>=dest.height||((dest.blocks[i]>>10)&3)!==0)return false;this.steps++;this.enter(id,x,y,dir);this.onStep(this.cell(x,y));return true;}
   this.onBlocked('boundary');return false;
  }
  const jumpDir=({56:'right',57:'left',58:'up',59:'down'})[cell.behavior];let jump=false;
  if(jumpDir===dir){x+=dx;y+=dy;cell=this.cell(x,y);jump=true;}
  const warp=m.warps.find(w=>w.x===x&&w.y===y);
  if(warp&&warp.dest_map!=='MAP_DYNAMIC'&&!this.resolve(warp.dest_map)){this.onBlocked('unavailable');return false;}
  const obj=this.objects().find(n=>n.x===x&&n.y===y||n.reserved?.some(p=>p.x===x&&p.y===y));
  const oneWay=({48:'right',49:'left',50:'up',51:'down'})[cell?.behavior];
  if(!cell||obj||(cell.collision!==0&&!warp)||[16,17,18,19,20,21].includes(cell.behavior)||oneWay===dir){this.onBlocked(obj?'object':'wall',obj);return false;}
  p.x=x;p.y=y;this.steps++;
  if(warp){const id=this.resolve(warp.dest_map);if(id){const destination=this.maps[id].warps[Number(warp.dest_warp_id)];if(destination){const interior=id.includes('_');const candidates=interior?[[0,-1],[0,1],[-1,0],[1,0]]:[[0,1],[0,-1],[-1,0],[1,0]];let tx=destination.x,ty=destination.y;for(const [ox,oy] of candidates){const nx=destination.x+ox,ny=destination.y+oy;const dm=this.maps[id];if(nx>=0&&ny>=0&&nx<dm.width&&ny<dm.height&&((dm.blocks[ny*dm.width+nx]>>10)&3)===0&&!dm.warps.some(w=>w.x===nx&&w.y===ny)){tx=nx;ty=ny;break;}}this.enter(id,tx,ty,interior?'up':'down');}}}
  this.onStep(this.cell(p.x,p.y));return {jump};
 }
 interact(){const [dx,dy]=DIRECTIONS[this.position.dir];const x=this.position.x+dx,y=this.position.y+dy;let obj=this.objects().find(n=>n.x===x&&n.y===y);
  // Counters keep attendants one extra tile away.
  if(!obj&&this.cell(x,y)?.behavior===128)obj=this.objects().find(n=>n.x===x+dx&&n.y===y+dy);
  const sign=this.map.signs.find(n=>n.x===x&&n.y===y);return obj||sign&&{...sign,kind:'sign'}||null;
 }
}
export class SaveStore {
 constructor(storage,key,validate,version=1){Object.assign(this,{storage,key,validate,version});}
 save(state){const document={version:this.version,savedAt:Date.now(),state};this.storage.setItem(this.key,JSON.stringify(document));return document.savedAt;}
 load(){try{const raw=this.storage.getItem(this.key);if(!raw)return null;const d=JSON.parse(raw);if(d.version!==this.version||!this.validate(d.state))return null;return d;}catch{return null;}}
}
