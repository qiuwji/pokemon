"""Import TM/HM order and species eligibility; reference tree stays read-only."""
import argparse
import json
from imports.context import ImportSession, arguments, source_argument, generated_header, PROJECT, source_revision
import re
from pathlib import Path

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
parser.add_argument('--config', type=Path, default=PROJECT / 'tools/imports/config/gen3.json')
args = arguments(parser)
session = ImportSession(args, 'import-machine-learning.py')
config = json.loads(args.config.read_text())
root = session.source
source = (root / 'include/constants/tms_hms.h').read_text()
parts = source.split('#define FOREACH_HM(F)')
if len(parts) != 2: raise ValueError('Missing or ambiguous TM/HM table')
tms = re.findall(r'F\((\w+)\)', parts[0])
hms = re.findall(r'F\((\w+)\)', parts[1].split('#define FOREACH_TMHM')[0])
for key, values in [('expectedTMCount', tms), ('expectedHMCount', hms)]:
    expected = config.get(key)
    if not values or (expected is not None and len(values) != expected):
        raise ValueError(f'{key}: expected {expected}, parsed {len(values)}')
learnsets = {}
for species, body in re.findall(r'\[SPECIES_(\w+)\]\s*=\s*\{\s*\.learnset\s*=\s*\{(.*?)\}\s*\}', (root / 'src/data/pokemon/tmhm_learnsets.h').read_text(), re.S):
    learnsets[species.lower()] = [move.lower() for move in re.findall(r'\.(\w+)\s*=\s*TRUE', body)]
machines = {}
for kind, moves in [('tm', tms), ('hm', hms)]:
    for number, move in enumerate(moves, 1):
        key = kind + '_' + move.lower()
        machines[key] = {'move': move.lower(), 'number': number, 'kind': kind, 'consume': int(kind == 'tm'), 'protected': kind == 'hm'}
metadata = {'revision': source_revision(root), 'sources': ['include/constants/tms_hms.h', 'src/data/pokemon/tmhm_learnsets.h', 'src/party_menu.c', 'src/pokemon.c', 'src/pokemon_summary_screen.c']}
session.text(session.dist / 'engine/rules/gen3/machine-learning.js', generated_header(session.owner, root) + 'export const MACHINE_SOURCE = ' + json.dumps(metadata, indent=2) + ';\nexport const MACHINES = ' + json.dumps(machines, indent=2) + ';\nexport const MACHINE_LEARNSETS = ' + json.dumps(learnsets, indent=2) + ';\n')
if not learnsets: raise ValueError('No machine learnsets parsed')
print(f'{len(machines)} machines, {len(learnsets)} species learnsets')

session.finish()
