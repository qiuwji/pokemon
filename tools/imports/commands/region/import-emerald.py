from imports.context import PROJECT, ImportSession, arguments, source_argument
import json,re,struct
from pathlib import Path
from PIL import Image
import argparse
parser=argparse.ArgumentParser(description='Import original tiles, maps and species into the web content pack.')
source_argument(parser)
args=arguments(parser, selectors=('maps','species'), profile=True);session=ImportSession(args,"import-emerald.py")
R=Path(args.source); O=session.dist; A=O/'assets'
def pal(p): return [tuple(map(int,l.split())) for l in p.read_text().splitlines()[3:19]]
def recolor(p,palette):
 im=Image.open(p); out=Image.new('RGBA',im.size); out.putdata([(*palette[v%16],255 if v%16 else 0) for v in im.getdata()]); return out
def u16(p):
 b=p.read_bytes(); return list(struct.unpack('<'+'H'*(len(b)//2),b))
layouts={x['id']:x for x in json.loads((R/'data/layouts/layouts.json').read_text())['layouts']}
map_names=session.select('maps', [p.name for p in (R/'data/maps').iterdir() if p.is_dir()], session.profile['maps'])
titles=[session.locale['maps'][name] for name in map_names]; output={}
for name,title in zip(map_names,titles):
 m=json.loads((R/f'data/maps/{name}/map.json').read_text()); lay=layouts[m['layout']]
 dirs=[]
 for kind,key in [('primary','primary_tileset'),('secondary','secondary_tileset')]:
  snake=re.sub(r'(?<!^)(?=[A-Z])','_',lay[key].replace('gTileset_','')).lower(); dirs.append(R/f'data/tilesets/{kind}/{snake}')
 attrs=[u16(d/'metatile_attributes.bin') for d in dirs]
 w,h=lay['width'],lay['height'];data=u16(R/lay['blockdata_filepath']);beh=[]
 for val in data:
  mid=val&1023;side=0 if mid<512 else 1;beh.append(attrs[side][mid if side==0 else mid-512]&255)
 output[name]={'id':name,'indoor':'_' in name,'title':title,'width':w,'height':h,'blocks':data,'behavior':beh,'connections':[{**c,'map':c['map'].replace('MAP_','')} for c in (m['connections'] or [])], 'warps':m['warp_events'],'signs':m['bg_events'],'npcs':m['object_events'],'music':m['music']}
# Standard field objects, using the palettes declared by the engine.
info=(R/'src/data/object_events/object_event_graphics_info.h').read_text(); gfx=(R/'src/data/object_events/object_event_graphics.h').read_text(); npcs={}
for key in session.profile['actors']:
 match=re.search(r'gObjectEventGraphicsInfo_'+key+r'\s*=\s*\{(.*?)\};',info,re.S)
 if not match:raise ValueError('Missing actor graphics definition: '+key)
 block=match[1];pt=re.search(r'paletteTag = OBJ_EVENT_PAL_TAG_(\w+)',block)[1].lower();width=int(re.search(r'\.width = (\d+)',block)[1]);height=int(re.search(r'\.height = (\d+)',block)[1]); pic=re.search(r'gObjectEventPic_'+key+r'\[\].*?INCGFX_U32\("([^"]+)',gfx)
 if not pic:raise ValueError('Missing actor picture definition: '+key)
 path=R/pic[1];p=R/f'graphics/object_events/palettes/{pt}.pal'
 if not p.exists():raise ValueError('Missing actor palette: '+key)
 session.image(recolor(path,pal(p)),A/f'actor-{key}.png');npcs[key]={'w':width,'h':height}
# Battle backgrounds are ordinary GBA 8x8 tilemaps.
b=R/'graphics/battle_environment'/session.profile['battleBackground'];im=Image.open(b/'tiles.png');p=pal(b/'palette.pal'); data=u16(b/'map.bin');bg=Image.new('RGBA',(256,512))
for i,v in enumerate(data):
 idx=v&1023;t=im.crop((idx%(im.width//8)*8,idx//(im.width//8)*8,idx%(im.width//8)*8+8,idx//(im.width//8)*8+8));o=Image.new('RGBA',(8,8));o.putdata([(*p[z%16],255) for z in t.getdata()]);
 if v&1024:o=o.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
 if v&2048:o=o.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
 bg.paste(o,(i%32*8,i//32*8))
session.image(bg.crop((0,0,240,112)),A/'battle-bg.png')
# Content tables are separate from engine code.
specs=(R/'src/data/pokemon/species_info.h').read_text();ls=(R/'src/data/pokemon/level_up_learnsets.h').read_text();mv=(R/'src/data/battle_moves.h').read_text(); species={};moves={}
entries=[(key.upper(),session.locale['species'][key]['name'],session.locale['species'][key]['dex']) for key in session.select('species', session.locale['species'], session.profile['species'])]
for key,cn,no in entries:
 block=re.search(r'\[SPECIES_'+key+r'\]\s*=\s*\{(.*?)\n    \}',specs,re.S)[1];get=lambda k:int(re.search(r'\.'+k+r'\s*=\s*(\d+)',block)[1]); name=key.title().replace('_','');learn=re.search(r's'+name+r'LevelUpLearnset\[\] = \{(.*?)\};',ls,re.S)[1];learn=[{'level':int(l),'move':m.lower()} for l,m in re.findall(r'LEVEL_UP_MOVE\(\s*(\d+), MOVE_(\w+)\)',learn)];types=re.search(r'\.types = \{ TYPE_(\w+), TYPE_(\w+)',block).groups();growth=re.search(r'\.growthRate = GROWTH_(\w+)',block)[1].lower();abilities=re.search(r'\.abilities = \{ABILITY_(\w+), ABILITY_(\w+)',block).groups()
 species[key.lower()]={'name':cn,'dex':no,'types':list(dict.fromkeys(t.lower() for t in types)),'stats':dict(zip(['hp','atk','def','spe','spa','spd'],[get('base'+k) for k in ['HP','Attack','Defense','Speed','SpAttack','SpDefense']])),'catchRate':get('catchRate'),'expYield':get('expYield'),'growth':growth,'femaleRatio':float(re.search(r'genderRatio = PERCENT_FEMALE\(([\d.]+)\)',block)[1])/100 if re.search(r'genderRatio = PERCENT_FEMALE\(([\d.]+)\)',block) else .5,'abilities':[a.lower() for a in abilities if a!='NONE'],'evYield':dict(zip(['hp','atk','def','spe','spa','spd'],[get('evYield_'+k) for k in ['HP','Attack','Defense','Speed','SpAttack','SpDefense']])),'learnset':learn}
 folder=R/f'graphics/pokemon/{key.lower()}';palette=pal(folder/'normal.pal')
 for img in ['front','back','icon']:
  session.image(recolor(folder/f'{img}.png',palette),A/f'{key.lower()}-{img}.png')
 for entry in learn:
  mk=entry['move'].upper()
  if mk.lower() in moves:continue
  mb=re.search(r'\[MOVE_'+mk+r'\]\s*=\s*\{(.*?)\n    \}',mv,re.S)[1]
  moves[mk.lower()]={k:int(re.search(r'\.'+field+r'\s*=\s*(-?\d+)',mb)[1]) for k,field in [('power','power'),('accuracy','accuracy'),('pp','pp'),('priority','priority'),('chance','secondaryEffectChance')]};moves[mk.lower()].update(type=re.search(r'\.type = TYPE_(\w+)',mb)[1].lower(),effect=re.search(r'\.effect = EFFECT_(\w+)',mb)[1].lower())
types={};table=(R/'src/battle_main.c').read_text().split('const u8 gTypeEffectiveness[336]')[1].split('};')[0]
for a,b,m in re.findall(r'TYPE_(\w+), TYPE_(\w+), TYPE_MUL_(\w+)',table):types.setdefault(a.lower(),{})[b.lower()]={'NOT_EFFECTIVE':.5,'SUPER_EFFECTIVE':2,'NO_EFFECT':0}.get(m,1)
cnmoves=session.locale['moves']
for k,v in moves.items():v['name']=cnmoves.get(k,k.replace('_',' ').title())
# Merge selected records and fields. Preserve maps outside this import and metadata
# produced by subsequent importers (encounters, growth, movement, evolutions).

existing=session.load()
for section, records in {'maps':output,'actors':npcs,'species':species,'moves':moves}.items():
 for ident, record in records.items():
  existing[section][ident]={**existing[section].get(ident,{}),**record}
existing['typeChart']=types
session.content(existing)
print('Prepared',len(output),'maps,',len(species),'species,',len(moves),'moves; actors:',npcs)

# Runtime resource format is a tile grid; atlas generation never creates a scene PNG.
# Atlas generation is a separate, explicit import stage; no hidden subprocess writes.

session.finish()
