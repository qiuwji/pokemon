"""Merge original target and contact metadata without overwriting custom content or assets."""
from imports.context import ImportSession, arguments
import argparse, json, re
from pathlib import Path
parser=argparse.ArgumentParser(); parser.add_argument('source'); args=arguments(parser);session=ImportSession(args,"import-move-metadata.py")
root=Path(__file__).resolve().parents[1];  data=session.load()
source=(Path(args.source)/'src/data/battle_moves.h').read_text()
sound_source=(Path(args.source)/'src/battle_util.c').read_text()
sound_block=re.search(r'sSoundMovesTable\[\].*?\{(.*?)\}',sound_source,re.S)[1]
sounds={name.lower() for name in re.findall(r'MOVE_(\w+)',sound_block)}
modes={'SELECTED':'selected','DEPENDS':'selected','USER_OR_SELECTED':'user-or-selected','RANDOM':'random','BOTH':'opponents','USER':'self','FOES_AND_ALLY':'all-others','OPPONENTS_FIELD':'opponents-field'}
for name, block in re.findall(r'\[MOVE_(\w+)\]\s*=\s*\{(.*?)\}',source,re.S):
    key=name.lower()
    if key not in data['moves']: continue
    data['moves'][key]['target']=modes[re.search(r'\.target\s*=\s*MOVE_TARGET_(\w+)',block)[1]]
    data['moves'][key]['contact']='FLAG_MAKES_CONTACT' in block
    data['moves'][key]['sound']=key in sounds
    data['moves'][key]['flags']=re.search(r'\.flags\s*=\s*([^,]+)',block)[1].strip().split(' | ')
session.content(data)
print('Imported targets/contact metadata for', len(data['moves']), 'moves')

session.finish()
