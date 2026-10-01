import json,re,struct
from pathlib import Path
from PIL import Image
import argparse
parser=argparse.ArgumentParser(description='Import original tiles, maps and species into the web content pack.')
parser.add_argument('source',help='Path to a pret/pokeemerald checkout')
args=parser.parse_args()
R=Path(args.source); O=Path(__file__).resolve().parents[1]/'dist'; A=O/'assets'; A.mkdir(exist_ok=True)
def pal(p): return [tuple(map(int,l.split())) for l in p.read_text().splitlines()[3:19]]
def recolor(p,palette):
 im=Image.open(p); out=Image.new('RGBA',im.size); out.putdata([(*palette[v%16],255 if v%16 else 0) for v in im.getdata()]); return out
def u16(p):
 b=p.read_bytes(); return list(struct.unpack('<'+'H'*(len(b)//2),b))
layouts={x['id']:x for x in json.loads((R/'data/layouts/layouts.json').read_text())['layouts']}
map_names=['LittlerootTown','Route101','OldaleTown','Route103','LittlerootTown_ProfessorBirchsLab','LittlerootTown_BrendansHouse_1F','LittlerootTown_BrendansHouse_2F','OldaleTown_PokemonCenter_1F','OldaleTown_Mart']
titles=['未白镇','101 号道路','古辰镇','103 号道路','小田卷博士研究所','我的家 · 一楼','我的家 · 二楼','宝可梦中心','友好商店']; output={}
for name,title in zip(map_names,titles):
 m=json.loads((R/f'data/maps/{name}/map.json').read_text()); lay=layouts[m['layout']]
 dirs=[]
 for kind,key in [('primary','primary_tileset'),('secondary','secondary_tileset')]:
  snake=re.sub(r'(?<!^)(?=[A-Z])','_',lay[key].replace('gTileset_','')).lower(); dirs.append(R/f'data/tilesets/{kind}/{snake}')
 primary,secondary=dirs; pals=[pal((primary if i<6 else secondary)/f'palettes/{i:02d}.pal') for i in range(13)]
 tile_imgs=[Image.open(d/'tiles.png') for d in dirs]; meta=[u16(d/'metatiles.bin') for d in dirs]; attrs=[u16(d/'metatile_attributes.bin') for d in dirs]
 cache={}
 def tile(v):
  if v in cache:return cache[v]
  idx=v&1023; p=(v>>12)&15; d=0 if idx<512 else 1; idx=idx if d==0 else idx-512; im=tile_imgs[d]; x=(idx%(im.width//8))*8;y=(idx//(im.width//8))*8
  cut=im.crop((x,y,x+8,y+8)); out=Image.new('RGBA',(8,8)); out.putdata([(*pals[p if p<13 else 0][z%16],255 if z%16 else 0) for z in cut.getdata()]);
  if v&1024:out=out.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
  if v&2048:out=out.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
  cache[v]=out;return out
 def mt(mid):
  d=0 if mid<512 else 1; mid=mid if d==0 else mid-512; vals=meta[d][mid*8:mid*8+8]; attr=attrs[d][mid]; b=Image.new('RGBA',(16,16),(*pals[0][0],255)); f=Image.new('RGBA',(16,16))
  for i,v in enumerate(vals):
   t=tile(v);pos=((i%2)*8,((i%4)//2)*8);b.alpha_composite(t,pos)
   if i>=4 and attr>>12!=1:f.alpha_composite(t,pos)
  return b,f,attr&255
 w,h=lay['width'],lay['height'];data=u16(R/lay['blockdata_filepath']);base=Image.new('RGBA',(w*16,h*16));fore=Image.new('RGBA',base.size);beh=[]
 for i,val in enumerate(data):
  b,f,a=mt(val&1023);pos=(i%w*16,i//w*16);base.alpha_composite(b,pos);fore.alpha_composite(f,pos);beh.append(a)
 base.save(A/f'{name}.png');fore.save(A/f'{name}-over.png');bd=u16(R/lay['border_filepath']);border=Image.new('RGBA',(32,32))
 for i,val in enumerate(bd[:4]):border.alpha_composite(mt(val&1023)[0],(i%2*16,i//2*16))
 border.save(A/f'{name}-border.png')
 output[name]={'id':name,'title':title,'width':w,'height':h,'blocks':data,'behavior':beh,'connections':[{**c,'map':c['map'].replace('MAP_','')} for c in (m['connections'] or [])], 'warps':m['warp_events'],'signs':m['bg_events'],'npcs':m['object_events'],'music':m['music']}
# Standard field objects, using the palettes declared by the engine.
info=(R/'src/data/object_events/object_event_graphics_info.h').read_text(); gfx=(R/'src/data/object_events/object_event_graphics.h').read_text(); npcs={}
for key in ['BrendanNormal','MayNormal','ProfBirch','Twin','FatMan','Boy1','Boy2','Youngster','Nurse','Gentleman','Girl1','Man3','Woman1','Scientist1','BirchsBag','Zigzagoon1','Mom','LittleBoy']:
 match=re.search(r'gObjectEventGraphicsInfo_'+key+r'\s*=\s*\{(.*?)\};',info,re.S)
 if not match:continue
 block=match[1];pt=re.search(r'paletteTag = OBJ_EVENT_PAL_TAG_(\w+)',block)[1].lower();width=int(re.search(r'\.width = (\d+)',block)[1]);height=int(re.search(r'\.height = (\d+)',block)[1]); pic=re.search(r'gObjectEventPic_'+key+r'\[\].*?INCGFX_U32\("([^"]+)',gfx)
 if not pic:continue
 path=R/pic[1];p=R/f'graphics/object_events/palettes/{pt}.pal'
 if not p.exists():continue
 recolor(path,pal(p)).save(A/f'actor-{key}.png');npcs[key]={'w':width,'h':height}
# Battle backgrounds are ordinary GBA 8x8 tilemaps.
b=R/'graphics/battle_environment/tall_grass';im=Image.open(b/'tiles.png');p=pal(b/'palette.pal'); data=u16(b/'map.bin');bg=Image.new('RGBA',(256,512))
for i,v in enumerate(data):
 idx=v&1023;t=im.crop((idx%(im.width//8)*8,idx//(im.width//8)*8,idx%(im.width//8)*8+8,idx//(im.width//8)*8+8));o=Image.new('RGBA',(8,8));o.putdata([(*p[z%16],255) for z in t.getdata()]);
 if v&1024:o=o.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 if v&2048:o=o.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 bg.paste(o,(i%32*8,i//32*8))
bg.crop((0,0,240,112)).save(A/'battle-bg.png')
# Content tables are separate from engine code.
specs=(R/'src/data/pokemon/species_info.h').read_text();ls=(R/'src/data/pokemon/level_up_learnsets.h').read_text();mv=(R/'src/data/battle_moves.h').read_text(); species={};moves={}
entries=[('TREECKO','木守宫',252),('GROVYLE','森林蜥蜴',253),('SCEPTILE','蜥蜴王',254),('TORCHIC','火稚鸡',255),('COMBUSKEN','力壮鸡',256),('BLAZIKEN','火焰鸡',257),('MUDKIP','水跃鱼',258),('MARSHTOMP','沼跃鱼',259),('SWAMPERT','巨沼怪',260),('POOCHYENA','土狼犬',261),('MIGHTYENA','大狼犬',262),('ZIGZAGOON','蛇纹熊',263),('LINOONE','直冲熊',264),('WURMPLE','刺尾虫',265),('WINGULL','长翅鸥',278),('PELIPPER','大嘴鸥',279),('LOTAD','莲叶童子',270),('SEEDOT','橡实果',273),('RALTS','拉鲁拉丝',280),('TAILLOW','傲骨燕',276)]
for key,cn,no in entries:
 block=re.search(r'\[SPECIES_'+key+r'\]\s*=\s*\{(.*?)\n    \}',specs,re.S)[1];get=lambda k:int(re.search(r'\.'+k+r'\s*=\s*(\d+)',block)[1]); name=key.title().replace('_','');learn=re.search(r's'+name+r'LevelUpLearnset\[\] = \{(.*?)\};',ls,re.S)[1];learn=[{'level':int(l),'move':m.lower()} for l,m in re.findall(r'LEVEL_UP_MOVE\(\s*(\d+), MOVE_(\w+)\)',learn)];types=re.search(r'\.types = \{ TYPE_(\w+), TYPE_(\w+)',block).groups();growth=re.search(r'\.growthRate = GROWTH_(\w+)',block)[1].lower();abilities=re.search(r'\.abilities = \{ABILITY_(\w+), ABILITY_(\w+)',block).groups()
 species[key.lower()]={'name':cn,'dex':no,'types':list(dict.fromkeys(t.lower() for t in types)),'stats':dict(zip(['hp','atk','def','spe','spa','spd'],[get('base'+k) for k in ['HP','Attack','Defense','Speed','SpAttack','SpDefense']])),'catchRate':get('catchRate'),'expYield':get('expYield'),'growth':growth,'femaleRatio':float(re.search(r'genderRatio = PERCENT_FEMALE\(([\d.]+)\)',block)[1])/100 if re.search(r'genderRatio = PERCENT_FEMALE\(([\d.]+)\)',block) else .5,'abilities':[a.lower() for a in abilities if a!='NONE'],'evYield':dict(zip(['hp','atk','def','spe','spa','spd'],[get('evYield_'+k) for k in ['HP','Attack','Defense','Speed','SpAttack','SpDefense']])),'learnset':learn}
 folder=R/f'graphics/pokemon/{key.lower()}';palette=pal(folder/'normal.pal')
 for img in ['front','back','icon']:
  recolor(folder/f'{img}.png',palette).save(A/f'{key.lower()}-{img}.png')
 for entry in learn:
  mk=entry['move'].upper()
  if mk.lower() in moves:continue
  mb=re.search(r'\[MOVE_'+mk+r'\]\s*=\s*\{(.*?)\n    \}',mv,re.S)[1]
  moves[mk.lower()]={k:int(re.search(r'\.'+field+r'\s*=\s*(-?\d+)',mb)[1]) for k,field in [('power','power'),('accuracy','accuracy'),('pp','pp'),('priority','priority'),('chance','secondaryEffectChance')]};moves[mk.lower()].update(type=re.search(r'\.type = TYPE_(\w+)',mb)[1].lower(),effect=re.search(r'\.effect = EFFECT_(\w+)',mb)[1].lower())
types={};table=(R/'src/battle_main.c').read_text().split('const u8 gTypeEffectiveness[336]')[1].split('};')[0]
for a,b,m in re.findall(r'TYPE_(\w+), TYPE_(\w+), TYPE_MUL_(\w+)',table):types.setdefault(a.lower(),{})[b.lower()]={'NOT_EFFECTIVE':.5,'SUPER_EFFECTIVE':2,'NO_EFFECT':0}.get(m,1)
cnmoves={'pound':'拍击','leer':'瞪眼','absorb':'吸取','quick_attack':'电光一闪','pursuit':'追打','screech':'刺耳声','mega_drain':'超级吸取','agility':'高速移动','slam':'摔打','detect':'看穿','giga_drain':'终极吸取','scratch':'抓','growl':'叫声','focus_energy':'聚气','ember':'火花','peck':'啄','sand_attack':'泼沙','fire_spin':'火焰旋涡','slash':'劈开','mirror_move':'鹦鹉学舌','flamethrower':'喷射火焰','tackle':'撞击','mud_slap':'掷泥','water_gun':'水枪','bide':'忍耐','foresight':'识破','mud_sport':'玩泥巴','take_down':'猛撞','whirlpool':'潮旋','protect':'守住','hydro_pump':'水炮','bite':'咬住','odor_sleuth':'气味侦测','roar':'吼叫','swagger':'虚张声势','scary_face':'鬼面','taunt':'挑衅','crunch':'咬碎','thief':'小偷','tail_whip':'摇尾巴','headbutt':'头锤','pin_missile':'飞弹针','belly_drum':'腹鼓','rest':'睡觉','covet':'渴望','poison_sting':'毒针','string_shot':'吐丝','gust':'起风','wing_attack':'翅膀攻击','supersonic':'超音波','mist':'白雾','water_pulse':'水之波动','aerial_ace':'燕返','double_team':'影子分身','harden':'变硬','astonish':'惊吓','nature_power':'自然之力','rain_dance':'求雨','synthesis':'光合作用','sunny_day':'大晴天','confusion':'念力','teleport':'瞬间移动','calm_mind':'冥想','psychic':'精神强念','hypnosis':'催眠术','dream_eater':'食梦','double_edge':'舍身冲撞','endeavor':'蛮干','fury_cutter':'连斩','leaf_blade':'叶刃','swords_dance':'剑舞','double_kick':'二连踢','bulk_up':'健美','sky_uppercut':'冲天拳','blaze_kick':'火焰踢','mud_shot':'泥巴射击','muddy_water':'浊流','earthquake':'地震'}
for k,v in moves.items():v['name']=cnmoves.get(k,k.replace('_',' ').title())
(O/'content.json').write_text(json.dumps({'maps':output,'actors':npcs,'species':species,'moves':moves,'typeChart':types},ensure_ascii=False,separators=(',',':')))
print('Prepared',len(output),'maps,',len(species),'species,',len(moves),'moves; actors:',npcs)
