import {damage,captureCheck,stageMultiplier,accuracyMultiplier,grantExperience} from './model.js';
const STRUGGLE={name:'挣扎',power:50,accuracy:0,pp:1,priority:0,type:'normal',effect:'recoil',chance:0};
export class Battle {
 constructor({party,enemy,db,rng,bag,trainer=false,script=null,effects={}}){
  Object.assign(this,{party,enemy,db,rng,bag,trainer,script,effects});this.active=party.findIndex(m=>m.hp>0);this.stages=[{},{}];this.confused=[0,0];this.focus=[false,false];this.protected=[false,false];this.bide=[null,null];this.traps=[0,0];this.flinched=[false,false];this.participants=new Set([this.active]);this.turn=0;this.fleeAttempts=0;this.ended=false;this.result=null;this.events=[];
 }
 get player(){return this.party[this.active];}
 name(mon){return this.db.species[mon.species].name;}
 emit(text,kind='text',extra={}){this.events.push({text,kind,player:structuredClone(this.player),enemy:structuredClone(this.enemy),...extra});}
 speed(mon,side){return Math.floor(mon.stats.spe*stageMultiplier(this.stages[side].spe||0)*(mon.status==='paralysis'?.25:1));}
 changeStage(side,key,n){const before=this.stages[side][key]||0;this.stages[side][key]=Math.min(6,Math.max(-6,before+n));return before!==this.stages[side][key];}
 enemyMove(){const options=this.enemy.moves.map((m,i)=>({...m,index:i})).filter(m=>m.pp>0);return options.length?options[this.rng.int(options.length)].index:-1;}
 act(action){
  this.events=[];if(this.ended)return this.events;
  if(this.player.hp<=0&&action.kind!=='switch'){this.emit('请选择一只还能战斗的宝可梦。','invalid');return this.events;}
  const wasFainted=this.player.hp<=0;
  if(action.kind==='switch'){
   const m=this.party[action.index];if(!m||m.hp<=0||action.index===this.active){this.emit('这只宝可梦无法替换上场。','invalid');return this.events;}
   this.active=action.index;this.participants.add(action.index);this.stages[0]={};this.confused[0]=0;this.focus[0]=false;this.bide[0]=null;this.emit(`去吧，${this.name(m)}！`,'switch');if(wasFainted)return this.events;
  }else if(action.kind==='potion'){
   const target=this.party[action.index??this.active];if(!this.bag.potion||!target||target.hp<=0||target.hp===target.stats.hp){this.emit('现在无法使用伤药。','invalid');return this.events;}
   this.bag.potion--;target.hp=Math.min(target.stats.hp,target.hp+20);this.emit(`${this.name(target)} 恢复了体力。`,'heal');
  }else if(action.kind==='ball'){
   if(this.trainer||this.script==='rescue'){this.emit('现在不能捕捉对方的宝可梦！','invalid');return this.events;}
   if(!this.bag.pokeball){this.emit('精灵球已经用完了。','invalid');return this.events;}
   this.bag.pokeball--;this.emit('投出了精灵球！','ball');const result=captureCheck(this.enemy,this.db.species[this.enemy.species],this.rng);
   this.emit(result.caught?`太好了！捉到了 ${this.name(this.enemy)}！`:`${'晃动…'.repeat(result.shakes)}宝可梦挣脱了！`,'capture',result);
   if(result.caught){this.ended=true;this.result='caught';return this.events;}
  }else if(action.kind==='run'){
   if(this.trainer||this.script==='rescue'){this.emit('这场战斗无法逃跑。','invalid');return this.events;}
   this.fleeAttempts++;const odds=Math.floor(this.speed(this.player,0)*128/Math.max(1,this.speed(this.enemy,1)))+30*this.fleeAttempts;
   if(this.player.ability==='run_away'||this.speed(this.player,0)>=this.speed(this.enemy,1)||this.rng.int(256)<odds){this.ended=true;this.result='escaped';this.emit('成功逃脱了！','end');return this.events;}
   this.emit('没能逃脱！');
  }else if(action.kind!=='move')return this.events;
  this.turn++;this.protected=[false,false];this.flinched=[false,false];
  const ei=this.enemyMove();
  if(action.kind==='move'){
   const selected=this.player.moves[action.index];const available=this.player.moves.some(m=>m.pp>0);
   if(available&&(!selected||selected.pp<=0)){this.emit('这个招式没有剩余 PP。','invalid');return this.events;}
   const pi=available?action.index:-1;const pm=pi<0?STRUGGLE:this.db.moves[this.player.moves[pi].id];const em=ei<0?STRUGGLE:this.db.moves[this.enemy.moves[ei].id];
   const first=pm.priority!==em.priority?pm.priority>em.priority:this.speed(this.player,0)!==this.speed(this.enemy,1)?this.speed(this.player,0)>this.speed(this.enemy,1):this.rng.next()<.5;
   for(const side of first?[0,1]:[1,0]){if(this.ended||this.player.hp<=0||this.enemy.hp<=0)break;this.executeMove(side,side===0?pi:ei);this.checkFaint();}
  }else{this.executeMove(1,ei);this.checkFaint();}
  if(!this.ended){for(const side of [0,1]){const mon=side===0?this.player:this.enemy;if(mon.hp<=0)continue;
   if(mon.status==='poison'||mon.status==='burn'){mon.hp=Math.max(0,mon.hp-Math.max(1,Math.floor(mon.stats.hp/8)));this.emit(`${this.name(mon)} 受到了${mon.status==='poison'?'中毒':'灼伤'}伤害！`,'hurt',{side});this.checkFaint();if(this.ended)break;}
   if(this.traps[side]>0){this.traps[side]--;mon.hp=Math.max(0,mon.hp-Math.max(1,Math.floor(mon.stats.hp/16)));this.emit(`${this.name(mon)} 受到了持续伤害！`,'hurt',{side});this.checkFaint();}
  }}
  return this.events;
 }
 executeMove(side,index){
  const mon=side===0?this.player:this.enemy,target=side===0?this.enemy:this.player,other=1-side;const slot=mon.moves[index];const move=index<0?STRUGGLE:this.db.moves[slot.id];
  if(this.flinched[side]){this.emit(`${this.name(mon)} 因畏缩无法行动！`);return;}
  if(mon.status==='sleep'){if(--mon.sleep<=0){mon.status=null;this.emit(`${this.name(mon)} 醒来了！`);}else{this.emit(`${this.name(mon)} 正在熟睡。`);return;}}
  if(mon.status==='freeze'){if(this.rng.next()<.2){mon.status=null;this.emit('冰冻解除了！');}else{this.emit(`${this.name(mon)} 被冻住了！`);return;}}
  if(mon.status==='paralysis'&&this.rng.next()<.25){this.emit(`${this.name(mon)} 因麻痹无法行动！`);return;}
  if(this.confused[side]>0){this.confused[side]--;if(this.confused[side]&&this.rng.next()<.5){const hurt=damage(mon,mon,{power:40,type:'normal'}, {...this.db,typeChart:{},species:{...this.db.species,[mon.species]:{...this.db.species[mon.species],types:[]}}},this.rng,{aStages:this.stages[side],dStages:this.stages[side]}).amount;mon.hp=Math.max(0,mon.hp-hurt);this.emit(`${this.name(mon)} 在混乱中攻击了自己！`,'hurt',{side});return;}}
  if(this.bide[side]){const b=this.bide[side];if(--b.turns>0){this.emit(`${this.name(mon)} 正在忍耐！`);return;}target.hp=Math.max(0,target.hp-b.damage*2);this.bide[side]=null;this.emit('释放了忍耐的力量！','hurt',{side:other});return;}
  if(slot)slot.pp--;this.emit(`${this.name(mon)} 使用了 ${move.name}！`,'move',{side});
  if(this.protected[other]){this.emit('对方保护了自己！');return;}
  let ac=(this.stages[side].acc||0)-(this.stages[other].eva||0);
  if(move.accuracy&&this.rng.next()*100>=move.accuracy*accuracyMultiplier(Math.max(-6,Math.min(6,ac)))){this.emit('攻击没有命中！');return;}
  const effect=move.effect;
  const handler=this.effects[effect];if(handler?.({battle:this,side,mon,target,move,other})===true)return;
  const selfEffect=['attack_up','defense_up','speed_up_2','attack_up_2','defense_up_2','special_attack_up','special_defense_up','evasion_up','bulk_up','calm_mind'];
  const downs={attack_down:['atk',-1],special_attack_down:['spa',-1],defense_down:['def',-1],speed_down:['spe',-1],accuracy_down:['acc',-1],defense_down_2:['def',-2],speed_down_2:['spe',-2],special_defense_down:['spd',-1],special_defense_down_2:['spd',-2]};
  const ups={attack_up:['atk',1],defense_up:['def',1],speed_up_2:['spe',2],attack_up_2:['atk',2],defense_up_2:['def',2],special_attack_up:['spa',1],special_defense_up:['spd',1],evasion_up:['eva',1]};
  if(move.power===0){
   if(downs[effect]){const [k,n]=downs[effect];const changed=this.changeStage(other,k,n);this.emit(changed?`对方的${({atk:'攻击',def:'防御',spe:'速度',acc:'命中率',spd:'特防'})[k]}下降了！`:'能力已经无法再降低了！');}
   else if(ups[effect]){const [k,n]=ups[effect];this.emit(this.changeStage(side,k,n)?'能力提高了！':'能力已经无法再提高了！');}
   else if(effect==='bulk_up'||effect==='calm_mind'){for(const k of effect==='bulk_up'?['atk','def']:['spa','spd'])this.changeStage(side,k,1);this.emit('能力提高了！');}
   else if(effect==='focus_energy'){this.focus[side]=true;this.emit('正在集中精神！');}
   else if(effect==='protect'||effect==='detect'){this.protected[side]=true;this.emit('保护了自己！');}
   else if(effect==='confuse'){this.confused[other]=2+this.rng.int(4);this.emit('对方陷入了混乱！');}
   else if(effect==='sleep'){if(!target.status){target.status='sleep';target.sleep=2+this.rng.int(4);this.emit('对方睡着了！');}else this.emit('没有效果。');}
   else if(effect==='bide'){this.bide[side]={turns:2,damage:0};this.emit('开始忍耐！');}
   else if(effect==='rest'){mon.hp=mon.stats.hp;mon.status='sleep';mon.sleep=3;this.emit('恢复了体力，并睡着了！','heal');}
   else if(effect==='synthesis'||effect==='morning_sun'||effect==='moonlight'){mon.hp=Math.min(mon.stats.hp,mon.hp+Math.floor(mon.stats.hp/2));this.emit('恢复了体力！','heal');}
   else if(effect==='water_sport'){this.waterSport=true;this.emit('火属性招式的威力减弱了！');}
   else if(effect==='mud_sport'){this.mudSport=true;this.emit('电属性招式的威力减弱了！');}
   else if(effect==='foresight'||effect==='odor_sleuth'){this.stages[other].eva=0;this.emit('看穿了对方！');}
   else if(effect==='teleport'&&!this.trainer&&side===1){this.ended=true;this.result='escaped';this.emit('野生宝可梦逃走了！','end');}
   else this.emit('这个效果暂未开放。');return;
  }
  const crit=this.rng.next()<([1/16,1/8,1/4,1/3,1/2][Math.min(4,(this.focus[side]?2:0)+(effect==='high_critical'?1:0))]);let power=move.power;if(this.waterSport&&move.type==='fire'||this.mudSport&&move.type==='electric')power=Math.max(1,Math.floor(power/2));
  if(effect==='fury_cutter'){this.fury??=[0,0];power*=2**Math.min(4,this.fury[side]++);}else if(this.fury)this.fury[side]=0;
  const result=damage(mon,target,move,this.db,this.rng,{aStages:this.stages[side],dStages:this.stages[other],critical:crit,power});
  const hits=effect==='double_hit'?2:effect==='multi_hit'?[2,2,2,3,3,3,4,5][this.rng.int(8)]:1;let dealt=0;
  for(let i=0;i<hits&&target.hp>0;i++){const amt=Math.min(target.hp,result.amount);target.hp-=amt;dealt+=amt;this.emit(`${result.critical?'击中了要害！ ':''}${result.type===0?'没有效果。':result.type>1?'效果拔群！':result.type<1?'效果不太好…':''}`||'攻击命中了！','hurt',{side:other});}
  if(this.bide[other])this.bide[other].damage+=dealt;
  if(effect==='absorb'&&dealt){mon.hp=Math.min(mon.stats.hp,mon.hp+Math.max(1,Math.floor(dealt/2)));this.emit('吸取了对方的体力！','heal');}
  if(effect==='recoil'||effect==='double_edge'){mon.hp=Math.max(0,mon.hp-Math.max(1,Math.floor(dealt/(effect==='double_edge'?3:4))));this.emit('受到了反作用力！','hurt',{side});}
  if(effect==='trap'&&target.hp>0){this.traps[other]=2+this.rng.int(4);this.emit('对方被困住了！');}
  if(target.hp>0&&this.rng.next()*100<move.chance){
   if(target.ability==='shield_dust')return;
   if(effect==='flinch_hit'||effect==='flinch_minimize_hit')this.flinched[other]=true;
   const stat=downs[effect]||downs[effect.replace(/_hit$/,'')];if(stat){this.changeStage(other,...stat);this.emit('对方的能力下降了！');}
   const s=({poison_hit:'poison',burn_hit:'burn',paralyze_hit:'paralysis',freeze_hit:'freeze'})[effect];const types=this.db.species[target.species].types;
   if(s&&!target.status&&!(s==='poison'&&(types.includes('poison')||types.includes('steel')))&&!(s==='burn'&&types.includes('fire'))&&target.ability!=='shield_dust'){target.status=s;this.emit('对方陷入了异常状态！');}
   if(effect==='confuse_hit'&&target.ability!=='shield_dust'){this.confused[other]=2+this.rng.int(4);this.emit('对方混乱了！');}
  }
 }
 checkFaint(){
  if(this.ended)return;
  if(this.enemy.hp<=0){
   this.emit(`${this.name(this.enemy)} 倒下了！`,'faint',{side:1});this.ended=true;this.result='win';
   const living=[...this.participants].filter(i=>this.party[i].hp>0);const spec=this.db.species[this.enemy.species];
   const total=Math.floor(spec.expYield*this.enemy.level*(this.trainer?1.5:1)/7);
   for(const i of living){const m=this.party[i];const xp=Math.max(1,Math.floor(total/living.length));this.emit(`${this.name(m)} 获得了 ${xp} 点经验！`);for(const ev of grantExperience(m,xp,spec,this.db))this.emit(ev.text,ev.kind);}
  }else if(this.player.hp<=0){this.emit(`${this.name(this.player)} 倒下了！`,'faint',{side:0});if(!this.party.some(m=>m.hp>0)){this.ended=true;this.result='loss';this.emit('没有能够继续战斗的宝可梦了…','end');}}
 }
}
