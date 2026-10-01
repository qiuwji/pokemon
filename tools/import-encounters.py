import json
from pathlib import Path
import argparse
parser=argparse.ArgumentParser();parser.add_argument('source');args=parser.parse_args()
root=Path(__file__).resolve().parents[1]
p=root/'dist/content.json';db=json.loads(p.read_text());source=json.loads((Path(args.source)/'src/data/wild_encounters.json').read_text())['wild_encounter_groups'][0]
weights=source['fields'][0]['encounter_rates']
for e in source['encounters']:
 key=next((k for k in db['maps'] if k.upper()==e['map'].replace('MAP_','')),None)
 if key and e.get('land_mons'):
  db['maps'][key]['encounters']=[{'species':m['species'].replace('SPECIES_','').lower(),'min':m['min_level'],'max':m['max_level'],'weight':w} for m,w in zip(e['land_mons']['mons'],weights)];db['maps'][key]['encounterRate']=e['land_mons']['encounter_rate']
db['evolutions']={'treecko':{'level':16,'to':'grovyle'},'grovyle':{'level':36,'to':'sceptile'},'torchic':{'level':16,'to':'combusken'},'combusken':{'level':36,'to':'blaziken'},'mudkip':{'level':16,'to':'marshtomp'},'marshtomp':{'level':36,'to':'swampert'},'poochyena':{'level':18,'to':'mightyena'},'zigzagoon':{'level':20,'to':'linoone'},'wingull':{'level':25,'to':'pelipper'}}
p.write_text(json.dumps(db,ensure_ascii=False,separators=(',',':')))
