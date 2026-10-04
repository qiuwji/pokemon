"""Generate selected E2E maps into isolated fixtures; never add production map entrances."""
import argparse
import json
import subprocess
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from imports.context import ImportSession, arguments, PROJECT
from imports.e2e_terrain import TERRAIN, METATILES, TILESET, verify_metatiles

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--scenes',nargs='+',help='Only regenerate these existing scene IDs')
args = arguments(parser)
session = ImportSession(args,'fixture-scenes',policy={'content':[],'outputs':['fixtures/world.json']})
content = session.load()
problems = verify_metatiles(content)
if problems:raise ValueError('Unverified E2E terrain: '+ '; '.join(problems))
recipe = json.loads((PROJECT / 'tools/imports/config/e2e-scenes.json').read_text())
selected = session.select('scenes',recipe['scenes'])
target = session.dist / 'fixtures/world.json'
output = json.loads(target.read_text()) if target.exists() else {}
for name in selected:
    source = recipe['scenes'][name]
    value = {key:item for key,item in source.items() if key!='layout'}
    layout = source['layout']
    if len(layout)!=value['height'] or any(len(row)!=value['width'] for row in layout):
        raise ValueError('Invalid fixture dimensions: '+name)
    blocks,behavior = [],[]
    for row in layout:
        for glyph in row:
            cell = recipe['cells'][glyph]
            blocks.append(METATILES[cell['terrain']] | cell.get('collision',0)<<10)
            behavior.append(cell['behavior'])
    output[name] = {**value,'blocks':blocks,'behavior':behavior,'tileset':TILESET,
                    'border':[METATILES[k] for k in TERRAIN['border']]}
# Validate the fixture world together with its production destinations before staging bytes.
candidate = {**content,'maps':{**content['maps'],**output}}
result = subprocess.run(['node',str(PROJECT / 'tools/validate-import.mjs')],input=json.dumps(candidate),text=True,capture_output=True)
if result.returncode:raise ValueError('Invalid fixture world: '+result.stderr)
session.text(target,json.dumps(output,ensure_ascii=False,indent=2)+'\n')
session.finish()
