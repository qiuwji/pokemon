"""Install a portable BGM pack into a project, with preview and rollback on failure."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import tempfile
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from workspace import WorkspaceView


def install(pack, project, check=False):
    metadata = json.loads((pack / 'manifest.json').read_text())
    asset_name = metadata['assetName']
    if Path(asset_name).name != asset_name or asset_name != metadata['song'].lower() + '.wav':
        raise ValueError('Audio filename must match the original song identity')
    audio = (pack / asset_name).read_bytes()
    if hashlib.sha256(audio).hexdigest() != metadata['assetSha256']:
        raise ValueError('Pack audio checksum differs from manifest')
    workspace = WorkspaceView(project)
    root = workspace.root
    cue = metadata['cue']
    asset = Path(os.path.abspath(root / cue['source']))
    if not asset.is_relative_to(root.resolve()) or not cue['source'].startswith('assets/audio/'):
        raise ValueError('Invalid pack asset destination')
    identifier = metadata['id']
    if not identifier or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in identifier):
        raise ValueError('Invalid pack identity')
    if cue['source'] != f'assets/audio/{identifier}/{asset_name}':
        raise ValueError('Cue source must match the pack audio filename')
    catalog_path = root / 'plugins/catalog.json'
    catalog = json.loads(catalog_path.read_text())
    previous = next((e for e in catalog['plugins'] if e['id'] == identifier), None)
    default_enabled = bool(metadata.get('defaultEnabled', False))
    module_path = f'../../generated/plugins/{identifier}.js' if workspace.sources else './' + identifier + '.js'
    entry = {'id': identifier, 'module': module_path, 'export': 'bgmPlugin', 'enabled': default_enabled}
    if previous:
        if previous['module'] != entry['module'] or previous['export'] != entry['export']:
            raise ValueError('Existing plugin identity belongs to a different module')
        # The pack declares its own default; an already enabled plugin is never turned back off.
        entry['enabled'] = default_enabled or previous.get('enabled', False)
        catalog['plugins'][catalog['plugins'].index(previous)] = entry
    else:
        catalog['plugins'].append(entry)
    plugin = (pack / 'plugin.js').read_bytes()
    if workspace.sources:
        plugin = plugin.replace(b'"assets/', b'"generated/assets/').replace(b"'assets/", b"'generated/assets/")
    changes = {asset: audio, root / 'plugins' / (identifier + '.js'): plugin,
               catalog_path: (json.dumps(catalog, ensure_ascii=False, indent=2) + '\n').encode()}
    manifest = json.loads((root / 'content/manifest.json').read_text())
    maps = []
    for record in manifest['files']:
        if record['section'] != 'maps' or record.get('generated'):
            continue
        path = Path(os.path.abspath(root / 'content' / record['path']))
        if not path.is_relative_to((root / 'content').resolve()):
            raise ValueError('Invalid content path')
        data = json.loads(path.read_text())
        if data.get('music') not in (metadata['song'], metadata['cueId']):
            continue
        data['music'] = metadata['cueId']
        maps.append(record['key'])
        changes[path] = (json.dumps(data, ensure_ascii=False, indent=2) + '\n').encode()
    if not maps and not metadata.get('selection'):
        raise ValueError('No current map uses this original song; no installation performed')
    changes = {workspace.destination(path, generated=path != catalog_path and path not in
                 [root / 'content' / entry['path'] for entry in manifest['files']]): data
               for path, data in changes.items()}
    changes = {p: b for p, b in changes.items() if not p.exists() or p.read_bytes() != b}
    report = {'maps': maps, 'files': [str(p.relative_to(project.resolve())) for p in changes],
              'selection': metadata.get('selection', 'map-music'),
              'pluginDefault': 'enabled' if entry['enabled'] else 'disabled',
              'enableQuery': '?plugins=' + identifier, 'check': check}
    if not check:
        before = {p: p.read_bytes() if p.exists() else None for p in changes}
        committed = []
        with tempfile.TemporaryDirectory(dir=project, prefix='.bgm-install-') as staging:
            staged = []
            for i, (path, content) in enumerate(changes.items()):
                temp = Path(staging) / str(i)
                temp.write_bytes(content)
                staged.append((path, temp))
            try:
                for path, temp in staged:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    os.replace(temp, path)
                    committed.append(path)
            except BaseException:
                for path in reversed(committed):
                    if before[path] is None:
                        path.unlink()
                    else:
                        path.write_bytes(before[path])
                raise
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pack', type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument('--project', type=Path)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    project = args.project or args.pack.resolve().parent
    print(json.dumps(install(args.pack.resolve(), project.resolve(), args.check), ensure_ascii=False, indent=2))
