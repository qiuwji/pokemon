"""Extract original map script text labels and event script labels for story transcription.

This is a read-only source aid, not content import: it writes an explicit reference file that
authors translate by hand, so the exact original wording and its label stay traceable.
"""
import argparse
import json
import re
from pathlib import Path

import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from imports.context import arguments, source_argument, source_revision  # noqa: E402

LABEL = re.compile(r'^([A-Za-z_][A-Za-z0-9_]*):\s*$')
STRING = re.compile(r'\.string\s+"((?:[^"\\]|\\.)*)"')
ESCAPES = (('\\n', '\n'), ('\\p', '\n\n'), ('\\l', '\n'), ('\\n\n', '\n\n'))
CONTROL = re.compile(r'\{[A-Z_]+\}')


def decode(raw):
    text = ''.join(STRING.findall(raw)) if isinstance(raw, str) else ''
    for source, target in ESCAPES:
        text = text.replace(source, target)
    return text.strip()


def extract(path):
    """Return the label/text pairs declared in one scripts.inc body."""
    if not path.is_file():
        return {}
    result = {}
    label = None
    buffer = []
    for line in path.read_text(encoding='utf-8', errors='replace').splitlines():
        match = LABEL.match(line)
        if match:
            if label and buffer:
                text = decode('\n'.join(buffer))
                if text:
                    result[label] = text
            label, buffer = match.group(1), []
            continue
        if label and '.string' in line:
            buffer.append(line)
    if label and buffer:
        text = decode('\n'.join(buffer))
        if text:
            result[label] = text
    return result


def text_labels(text):
    """Only game-facing text; movement and script labels are not dialogue."""
    return {label: value for label, value in text.items() if '_Text_' in label or label.startswith('gText_')}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source_argument(parser)
    parser.add_argument('--out', type=Path,
                        help='Write the extracted reference JSON here; relative paths resolve inside --target')
    args = arguments(parser, selectors=('maps',))
    source = Path(args.source).expanduser().resolve()
    revision = source_revision(str(source))
    maps = sorted(p for p in (source / 'data/maps').iterdir() if p.is_dir())
    if args.maps:
        wanted = set(args.maps)
        unknown = wanted - {p.name for p in maps}
        if unknown:
            raise SystemExit('Unknown reference maps: ' + ', '.join(sorted(unknown)))
        maps = [p for p in maps if p.name in wanted]
    document = {'sourceRevision': revision, 'maps': {}}
    total = 0
    for path in maps:
        labels = text_labels(extract(path / 'scripts.inc'))
        if not labels:
            continue
        document['maps'][path.name] = labels
        total += len(labels)
    if not document['maps']:
        raise SystemExit('No original map text found; check the reference revision')
    document['labelCount'] = total
    document['placeholderTokens'] = sorted(set(
        token for labels in document['maps'].values() for value in labels.values()
        for token in CONTROL.findall(value)))
    destination = args.out
    if destination is not None and not destination.is_absolute():
        destination = args.target / destination
    if destination and not args.check:
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(document, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'maps': len(document['maps']), 'labels': total,
                      'tokens': document['placeholderTokens'],
                      'check': bool(args.check),
                      'out': str(destination) if destination and not args.check else None}, ensure_ascii=False))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
