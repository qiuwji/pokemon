"""Pinned reference lookup and source-anchored dependency collection."""
from pathlib import Path
import json
import re
import subprocess
from .source_parser import TOKEN, c_functions, c_mask, digest, macro_definitions, parse_blocks, without_comment

REVISION = "731ad5bfd6e6f265508d0efcca0ba42f9dcf5881"

def confirm_reference(source):
    actual = subprocess.run(['git','-C',str(source),'rev-parse','HEAD'],check=True,capture_output=True,text=True).stdout.strip()
    if actual != REVISION:
        raise ValueError(f'Reference revision mismatch: expected {REVISION}, got {actual}')
    dirty = subprocess.run(['git','-C',str(source),'diff','HEAD','--name-only'],check=True,capture_output=True,text=True).stdout.strip()
    if dirty:
        raise ValueError('Tracked reference files were modified: ' + dirty)
    return actual


class Reference:
    def __init__(self, source):
        self.source, self.blocks, self.files, self.c_index = Path(source), {}, {}, None
        candidates = set(self.source.glob('data/maps/*/scripts.inc'))
        candidates |= set(self.source.glob('data/scripts/*.inc')) | set(self.source.glob('data/text/*.inc'))
        candidates |= {self.source/'data/event_scripts.s'}
        pending = list(sorted(candidates))
        while pending:
            path = pending.pop()
            key = path.relative_to(self.source).as_posix()
            if key in self.files or not path.is_file():
                continue
            text = path.read_text(encoding='utf-8')
            self.files[key] = digest(text)
            for block in parse_blocks(text,key):
                self.blocks.setdefault(block['label'],[]).append(block)
            for line in text.splitlines():
                include = re.match(r'\s*\.include\s+"([^"\n]+)"', without_comment(line))
                if include:
                    target = (self.source/include[1]).resolve()
                    if not target.is_relative_to(self.source.resolve()):
                        raise ValueError('Include outside reference: '+include[1])
                    if target.suffix in ('.inc','.s'):
                        pending.append(target)

    def block(self, label):
        found = self.blocks.get(label,[])
        if len(found) != 1:
            raise ValueError(f'{"Unknown" if not found else "Ambiguous"} reference label: {label}')
        return found[0]

    def c_function(self, name):
        if self.c_index is None:
            self.c_index = {}
            for path in sorted(self.source.glob('src/**/*.c')):
                key = path.relative_to(self.source).as_posix()
                for name_, record in c_functions(path.read_text(encoding='utf-8'),key).items():
                    self.c_index.setdefault(name_,[]).append(record)
        return [{**record, 'functionReferences':sorted(set(TOKEN.findall(c_mask(record['raw']))) & set(self.c_index) - {name})}
                for record in self.c_index.get(name,[])]

    def packet(self, maps, entries=(), functions=()):
        maps = sorted(set(maps))
        if not maps:
            raise ValueError('Select at least one map')
        headers, roots, unresolved = {}, set(entries), []
        for name in maps:
            if not re.fullmatch(r'[A-Za-z0-9_]+',name):
                raise ValueError('Invalid map name: '+name)
            path = self.source/f'data/maps/{name}/map.json'
            if not path.is_file():
                raise ValueError('Unknown reference map: '+name)
            raw = path.read_text(encoding='utf-8')
            header = json.loads(raw)
            headers[name] = {'path':path.relative_to(self.source).as_posix(), 'sha256':digest(raw), 'data':header}
            if not entries:
                key = f'data/maps/{name}/scripts.inc'
                roots.update(label for label, values in self.blocks.items() if any(v['path']==key for v in values))
                roots.update(event['script'] for group in ('object_events','coord_events','bg_events') for event in header.get(group,[]) if event.get('script') not in (None,'0x0','NULL'))
        selected, pending, specials = {}, list(sorted(roots)), {}
        while pending:
            label = pending.pop()
            if label in selected:
                continue
            block = dict(self.block(label))
            refs = []
            for command in block['instructions']:
                op, args = command['op'], command['args']
                if op in ('special','specialvar') and args:
                    name = args[-1]
                    specials.setdefault(name,[]).append({'label':label,'line':command['line']})
                targets = set(token for arg in args for token in TOKEN.findall(arg) if token in self.blocks)
                required = (args[-1] if args and (op.startswith(('goto','call')) and op not in ('callnative',) or op in ('map_script','map_script_2','case'))
                            else args[0] if args and op in ('msgbox','message')
                            else args[1] if len(args)>1 and op in ('applymovement','applywaitmovement') else None)
                if required and re.fullmatch(r'[A-Za-z_]\w*',required) and not required.startswith('VAR_'):
                    targets.add(required)
                for target in sorted(targets):
                    resolved = len(self.blocks.get(target,[]))==1
                    ref = {'target':target,'line':command['line'],'op':op,'resolved':resolved}
                    refs.append(ref)
                    if resolved:
                        pending.append(target)
                    else:
                        unresolved.append({'from':label,**ref})
            block['references'] = refs
            selected[label] = block
        c_records, c_pending = {}, set(functions)|set(specials)
        special_file = self.source/'data/specials.inc'
        special_text = special_file.read_text(encoding='utf-8') if special_file.is_file() else ''
        bindings = {}
        for name, callers in sorted(specials.items()):
            match = re.search(r'^\s*def_special\s+'+re.escape(name)+r'(?:\s*,\s*waitstate=(\d+))?\s*$', special_text, re.M)
            bindings[name] = {'callers':callers,'waitstate':int(match[1] or 0) if match else None,
                              'registered':bool(match),'path':'data/specials.inc',
                              'line':special_text.count('\n',0,match.start())+1 if match else None}
        for name in sorted(c_pending):
            records = self.c_function(name)
            c_records[name] = {'status':'found' if len(records)==1 else 'ambiguous' if records else 'unresolved',
                               'definitions':records, 'reviewRequired':True}
        macros = {}
        used_ops = {i['op'] for block in selected.values() for i in block['instructions']}
        for path in sorted(self.source.glob('asm/**/*.inc')):
            key = path.relative_to(self.source).as_posix()
            for name, record in macro_definitions(path.read_text(encoding='utf-8'),key).items():
                if name in used_ops:
                    macros[name] = record
        used_paths = {b['path'] for b in selected.values()}
        inputs = {path:self.files[path] for path in sorted(used_paths)}
        inputs.update({v['path']:v['sha256'] for v in headers.values()})
        for macro in macros.values():
            path = macro['path']
            inputs[path] = digest((self.source/path).read_text(encoding='utf-8'))
        if specials:
            inputs['data/specials.inc'] = digest(special_text)
        for item in c_records.values():
            for record in item['definitions']:
                path = record['path']
                inputs[path] = digest((self.source/path).read_text(encoding='utf-8'))
        inventory = [{'id':f'{name}:{group}:{index}', 'map':name, 'kind':group, 'index':index,
                      'script':event['script'], 'included':event['script'] in selected,
                      'sourceAvailable':len(self.blocks.get(event['script'],[]))==1}
                     for name, item in headers.items() for group in ('object_events','coord_events','bg_events')
                     for index, event in enumerate(item['data'].get(group,[]))
                     if event.get('script') not in (None,'0x0','NULL')]
        return {'version':1,'sourceRevision':REVISION,'selection':{'maps':maps,'entries':sorted(set(entries)), 'functions':sorted(set(functions))},
                'maps':headers,'entryInventory':inventory,'roots':sorted(roots),'blocks':dict(sorted(selected.items())),
                'specials':bindings,'cFunctions':c_records,'macros':dict(sorted(macros.items())),'inputs':dict(sorted(inputs.items())),
                'unresolved':sorted(unresolved,key=lambda r:(r['from'],r['line'],r['target']))}
