"""Merge species field/growth data from original Emerald without changing imported tiles or existing stats."""
import re,json
from pathlib import Path
path=Path('dist/content.json');data=json.loads(path.read_text());source=Path('work/pokeemerald/src/data/pokemon/species_info.h').read_text()
for name,body in re.findall(r'\[SPECIES_(\w+)\]\s*=\s*\{(.*?)\n    \}',source,re.S):
    ident=name.lower()
    if ident not in data['species']:continue
    s=data['species'][ident];groups=re.search(r'\.eggGroups\s*=\s*\{(.*?)\}',body)[1]
    s['eggGroups']=list(dict.fromkeys(g.lower() for g in re.findall(r'EGG_GROUP_(\w+)',groups)))
    s['eggCycles']=int(re.search(r'\.eggCycles\s*=\s*(\d+)',body)[1]);friendship=re.search(r'\.friendship\s*=\s*(\w+)',body)[1];s['friendship']=70 if friendship=='STANDARD_FRIENDSHIP' else int(friendship)
    for field,prop in [('itemCommon','common'),('itemRare','rare')]:
        item=re.search(r'\.'+field+r'\s*=\s*ITEM_(\w+)',body)[1].lower()
        if item!='none':s.setdefault('heldItems',{})[prop]='pokeball' if item=='poke_ball' else item
eggs=Path('work/pokeemerald/src/data/pokemon/egg_moves.h').read_text()
for name,body in re.findall(r'egg_moves\((\w+),(.*?)\)',eggs,re.S):
    if name.lower() in data['species']:
        data['species'][name.lower()]['eggMoves']=[m.lower() for m in re.findall(r'MOVE_(\w+)',body) if m.lower() in data['moves']]
machines=Path('work/pokeemerald/src/data/pokemon/tmhm_learnsets.h').read_text()
for name,body in re.findall(r'\[SPECIES_(\w+)\]\s*=\s*\{\s*\.learnset\s*=\s*\{(.*?)\}',machines,re.S):
    if name.lower() in data['species']:
        data['species'][name.lower()]['machineMoves']=[m.lower() for m in re.findall(r'\.(\w+)\s*=\s*TRUE',body) if m.lower() in data['moves']]
path.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('Species field/growth metadata imported')
