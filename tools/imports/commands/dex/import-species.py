"""Merge selected original species into the slice. Unimported moves remain explicit metadata."""
from imports.context import PROJECT, ImportSession, arguments, source_argument
from imports.pixel_assets import icon_palette_path, read_palette
import argparse, json, re
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser();source_argument(parser);parser.add_argument('entries',nargs='*',help='species-id:localized-name:dex-number');args=arguments(parser, selectors=('species',), profile=True);session=ImportSession(args,"import-species.py")
r=Path(args.source);d=session.target;data=session.load()
source=(r/'src/data/pokemon/species_info.h').read_text();learnsets=(r/'src/data/pokemon/level_up_learnsets.h').read_text()
entries=args.entries or [key+':'+session.locale['species'][key]['name']+':'+str(session.locale['species'][key]['dex']) for key in session.select('species', session.locale['species'], session.profile['species'])]
for entry in entries:
    ident,name,dex=entry.split(':');key=ident.upper()
    body=re.search(r'\[SPECIES_'+key+r'\]\s*=\s*\{(.*?)\n    \}',source,re.S)[1]
    def number(field):return int(re.search(r'\.'+field+r'\s*=\s*(\d+)',body)[1])
    learnname=re.search(r'\.levelUpLearnset\s*=\s*(\w+)',body)
    # Emerald's species table predates the learnset pointer field.
    table=learnname[1] if learnname else 's'+key.title().replace('_','')+'LevelUpLearnset'
    learnbody=re.search(table+r'\[\]\s*=\s*\{(.*?)\}',learnsets,re.S)[1]
    learns=[{'level':int(level),'move':move.lower()}for level,move in re.findall(r'LEVEL_UP_MOVE\(\s*(\d+), MOVE_(\w+)\)',learnbody)]
    ratio=re.search(r'\.genderRatio\s*=\s*([^,\n]+)',body)[1];female=re.search(r'PERCENT_FEMALE\(([\d.]+)\)',ratio)
    species={'name':name,'dex':int(dex),'types':list(dict.fromkeys(t.lower()for t in re.search(r'\.types\s*=\s*\{\s*TYPE_(\w+),\s*TYPE_(\w+)',body).groups())),
      'stats':{k:number('base'+v)for k,v in zip(['hp','atk','def','spa','spd','spe'],['HP','Attack','Defense','SpAttack','SpDefense','Speed'])},
      'evYield':{k:number('evYield_'+v)for k,v in zip(['hp','atk','def','spa','spd','spe'],['HP','Attack','Defense','SpAttack','SpDefense','Speed'])},
      'catchRate':number('catchRate'),'expYield':number('expYield'),'growth':re.search(r'\.growthRate\s*=\s*GROWTH_(\w+)',body)[1].lower(),
      'abilities':[a.lower()for a in re.search(r'\.abilities\s*=\s*\{\s*ABILITY_(\w+),\s*ABILITY_(\w+)',body).groups()if a!='NONE'],
      'femaleRatio':float(female[1])/100 if female else (1 if 'FEMALE' in ratio else 0),'genderless':'MON_GENDERLESS' in ratio,
      'eggGroups':list(dict.fromkeys(g.lower()for g in re.findall(r'EGG_GROUP_(\w+)',re.search(r'\.eggGroups\s*=\s*\{(.*?)\}',body)[1]))),
      'eggCycles':number('eggCycles'),'friendship':70 if 'STANDARD_FRIENDSHIP' in re.search(r'\.friendship\s*=\s*(\w+)',body)[1]else number('friendship'),
      'learnset':[v for v in learns if v['move'] in data['moves']], 'unavailableLearnset':[v for v in learns if v['move'] not in data['moves']]}
    if ident=='shedinja':species['fixedHP']=1
    for field,prop in [('itemCommon','common'),('itemRare','rare')]:
        item=re.search(r'\.'+field+r'\s*=\s*ITEM_(\w+)',body)[1].lower()
        if item!='none':species.setdefault('heldItems',{})[prop]='pokeball'if item=='poke_ball'else item
    palette=[tuple(map(int,v.split()))for v in (r/f'graphics/pokemon/{ident}/normal.pal').read_text().splitlines()[3:19]]
    for side in ['front','back','icon']:
        selected_palette=read_palette(icon_palette_path(r,ident)) if side=='icon' else palette
        image=Image.open(r/f'graphics/pokemon/{ident}/{side}.png');out=Image.new('RGBA',image.size);out.putdata([(*selected_palette[int(v)%16],255 if int(v)%16 else 0)for v in image.getdata()]);session.image(out,d/f'assets/{ident}-{side}.png')
    for pending in species['unavailableLearnset']:session.omit('learnset', ident, pending['move'], 'move not imported')
    data['species'][ident]={**data['species'].get(ident,{}),**species};print(ident,len(species['learnset']),'available learn entries;',len(species['unavailableLearnset']),'pending')
session.content(data)

session.finish()
