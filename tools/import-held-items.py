"""Import canonical Emerald hold effect metadata; gameplay handlers remain separately authored."""
import re,json
from pathlib import Path
source=Path('work/pokeemerald/src/data/items.h').read_text()
items={}
for ident,body in re.findall(r'\[ITEM_(\w+)\]\s*=\s*\{(.*?)\n    \}',source,re.S):
    effect=re.search(r'\.holdEffect\s*=\s*HOLD_EFFECT_(\w+)',body)
    if not effect:continue
    name=re.search(r'\.name\s*=\s*_\("(.*?)"\)',body).group(1)
    param=re.search(r'\.holdEffectParam\s*=\s*(\d+)',body)
    items[ident.lower()]={'name':name,'holdEffect':effect.group(1).lower(),'parameter':int(param.group(1)) if param else 0,'price':int(re.search(r'\.price\s*=\s*(\d+)',body).group(1))}
Path('dist/engine/rules/gen3/held-catalog.js').write_text('// Generated from pret/pokeemerald src/data/items.h by tools/import-held-items.py.\nexport const HELD_ITEM_METADATA = '+json.dumps(items,ensure_ascii=False,indent=2)+';\n')
print(len(items),'items,',len(set(i['holdEffect'] for i in items.values())),'effect types')
