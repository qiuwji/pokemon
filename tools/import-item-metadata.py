"""Canonical item metadata, including inert held objects; no behaviour inferred from names."""
import re,json
from pathlib import Path
source=Path('work/pokeemerald/src/data/items.h').read_text();items={}
for ident,body in re.findall(r'\[ITEM_(\w+)\]\s*=\s*\{(.*?)\n    \}',source,re.S):
    if re.search(r'\.itemId\s*=\s*ITEM_NONE\b',body):continue
    name=re.search(r'\.name\s*=\s*_\("(.*?)"\)',body);pocket=re.search(r'\.pocket\s*=\s*(\w+)',body)
    if not name or not pocket:continue
    effect=re.search(r'\.holdEffect\s*=\s*HOLD_EFFECT_(\w+)',body);param=re.search(r'\.holdEffectParam\s*=\s*(\d+)',body);price=re.search(r'\.price\s*=\s*(\d+)',body)
    use=re.search(r'\.fieldUseFunc\s*=\s*(\w+)',body)
    key=ident.lower();key='pokeball' if key=='poke_ball' else key
    items[key]={'name':name.group(1),'price':int(price.group(1)) if price else 0,'holdable':pocket.group(1)!='POCKET_KEY_ITEMS' and not ident.startswith('HM_'),'holdEffect':effect.group(1).lower() if effect else 'none','parameter':int(param.group(1)) if param else 0,'fieldUse':use.group(1) if use else None}
Path('dist/engine/rules/gen3/item-metadata.js').write_text('// Generated from pret/pokeemerald src/data/items.h.\nexport const ITEM_METADATA = '+json.dumps(items,ensure_ascii=False,indent=2)+';\n')
print(len(items),'canonical items,',sum(i['holdable'] for i in items.values()),'holdable')
