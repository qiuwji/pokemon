"""Merge selected breeding/held-item metadata and report every omitted move dependency."""
import argparse
import re
from imports.context import ImportSession, arguments, source_argument

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
args = arguments(parser, selectors=('species',))
session = ImportSession(args, 'import-species-metadata.py')
data = session.load()
selected = session.select('species', data['species'])
source = (session.source / 'src/data/pokemon/species_info.h').read_text()
entries = {name.lower(): body for name, body in re.findall(r'\[SPECIES_(\w+)\]\s*=\s*\{(.*?)\n    \}', source, re.S)}
session.select('species', entries, selected)
eggs = {name.lower(): re.findall(r'MOVE_(\w+)', body) for name, body in re.findall(
    r'egg_moves\((\w+),(.*?)\)', (session.source / 'src/data/pokemon/egg_moves.h').read_text(), re.S)}
machines = {name.lower(): re.findall(r'\.(\w+)\s*=\s*TRUE', body) for name, body in re.findall(
    r'\[SPECIES_(\w+)\]\s*=\s*\{\s*\.learnset\s*=\s*\{(.*?)\}',
    (session.source / 'src/data/pokemon/tmhm_learnsets.h').read_text(), re.S)}
if not eggs or not machines:
    raise ValueError('Missing breeding/machine reference tables')
for ident in selected:
    body, species = entries[ident], data['species'][ident]
    def field(pattern, label):
        match = re.search(pattern, body)
        if not match:
            raise ValueError(f'Missing reference field {ident}.{label}')
        return match[1]
    groups = field(r'\.eggGroups\s*=\s*\{(.*?)\}', 'eggGroups')
    species['eggGroups'] = list(dict.fromkeys(g.lower() for g in re.findall(r'EGG_GROUP_(\w+)', groups)))
    species['eggCycles'] = int(field(r'\.eggCycles\s*=\s*(\d+)', 'eggCycles'))
    friendship = field(r'\.friendship\s*=\s*(\w+)', 'friendship')
    species['friendship'] = 70 if friendship == 'STANDARD_FRIENDSHIP' else int(friendship)
    held = {}
    for name, prop in [('itemCommon', 'common'), ('itemRare', 'rare')]:
        item = field(r'\.' + name + r'\s*=\s*ITEM_(\w+)', name).lower()
        if item != 'none':
            held[prop] = 'pokeball' if item == 'poke_ball' else item
    species['heldItems'] = held
    if ident not in machines:
        raise ValueError('Missing machine eligibility table: ' + ident)
    for prop, table in [('eggMoves', eggs), ('machineMoves', machines)]:
        species[prop] = []
        for raw in table.get(ident, []):
            move = raw.lower()
            if move in data['moves']:
                species[prop].append(move)
            else:
                session.omit(prop, ident, move, 'move not imported')
session.content(data)
session.finish()
