#!/usr/bin/env python3
"""Export/verify pinned evidence or convert supported movement; never edit source or game content."""
import argparse
import json
from pathlib import Path
import sys
import subprocess

PROJECT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT / "tools"))
from story.reference import Reference, confirm_reference
from story.source_parser import canonical, digest
from story.review import review_template, validate_review


def document(packet):
    lines = ['# 原作提取证据（自动生成）', '',
             f'固定修订：`{packet["sourceRevision"]}`。此文件只展示源数据，不是已完成的游戏剧情。', '',
             f'入口 {len(packet["roots"])}；标签 {len(packet["blocks"])}；未解析引用 {len(packet["unresolved"])}。', '',
             '中文译文、分支解释和待办写在 review.json；不要手改本文件。', '', '## 地图入口及对象', '']
    for name, item in packet['maps'].items():
        header = item['data']
        lines += [f'### {name}', '', f'来源：`{item["path"]}`，SHA-256 `{item["sha256"]}`。', '', '```json',
                  json.dumps({k:header.get(k) for k in ('object_events','coord_events','bg_events','warp_events')}, ensure_ascii=False, indent=2), '```', '']
    for label, block in packet['blocks'].items():
        lines += [f'## `{label}`', '', f'`{block["path"]}:{block["line"]}`，类型 `{block["kind"]}`，SHA-256 `{block["sha256"]}`。', '',
                  '```asm', block['raw'].rstrip('\n'), '```', '']
        if block['kind']=='text':
            lines += ['原文（仅显示解码，原始控制符见 encodedText/raw）：', '', '```text', block['text'], '```', '']
    lines += ['## special / C 继续追踪', '', '仅词法定位，possibleCalls 不是已证明的调用图。', '']
    for name, item in packet['cFunctions'].items():
        lines += [f'### `{name}` · {item["status"]}', '']
        for record in item['definitions']:
            lines += [f'`{record["path"]}:{record["line"]}`', '', '```c', record['raw'], '```', '',
                      '待核对调用：' + ', '.join(f'`{name}`' for name in record['possibleCalls']),
                      '待核对函数引用（含任务回调候选）：' + ', '.join(f'`{name}`' for name in record['functionReferences']), '']
    lines += ['## 指令宏（需要继续追踪宏调用时读取）', '']
    for name, record in packet['macros'].items():
        lines += [f'### `{name}`', '', f'`{record["path"]}:{record["line"]}`', '', '```asm', record['raw'], '```', '']
    lines += ['## 未解析引用', '', '```json', json.dumps(packet['unresolved'],ensure_ascii=False,indent=2), '```', '']
    return '\n'.join(lines)


def safe_destination(path, source):
    path = path.expanduser().resolve()
    if path.is_relative_to(source) or path.is_relative_to(PROJECT/'sources'):
        raise ValueError('Output must be outside read-only reference directories')
    return path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('extract','verify','movement'))
    parser.add_argument('--source', type=Path, default=PROJECT/'work/pokeemerald')
    parser.add_argument('--profile', type=Path)
    parser.add_argument('--maps', nargs='+')
    parser.add_argument('--entries', nargs='+')
    parser.add_argument('--functions', nargs='+')
    parser.add_argument('--out', type=Path, help='Evidence folder; writes only packet.json, source.md, and a new review.json')
    parser.add_argument('--packet', type=Path)
    parser.add_argument('--review', type=Path)
    parser.add_argument('--check', action='store_true', help='Preview extraction counts without writing files')
    parser.add_argument('--label', help='Movement array label for the movement action')
    parser.add_argument('--actor', help='Stable web actor ID for the movement action')
    parser.add_argument('--map', dest='map_id', help='Visual hop map for the movement action')
    parser.add_argument('--ready', action='store_true', help='Require reviewed entries/translations and source-anchored scenarios; not a gameplay certification')
    args = parser.parse_args()
    source = args.source.expanduser().resolve()
    confirm_reference(source)
    reference = Reference(source)
    if args.action=='extract':
        if args.out is None:
            parser.error('extract requires --out')
        profile = json.loads(args.profile.read_text(encoding='utf-8')) if args.profile else {}
        if set(profile)-{'maps','entries','functions'}:
            raise ValueError('Unknown selection profile keys')
        maps = args.maps if args.maps is not None else profile.get('maps',[])
        entries = args.entries if args.entries is not None else profile.get('entries',[])
        functions = args.functions if args.functions is not None else profile.get('functions',[])
        if any(not isinstance(values,list) or any(not isinstance(v,str) for v in values) for values in (maps,entries,functions)):
            raise ValueError('Profile selections must be arrays of names')
        packet = reference.packet(maps,entries,functions)
        out = safe_destination(args.out,source)
        if args.check:
            names = ['packet.json','source.md'] + ([] if (out/'review.json').exists() else ['review.json'])
            print(json.dumps({'check':True,'files':[str(out/name) for name in names],
                              'roots':len(packet['roots']),'blocks':len(packet['blocks']),'unresolved':len(packet['unresolved'])}))
            return 0
        out.mkdir(parents=True,exist_ok=True)
        (out/'packet.json').write_text(json.dumps(packet,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        (out/'source.md').write_text(document(packet),encoding='utf-8')
        review = out/'review.json'
        if not review.exists():
            review.write_text(json.dumps(review_template(packet),ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        problems = ['Unresolved script references require review'] if packet['unresolved'] else []
        print(json.dumps({'out':str(out), 'packetSha256':digest(canonical(packet)), 'roots':len(packet['roots']),
                          'blocks':len(packet['blocks']), 'unresolved':len(packet['unresolved']), 'warnings':problems},ensure_ascii=False))
        return 0
    if args.packet is None:
        parser.error('verify requires --packet')
    packet = json.loads(args.packet.read_text(encoding='utf-8'))
    selection = packet.get('selection',{})
    rebuilt = reference.packet(selection.get('maps',[]), selection.get('entries',[]), selection.get('functions',[]))
    problems = []
    if packet != rebuilt:
        problems.append('Packet differs from pinned source; extract again and review the differences')
    markdown = args.packet.parent/'source.md'
    if markdown.exists() and markdown.read_text(encoding='utf-8') != document(packet):
        problems.append('Generated source.md was edited or does not match packet.json')
    if packet.get('unresolved'):
        problems.append('Unresolved script references in packet')
    if args.action == 'movement':
        if problems:
            raise ValueError('; '.join(problems))
        if not args.label or not args.actor:
            parser.error('movement requires --label and --actor')
        from story.movement import movement_document
        print(json.dumps(movement_document(packet,args.label,args.actor,map_id=args.map_id),ensure_ascii=False,indent=2))
        return 0
    if args.review:
        problems += validate_review(packet,json.loads(args.review.read_text(encoding='utf-8')),args.ready)
    elif args.ready:
        problems.append('--ready requires --review')
    print(json.dumps({'sourceMatches':packet==rebuilt,'problems':problems,
                      'scope':'Source extraction/review only; translation meaning, C asynchronous semantics and gameplay require separate review.'},ensure_ascii=False,indent=2))
    return 1 if problems else 0


if __name__=='__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, KeyError, subprocess.CalledProcessError) as error:
        print(f'Extraction failed: {error}',file=sys.stderr)
        raise SystemExit(1)
