"""Generate full original battle metadata through the same parser as the partial pack importer."""
import argparse
import json
import re
from pathlib import Path
from imports.context import PROJECT, ImportSession, arguments, source_argument, generated_header, PROJECT
from imports.battle_moves import parse_moves

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
parser.add_argument('--config', type=Path, default=PROJECT / 'tools/imports/config/gen3.json')
args = arguments(parser)
session = ImportSession(args, 'import-rule-metadata.py')
config = json.loads(args.config.read_text())
source = session.source
moves = parse_moves((source / 'src/data/battle_moves.h').read_text(),
                    (source / 'src/battle_util.c').read_text())
expected = config.get('expectedMoveCount')
if expected is not None and len(moves) != expected:
    raise ValueError(f'Expected {expected} reference moves, parsed {len(moves)}')
wanted = config['naturePowerMoves']
if not wanted or any(ident not in moves for ident in wanted):
    raise ValueError('Missing configured Nature Power move reference')
weights = {}
for raw, body in re.findall(r'\[NATIONAL_DEX_(\w+)\]\s*=\s*\{(.*?)\n\s*\},',
                           (source / 'src/data/pokemon/pokedex_entries.h').read_text(), re.S):
    if raw == 'NONE':
        continue
    match = re.search(r'\.weight\s*=\s*(\d+)', body)
    if not match:
        raise ValueError('Missing species weight: ' + raw)
    weights[raw.lower()] = int(match[1])
if not weights:
    raise ValueError('No species weights parsed')
session.text(session.target / 'engine/rules/gen3/reference-metadata.js',
             generated_header(session.owner, source) +
             "// Curse's TYPE_MYSTERY uses normal metadata; the effect chooses its branch.\n" +
             '// Species weights are hectograms, as in the original.\n' +
             'export const GEN3_REFERENCE_MOVES = ' + json.dumps(moves, indent=2) + ';\n' +
             'export const NATURE_POWER_MOVES = Object.fromEntries(' + json.dumps(wanted) +
             '.map(id => [id, GEN3_REFERENCE_MOVES[id]]));\n' +
             'export const SPECIES_WEIGHTS = ' + json.dumps(weights, indent=2) + ';\n')
print(f'{len(moves)} moves, {len(weights)} weights')
session.finish()
