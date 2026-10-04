from imports.context import ImportSession, arguments
import json
from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('source');args=arguments(parser);session=ImportSession(args,"import-encounters.py")
root=Path(__file__).resolve().parents[1]
db=session.load();source=json.loads((Path(args.source)/'src/data/wild_encounters.json').read_text())['wild_encounter_groups'][0]
weights=source['fields'][0]['encounter_rates']
for e in source['encounters']:
 key=next((k for k in db['maps'] if k.upper()==e['map'].replace('MAP_','')),None)
 if key and e.get('land_mons'):
  db['maps'][key]['encounters']=[{'species':m['species'].replace('SPECIES_','').lower(),'min':m['min_level'],'max':m['max_level'],'weight':w} for m,w in zip(e['land_mons']['mons'],weights)];db['maps'][key]['encounterRate']=e['land_mons']['encounter_rate']
session.content(db)

session.finish()
