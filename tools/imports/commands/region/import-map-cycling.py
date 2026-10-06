"""Generate original cycling permissions from read-only map headers."""
import argparse
import json
from imports.context import PROJECT, ImportSession, arguments, source_argument, generated_header, require_files

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
args = arguments(parser)
session = ImportSession(args, 'import-map-cycling.py')
data = {}
for path in require_files(session.source / 'data/maps', '*/map.json'):
    header = json.loads(path.read_text())
    data[header['name']] = header['allow_cycling']
session.text(session.target / 'engine/rules/gen3/map-cycling.js',
             generated_header(session.owner, session.source) +
             '// Metadata does not imply playable maps.\nexport const GEN3_MAP_CYCLING = ' + json.dumps(data, indent=2) + ';\n')
print(f'{len(data)} map cycling permissions')
session.finish()
