import { FrameSequenceBuilder } from "../../engine/extensions/frame-sequence-builder.js";
import { MOVIE_AFFINE_FRAMES } from "../../../generated/packs/emerald/launch-art.js";
import { sin } from "./battle/animation-math.js";
const clamp = (n, max) => Math.max(0, Math.min(max, n));
const s = (name, x, y, width = 32, height = 32, extra = {}) => ({ resource: "launch-movie-" + name, width, height, x, y, ...extra });
const solid = color => ({ resource: "launch-solid", width: 240, height: 160, x: 120, y: 80, tint: { color, amount: 16 } });
const fade = (sprites, color, amount) => amount ? sprites.map(sprite => ({ ...sprite, tint: { color, amount: clamp(amount, 16) } })) : sprites;
const wrap = (name, x = 0, y = 0, extra = {}) => [-256, 0, 256].map(dx => s(name, 128 + x + dx, 128 + y, 256, 256, extra));
const alpha = index => index >= 16 ? [Math.max(0, 31-index),16] : [16,Math.max(0,index)];
// The native window leaves palette zero visible above/below its scene.
const windowEdges = (y, white = 0) => y > 0 ? [
  { ...solid(Array(3).fill((31*clamp(white,16)>>4)*8)), y:y/2, scaleY:y/160 },
  { ...solid(Array(3).fill((31*clamp(white,16)>>4)*8)), y:160-y/2, scaleY:y/160 },
] : [];

function drop(frame, start, x, y, target, size, big = false) {
  let age = frame-start;
  if (age < 0) return [];
  let ripple = false, rippleAge = 0, rotation = 0;
  if (big && age < 176) {
    const slide = clamp(age-1,120);
    x -= slide; y += Math.floor(slide/2) + Math.trunc(sin(slide*2,256)/32);
    rotation = (-Math.trunc(sin(slide*2+64,256)/16)-16) * Math.PI/128;
    if (slide >= 120) { x=120+Math.trunc(sin(64+Math.min(age-122,8)*8+64,256)/64); rotation=0; }
  } else {
    const fallAge = big ? age-176 : age;
    if (big) { x=120; y=43; }
    const steps = Math.ceil((target-y)/4);
    if (fallAge <= steps) y += 4*fallAge;
    else { y=target; ripple=true; rippleAge=fallAge-steps-1; }
  }
  if (ripple) {
    return [0,8,16].flatMap(delay => {
      const a=rippleAge-delay;
      if (a<0) return [];
      let matrix=1024;
      for (let i=0;i<a;i++) matrix=Math.floor(matrix*95/100);
      return matrix<192 ? [] : [s("ripple",x,y,64,32,{ scaleX:256/matrix,scaleY:256/matrix })];
    });
  }
  const scale=256/(size+32);
  return [s("drop",x,y,32,32,{tileFrame:0,scaleX:scale,scaleY:scale}),
    s("drop",x,y,32,32,{tileFrame:1,scaleX:scale,scaleY:scale,rotation}),
    s("drop",x,y,32,32,{tileFrame:2,scaleX:scale,scaleY:scale/2,rotation})];
}

function leaf(frame) {
  const pan=clamp(frame-561,343), sprites=[solid([0,0,0])];
  sprites.push(s("leaf-3",128,128,256,256));
  const offsets=[40-Math.ceil(pan*.75),24-Math.ceil(pan*.5),80-Math.ceil(pan*.375)];
  for(const layer of [2,1,0]) sprites.push(s("leaf-"+layer,128,128-offsets[layer],256,256));
  sprites.push(...drop(frame,76,236,-14,120,512,true), ...drop(frame,368,48,0,112,1024), ...drop(frame,384,200,60,128,1024));
  if(frame>=128 && frame<320) sprites.push(s("game-freak",120,74,32,64,{alpha:alpha(frame<256 ? 31-Math.floor((frame-128)/2) : Math.min(31,Math.floor((frame-256)/2))),scaleX:1+clamp(frame-272,48)/128,scaleY:1+clamp(frame-272,48)/128}));
  const letters=[0,1,2,3,4,5,3,1,6], xs=[-72,-56,-40,-24,8,24,40,56,72], delays=[0,23,23,49,62,36,36,10,10];
  letters.forEach((tileFrame,i) => {
    const age=frame-delays[i]; if(age<0 || frame>=320)return;
    const size=age<16 ? (128+16*age)/256 : age<24 ? (384-16*(age-16))/256 : 1;
    const grow=clamp(frame-272,48), delta=Math.floor(grow*Math.abs(i-4)/4)*(i<4?-1:1);
    sprites.push(s("letter",120+xs[i]+delta,76,16,16,{tileFrame,scaleX:frame<272?size:1+grow/32,scaleY:frame<272?size:1+grow/32,
      ...(frame>=272?{alpha:alpha(Math.min(31,Math.floor((frame-256)/2)))}:{})}));
  });
  const coords=[[124,40],[102,30],[77,30],[54,15],[148,9],[63,28],[93,40],[148,32],[173,41],[94,20]];
  coords.forEach(([x,y],i)=>{const age=frame-560-i*13;if(age>=0&&age<12)sprites.push(s("sparkle",x,y+Math.floor((i*13+1)/2),16,16,{tileFrame:Math.floor(age/2)%5}));});
  if(frame>=832) {
    const age=frame-832, first=Math.min(age,19), scale=age<20?256/(128+7*first):256/(512+2*(age-20));
    const x=age<20?120-sin(first*3,140):20+sin(16+Math.floor((age-20)/5),34);
    const y=age<20?160-sin(first*3,120):40-sin(80+Math.floor((age-20)/5),60);
    sprites.push(s("flygon-silhouette",x,y,64,32,{scaleX:scale,scaleY:scale}));
  }
  return {sprites:fade(sprites,frame>=1008?[248,248,248]:[0,0,0],frame>=1008?frame-1007:16-frame)};
}

function playerX(global) {
  if(global<1109)return 272-(global-1029);
  if(global<1214)return 192+Math.floor((global-1104)/8);
  if(global<1398)return 205-(global-1214);
  if(global<1576)return 21+(global-1398)-Math.max(0,Math.floor((global-1497)/8));
  return global<1727?189:Math.max(-34,189-2*(global-1726));
}
function volbeat(age) {
  if(age<179)return {x:272,y:80};
  if(age<232)return {x:272-4*(age-178),y:80};
  if(age<252)return {x:60,y:80+sin(age*4+64,2)};
  if(age<260)return {x:60+8*(age-251),y:80-2*(age-251)};
  if(age<280)return {x:124,y:64+sin(age*4+64,2)};
  if(age<284)return {x:124,y:64+4*(age-279)};
  if(age<294)return {x:124,y:80+sin(age*4+64,2)};
  if(age<302)return {x:124-8*(age-293),y:80-2*(age-293)};
  if(age<312)return {x:60,y:64+sin(age*4+64,2)};
  const local=age-312;
  return local<320?{x:120+sin(192+2*local,60),y:64+sin(128+4*local,20)}:{x:179-2*(local-319),y:64+sin(128+4*local,20)};
}
function bike(frame,gender) {
  const global=1029+frame, bgAge=Math.min(frame,1856-1029), sprites=[solid([0,0,0])];
  sprites.push(...wrap("trees-far",-8+Math.ceil(bgAge/256)));
  for(let i=0;i<12;i++) {
    const group=Math.floor(i/4), first=group===0?16:group===1?40:32, speed=group===0?.125:.0625;
    const x=(first+64*(i%4)+Math.floor(bgAge*speed)+32)%288-32;
    sprites.push(s("small-tree-"+group,x,88,group===0?32:16,32));
  }
  sprites.push(...wrap("trees-near",Math.ceil(bgAge/4)),...wrap("grass",4*bgAge%256));
  const flyAge=global-1394;
  let flyX=-64;
  if(flyAge>=0)flyX=flyAge<46?-64+8*(flyAge+1):flyAge<231?304-(flyAge-45):Math.max(-64,120-2*(flyAge-230));
  const flyY=60+sin(frame*4,8)-sin((Math.min(frame,512)>>2)&127,48);
  sprites.push(s("flygon",flyX+32,flyY,64,64,{tileFrame:1}),s("flygon",flyX-32,flyY,64,64));
  const v=volbeat(frame); if(v.x>=-16)sprites.push(s("volbeat",v.x,v.y,32,32,{tileFrame:Math.floor(frame/2)%2}));
  const x=playerX(global),y=100;
  sprites.push(s("bicycle",x,y+8,64,32,{tileFrame:Math.floor(frame/8)%4}),s(gender==="female"?"may":"brendan",x,y,64,64,{tileFrame:Math.floor(frame/4)%4}));
  let tx=288,tf=[0,1,2,1][Math.floor(frame/5)%4];
  if(global>=1224){tx-=Math.floor((Math.min(global,1576)-1224)/4);tf=[0,1,2,1][Math.floor((global-1224)/3)%4];}
  if(global>=1576){tx+=Math.floor((Math.min(global,1735)-1576)/8);tf=[0,1,2,1][Math.floor((global-1576)/5)%4];}
  if(global>=1735){tx-=Math.floor((Math.min(global,1815)-1735)/4);tf=[0,1,2,1][Math.floor((global-1735)/3)%4];}
  if(global>=1815){const a=global-1815;tf=a<4?3:a<10?4:5;tx+=Math.max(0,a-10)*4;}
  if(tx>336){tx=340-Math.max(0,global-1859)*2;tf=[0,1,2,1][Math.floor((global-1859)/3)&3];}
  sprites.push(s("torchic",tx,110,32,32,{tileFrame:tf}));
  if(global>=1088) {
    const a=global-1088;
    let mx=272-2*Math.min(a,80),my=128;
    if(a>=80){const n=a-80,phase=(128+n)&255;mx=112-48*Math.max(0,Math.floor((n+64)/256))+sin(phase,phase<64?16:64);my=116+sin(n+64,12);}
    if(mx>=-32)sprites.push(s("manectric",mx,my,64,64,{tileFrame:Math.floor(frame/4)%4}));
  }
  return {sprites:fade(sprites,[248,248,248],global>1946?Math.floor((global-1946)/9):16-frame)};
}

function legend(id,frame) {
  const stage=MOVIE_AFFINE_FRAMES[id][frame];
  const waveAge=id==="groudon"?Math.max(0,frame-10):frame;
  const sprites=[...wrap(id+"-wave",0,0,{tileFrame:(waveAge>>1)%64}),s(`${id}-affine-${Math.floor(frame/120)}`,120,80,240,160,{tileFrame:frame%120})];
  if(id==="groudon"&&frame>=25) {
    [[104,0,192],[142,3,640],[83,1,384],[155,0,128],[56,2,512],[174,1,256]].forEach(([x,tileFrame,speed])=>{
      const age=frame-25, floating=Math.min(age+1,62), exit=Math.max(0,frame-86);
      const y=160-Math.floor(floating*speed/256);
      sprites.push(s("rocks",x+(x<120?-2:2)*exit,y+(y<80?-2:2)*exit+(Math.floor((age+1)/2)%2)*3,32,32,{tileFrame}));
    });
  }
  if(id==="kyogre") {
    const body=[[66,64,1],[96,96,8],[128,64,1],[144,48,8],[160,72,1],[176,96,8]];
    const fins=[[96,96,1],[112,104,8],[128,96,1],[88,32,8],[104,24,1],[120,32,8]];
    for(const [at,positions]of[[30,body],[55,body],[99,body],[197,body],[55,fins],[99,fins]]) {
      positions.forEach(([x,y,delay])=>{
        const age=frame-at-delay;
        if(age<0||age>=20)return;
        const exit=Math.max(0,frame-213);
        sprites.push(s("bubbles",x+(x<120?-3:3)*exit+sin(age*11,4),y+(y<80?-3:3)*exit-Math.floor(age*48/256),16,32,{tileFrame:Math.floor(age/4)}));
      });
    }
  }
  return {sprites:[solid(id==="groudon"?Array(3).fill((31*stage.fadeIn>>4)*8):[0,0,0]),
    ...fade(sprites,[248,248,248],stage.fadeOut||stage.fadeIn),...windowEdges(stage.clip,id==="groudon"?stage.fadeIn:0)]};
}
function clouds(frame) {
  const offset=80-clamp((frame-16)/2,80), dark=clamp(Math.floor((frame-96)/4),16);
  const sprites=[s("clouds-sun0",128,128,256,256)];
  for(const [name,dir]of[["right",1],["left",-1]])for(let i=0;i<2;i++)sprites.push(s(`clouds-${name}${i}`,128+i*256+dir*offset,128,256,256));
  return {sprites:[solid([0,0,0]),...fade(sprites,frame<32?[248,248,248]:[72,80,80],frame<32?clamp(32-frame,16):dark),...windowEdges(32)]};
}
function ray(frame,lightning=false) {
  const sprites=[s("rayquaza",128,128,256,256),s("rayquaza_clouds",128,128,256,256)];
  const dark=lightning?16:frame<44?16:Math.max(0,16-Math.floor((frame-44)/2));
  const base=[solid([0,0,0]),...fade(sprites,[72,80,80],dark)];
  if(lightning)for(const [start,x]of[[1,200],[73,40]]) {
    const a=frame-start;if(a>=0&&a<4)for(let i=0;i<3;i++)base.push(s("lightning",x,48+i*32,32,32,{tileFrame:i+(a>=2?3:0)}));
  }
  else if(frame>=44&&frame<146&&(frame&1)===0){const scale=256/(256-Math.trunc(sin(Math.min(64,Math.floor((frame-44)/2)),256)/2));base.push(s("orb",120,88,64,64,{scaleX:scale,scaleY:scale}));}
  return {sprites:[...fade(base,[248,248,248],lightning?0:frame>=129?frame-128:0),...windowEdges(32,lightning?0:frame>=129?frame-128:0)]};
}
export const EMERALD_MOVIE_CHAPTERS = Object.freeze([
  {id:"leaf",frames:1029,music:"MUS_INTRO"},{id:"bike",frames:1041}, {id:"spin",frames:44,music:"MUS_INTRO_BATTLE"},
  {id:"groudon",frames:151},{id:"kyogre",frames:278},{id:"clouds",frames:176},{id:"lightning",frames:121},{id:"ray",frames:206},
]);
export function emeraldMovieClip(id,start=0,frames=240,{gender="male"}={}) {
  const chapter=EMERALD_MOVIE_CHAPTERS.find(part=>part.id===id);
  if(!chapter || !Number.isInteger(start) || start<0 || start>=chapter.frames || !Number.isInteger(frames) || frames < 1 || frames > 3600 || !["male","female"].includes(gender))throw new Error("Invalid movie chapter");
  const count=Math.min(frames,chapter.frames-start);
  const sample=n=>{
    const frame=start+n;
    if(id==="leaf")return leaf(frame);
    if(id==="bike")return bike(frame,gender);
    if(["groudon","kyogre"].includes(id))return legend(id,frame);
    if(id==="clouds")return clouds(frame);
    if(id==="lightning"||id==="ray")return ray(frame,id==="lightning");
    const scale=Math.max(.01,Math.min(10,frame*(frame-1)/256));
    return {sprites:fade([solid([0,0,0]),s("pokeball",120,80,256,256,{scaleX:scale,scaleY:scale,rotation:frame*Math.PI/32})],[248,248,248],frame>=28?frame-27:0)};
  };
  const builder = new FrameSequenceBuilder().track({frames:count,sample});
  const cue = {groudon:[51,"emerald:cry.groudon"],kyogre:[124,"emerald:cry.kyogre"],ray:[44,"emerald-audio:se_intro_blast"]}[id];
  if(cue && cue[0]>=start && cue[0]<start+count) builder.cue(cue[1],{at:cue[0]-start});
  return builder.build();
}
