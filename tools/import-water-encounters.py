"""Merge original surfing tables, preserving land encounters and evolution content."""
import argparse,json
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('source');args=parser.parse_args()
p=Path(__file__).resolve().parents[1]/'dist/content.json';data=json.loads(p.read_text());group=json.loads((Path(args.source)/'src/data/wild_encounters.json').read_text())['wild_encounter_groups'][0]
weights=next(f['encounter_rates']for f in group['fields']if f['type']=='water_mons')
for row in group['encounters']:
    name=next((id for id in data['maps']if id.upper()==row['map'].replace('MAP_','')),None)
    if name and row.get('water_mons'):
        table=row['water_mons'];entries=[{'species':m['species'].replace('SPECIES_','').lower(),'min':m['min_level'],'max':m['max_level'],'weight':w}for m,w in zip(table['mons'],weights)]
        if any(v['species']not in data['species']for v in entries):raise ValueError('Import the required water species first')
        data['maps'][name]['waterEncounters']=entries;data['maps'][name]['waterEncounterRate']=table['encounter_rate'];print(name,'surf encounters')
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
