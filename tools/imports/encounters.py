"""One encounter importer for land and water; never truncate mismatched source weights."""
import json


def merge_encounters(session, kind, field, rate):
    data = session.load()
    selected = session.select('maps', data['maps'])
    source = json.loads((session.source / 'src/data/wild_encounters.json').read_text())
    groups = source['wild_encounter_groups']
    if not groups:
        raise ValueError('Missing encounter groups')
    matched = set()
    source_ids = {data['maps'][name]['id'].upper(): name for name in selected}
    for group in groups:
        weights = next((entry['encounter_rates'] for entry in group.get('fields', []) if entry['type'] == kind), None)
        if weights is None:
            continue
        for row in group['encounters']:
            name = source_ids.get(row['map'].removeprefix('MAP_'))
            if name is None or not row.get(kind):
                continue
            if name in matched:
                raise ValueError('Duplicate encounter table: ' + name)
            matched.add(name)
            table = row[kind]
            if len(table['mons']) != len(weights):
                raise ValueError('Encounter slot/weight mismatch: ' + name)
            entries = []
            for mon, weight in zip(table['mons'], weights):
                species = mon['species'].removeprefix('SPECIES_').lower()
                if species not in data['species']:
                    raise ValueError(f'Missing prerequisite species: {name}.{species}')
                entries.append({'species': species, 'min': mon['min_level'], 'max': mon['max_level'], 'weight': weight})
            data['maps'][name][field] = entries
            data['maps'][name][rate] = table['encounter_rate']
    for name in selected:
        if name not in matched:
            # No table is normal for indoor/no-grass maps; distinguish it from a missing source file.
            session.omit('encounterTable', name, kind, 'reference has no table for selected map')
    session.content(data)
