"""Translate original evolution methods into generic conditions, retaining only imported species."""
import argparse,json,re
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('source');args=parser.parse_args()
p=Path(__file__).resolve().parents[1]/'dist/content.json';data=json.loads(p.read_text());source=(Path(args.source)/'src/data/pokemon/evolution.h').read_text();result={}
for name,body in re.findall(r'\[SPECIES_(\w+)\]\s*=\s*\{(.*?)(?=\n\s*\[SPECIES_|\n\};)',source,re.S):
    origin=name.lower()
    if origin not in data['species']:continue
    entries=re.findall(r'\{(EVO_\w+),\s*(\w+),\s*SPECIES_(\w+)\}', body)
    rules=[]
    for method,param,target in entries:
        to=target.lower()
        if to not in data['species']or method=='EVO_LEVEL_SHEDINJA':continue
        conditions=[];trigger='level';extra={}
        if method=='EVO_ITEM':trigger='item';conditions=[{'type':'item','id':param.replace('ITEM_','').lower()}]
        elif method=='EVO_TRADE_ITEM':trigger='trade';conditions=[{'type':'heldItem','id':param.replace('ITEM_','').lower()}];extra={'consumeHeld':True}
        elif method=='EVO_TRADE':trigger='trade'
        elif method.startswith('EVO_FRIENDSHIP'):
            conditions=[{'type':'friendship','value':220}]
            if method.endswith('DAY'):conditions.append({'type':'time','period':'day'})
            if method.endswith('NIGHT'):conditions.append({'type':'time','period':'night'})
        elif method=='EVO_BEAUTY':conditions=[{'type':'beauty','value':int(param)}]
        elif method.startswith('EVO_LEVEL'):
            conditions=[{'type':'level','value':int(param)}]
            if method in ['EVO_LEVEL_ATK_LT_DEF','EVO_LEVEL_ATK_GT_DEF','EVO_LEVEL_ATK_EQ_DEF']:conditions.append({'type':'statCompare','left':'atk','right':'def','relation':method.split('_')[3].lower()})
            elif method=='EVO_LEVEL_SILCOON':conditions.append({'type':'personality','min':0,'max':4})
            elif method=='EVO_LEVEL_CASCOON':conditions.append({'type':'personality','min':5,'max':9})
            elif method=='EVO_LEVEL_NINJASK':
                if 'shedinja'in data['species']:extra={'extra':'shedinja'}
            elif method!='EVO_LEVEL':raise ValueError('Unknown method '+method)
        else:raise ValueError('Unknown method '+method)
        rules.append({'id':origin+'.'+method.lower()+'.'+to,'to':to,'trigger':trigger,'conditions':conditions,**extra})
    if rules:result[origin]=rules
if not result:raise ValueError('No evolution content parsed')
data['evolutions']=result
if 'azurill'in data['species']:data['species']['azurill']['offspring']={'incense':{'item':'sea_incense','without':'marill'}}
p.write_text(json.dumps(data,ensure_ascii=False,separators=(',',':')))
print('Imported',sum(map(len,result.values())),'evolution rules in',len(result),'families')
