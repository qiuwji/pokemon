// The Emerald slice is a content pack. Engine classes know nothing about these characters.
export const PACK={id:'emerald-hoenn-01',version:1,title:'绿宝石 · 丰缘序章',start:{map:'LittlerootTown',x:10,y:10,dir:'up'},starters:['treecko','torchic','mudkip'],rival:{treecko:'torchic',torchic:'mudkip',mudkip:'treecko'}};
export const TYPE_NAMES={normal:'一般',grass:'草',fire:'火',water:'水',fighting:'格斗',flying:'飞行',poison:'毒',ground:'地面',rock:'岩石',bug:'虫',ghost:'幽灵',steel:'钢',electric:'电',psychic:'超能力',ice:'冰',dragon:'龙',dark:'恶'};
export const STATUS_NAMES={poison:'中毒',burn:'灼伤',paralysis:'麻痹',sleep:'睡眠',freeze:'冰冻'};
export const ABILITIES={overgrow:'茂盛',blaze:'猛火',torrent:'激流',run_away:'逃跑',pickup:'捡拾',shield_dust:'鳞粉',keen_eye:'锐利目光',intimidate:'威吓',guts:'毅力',rain_dish:'雨盘',chlorophyll:'叶绿素',synchronize:'同步'};
export const NATURES=['勤奋','怕寂寞','勇敢','固执','顽皮','大胆','坦率','悠闲','淘气','乐天','胆小','急躁','认真','爽朗','天真','内敛','慢吞吞','冷静','害羞','马虎','温和','温顺','自大','慎重','浮躁'];
export const ITEMS={pokeball:{name:'精灵球',price:200,description:'捕捉野生宝可梦。降低对方体力更容易成功。'},potion:{name:'伤药',price:300,description:'为一只宝可梦恢复 20 点 HP。'}};
function baseObjects(state,db){
 const map=state.position.map,flag=state.flags;const obj=(x,y,actor,kind,name,text='')=>({x,y,actor,kind,name,text,dir:'down'});
 if(map==='LittlerootTown')return [obj(16,10,'Twin','talk','小女孩','北边就是 101 号道路。刚才好像传来了求救声！'),obj(12,13,'FatMan','talk','居民','小田卷博士经常到野外研究宝可梦。研究所就在西南边。'),obj(14,17,'Boy2','talk','男孩','草丛里有野生宝可梦。等你有了搭档，就能踏上冒险了。')];
 if(map==='Route101')return [obj(16,8,'Youngster','talk','少年','在草丛里行走会遇到野生宝可梦。先削弱它，再用精灵球！'),...(!flag.rescued?[obj(9,13,'ProfBirch','rescue','小田卷博士','救命啊！那边的包里有精灵球，快选一只来帮我！'),obj(7,14,'BirchsBag','starter','博士的背包'),{...obj(10,13,null,'wildObject','蛇纹熊'),species:'zigzagoon'}]:[])];
 if(map==='OldaleTown')return [obj(16,11,'Girl1','talk','女孩','红色屋顶的宝可梦中心可以免费恢复体力和招式 PP。'),obj(13,7,'Man3','giftPotion','商店店员','欢迎来到古辰镇！这是友好商店送你的伤药。'),obj(8,9,'FatMan','talk','研究足迹的人','我在调查珍稀宝可梦的足迹。向北走可以到 103 号道路。')];
 if(map==='Route103')return !flag.rivalWon?[obj(10,3,'MayNormal','rival','小遥','你就是爸爸说的新训练家吧！来对战一下，看看你和搭档配合得怎么样！')]:[];
 if(map==='LittlerootTown_ProfessorBirchsLab')return [obj(6,4,'ProfBirch','professor','小田卷博士'),obj(9,8,'Scientist1','talk','研究员','博士研究宝可梦在自然环境中的生活。发现新宝可梦，就用图鉴记录下来。')];
 if(map==='LittlerootTown_BrendansHouse_1F')return [obj(4,4,'Mom','healMom','妈妈','一路辛苦了！先在家休息一下吧。')];
 if(map==='OldaleTown_PokemonCenter_1F')return [obj(7,2,'Nurse','heal','乔伊小姐','欢迎来到宝可梦中心！我会让你的宝可梦恢复精神。'),obj(4,4,'Gentleman','talk','绅士','招式有使用次数。没有 PP 的时候，就去找乔伊小姐吧。'),obj(10,6,'Boy1','talk','少年','不同属性之间有克制关系。选对招式，能让战斗轻松很多！')];
 if(map==='OldaleTown_Mart')return [obj(1,3,'Man3','shop','店员'),obj(5,5,'Woman1','talk','顾客','我喜欢多带几瓶伤药。战斗中使用道具也会占用一回合。')];
 return [];
}
export function questFor(flags){
 if(!flags.rescued)return {title:'草丛里的求救声',description:'沿未白镇北边的小路前往 101 号道路，调查博士的背包。',number:'01'};
 if(!flags.rivalWon)return {title:'与小遥初次交手',description:'穿过古辰镇，向北到 103 号道路找小遥。出发前可以去宝可梦中心恢复。',number:'02'};
 if(!flags.pokedex)return {title:'属于你的宝可梦图鉴',description:'返回未白镇研究所，向小田卷博士报告。他有一份礼物要给你。',number:'03'};
 return {title:'记录丰缘的伙伴',description:'在 101 和 103 号道路探索草丛，捕捉伙伴。图鉴会记录你见过和捕获的宝可梦。',number:'04'};
}
export function validateSave(s,db){
 if(!s||!db.maps[s.position?.map]||!Number.isInteger(s.position.x)||!Number.isInteger(s.position.y))return false;
 const map=db.maps[s.position.map];if(s.position.x<0||s.position.x>=map.width||s.position.y<0||s.position.y>=map.height||!['up','down','left','right'].includes(s.position.dir))return false;
 if(!Array.isArray(s.party)||s.party.length>6||!Array.isArray(s.box)||s.box.length>200||!s.flags||!s.bag||!Number.isInteger(s.money)||s.money<0||!Array.isArray(s.seen)||!Array.isArray(s.caught))return false;
 for(const m of [...s.party,...s.box]){if(!db.species[m.species]||!Number.isInteger(m.level)||m.level<1||m.level>100||!m.stats||!Number.isInteger(m.hp)||m.hp<0||m.hp>m.stats.hp||!m.iv||!m.ev||!Array.isArray(m.moves)||m.moves.length>4||m.moves.some(v=>!db.moves[v.id]||!Number.isInteger(v.pp)||v.pp<0||v.pp>db.moves[v.id].pp))return false;}
 if(s.flags.rescued&&!s.party.length)return false;return Object.values(s.bag).every(v=>Number.isInteger(v)&&v>=0);
}

// Ambient behavior is declared per actor from the original map's movement/range data.
export function objectsFor(state,db){
 return baseObjects(state,db).map(n=>{
  const source=db.maps[state.position.map].npcs.find(o=>o.x===n.x&&o.y===n.y);
  const type=source?.movement_type||'MOVEMENT_TYPE_FACE_DOWN';
  const direction=type.includes('RIGHT')?'right':type.includes('LEFT')?'left':type.includes('UP')?'up':'down';
  let mode=type.includes('WANDER')?'wander':type.includes('WALK_LEFT_AND_RIGHT')?'horizontal':type.includes('WALK_DOWN_AND_UP')?'vertical':type.includes('LOOK_AROUND')?'look':type.includes('JOG')?'jog':'still';
  if(n.kind==='starter')mode='still';
  if(n.kind==='wildObject'){mode='jog';}
  if(n.kind==='rival')mode='look';
  return {...n,id:`${n.kind}:${n.x},${n.y}`,dir:n.kind==='wildObject'?'left':direction,movement:{mode,dir:direction,rangeX:source?.movement_range_x??1,rangeY:source?.movement_range_y??1}};
 });
}
