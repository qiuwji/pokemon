#!/usr/bin/env python3
"""Stage the directly served runtime for Pages outside the repository. No build or source rewrite."""
import argparse
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
ENTRY = '''<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><title>口袋妖怪 · 绿宝石</title>
<script>location.replace("src/index.html" + location.search + location.hash);</script>
<noscript><a href="src/index.html">进入游戏（需要启用 JavaScript）</a></noscript></html>
'''


def package(root, output):
    root, output = Path(root).resolve(), Path(output).resolve()
    if output.is_relative_to(root) or root.is_relative_to(output):
        raise ValueError('Pages output must be outside the repository')
    if output.exists() and (not output.is_dir() or any(output.iterdir())):
        raise ValueError('Pages output must be absent or empty')
    trees = [root / 'src', root / 'generated']
    # Validate all inputs before creating anything; never dereference a private symlink.
    for tree in trees:
        if tree.is_symlink() or not tree.is_dir():
            raise ValueError(f'Missing runtime directory: {tree.name}')
        for path in tree.rglob('*'):
            if path.is_symlink() or not (path.is_dir() or path.is_file()):
                raise ValueError(f'Unsupported runtime entry: {path.relative_to(root)}')
    if not (root / 'src/index.html').is_file():
        raise ValueError('Missing runtime entry page')
    audio = root / 'generated/assets/audio'
    for source in audio.rglob('*.wav'):
        if not source.with_suffix('.mp3').is_file():
            raise ValueError(f'Missing compressed audio: {source.relative_to(root)}')
    def delivery_only(directory, names):
        if Path(directory).is_relative_to(audio):
            return [name for name in names if name.endswith('.wav')]
        return []
    output.mkdir(parents=True, exist_ok=True)
    for tree in trees:
        shutil.copytree(tree, output / tree.name, ignore=delivery_only)
    (output / 'index.html').write_text(ENTRY, encoding='utf-8')
    (output / '.nojekyll').touch()
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    print(package(ROOT, args.output))
