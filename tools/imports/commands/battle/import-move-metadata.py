"""Merge target/contact/sound metadata using the shared strict original move parser."""
import argparse
from imports.context import PROJECT, ImportSession, arguments, source_argument
from imports.battle_moves import parse_moves

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
args = arguments(parser, selectors=('moves',))
session = ImportSession(args, 'import-move-metadata.py')
data = session.load()
reference = parse_moves((session.source / 'src/data/battle_moves.h').read_text(),
                        (session.source / 'src/battle_util.c').read_text())
selected = session.select('moves', data['moves'])
missing = sorted(set(selected) - reference.keys())
if missing:
    raise ValueError('Pack moves absent from reference: ' + ', '.join(missing))
for ident in selected:
    move = data['moves'][ident]
    metadata = reference[ident]
    for key in ('target', 'contact', 'sound'):
        move[key] = metadata[key]
    # Pack flags retain their original C identifiers; the full rule table uses normalized IDs.
    move['flags'] = ['FLAG_' + flag.upper() for flag in metadata['flags']]
session.content(data)
print('Imported target/contact metadata for', len(data['moves']), 'moves')
session.finish()
