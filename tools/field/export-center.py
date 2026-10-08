"""Export native healing palettes and monitor frames.

Only read the pinned reference. --check compares bytes without writing outputs.
"""
import argparse
import hashlib
import io
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from imports.pixel_assets import read_palette, paint_4bpp

ROOT = Path(__file__).resolve().parents[2]
REVISION = '731ad5bfd6e6f265508d0efcca0ba42f9dcf5881'


def export(source):
    revision = subprocess.check_output(['git', '-C', str(source), 'rev-parse', 'HEAD'], text=True).strip()
    if revision != REVISION:
        raise ValueError('Unexpected reference revision')
    inputs = {}
    def read(path):
        file = source / path
        inputs[path] = hashlib.sha256(file.read_bytes()).hexdigest()
        return file
    read('src/field_effect.c')
    read('src/data/object_events/object_event_anims.h')
    read('src/data/object_events/object_event_pic_tables.h')
    palette = read_palette(read('graphics/field_effects/palettes/pokeball_glow.pal'))
    ball = Image.open(read('graphics/field_effects/pics/pokeball_glow.png'))
    sheet = Image.new('RGBA', (8, 8 * 9))
    sheet.paste(paint_4bpp(ball, palette, True), (0, 0))
    # Flash1 changes palette entries, not per-ball opacity. Blue stays unchanged.
    groups = {8: 3, 6: 2, 2: 1, 5: 0, 3: 0}
    for uniform in (False, True):
        for phase in range(4):
            colors = list(palette)
            for index, offset in groups.items():
                amount = [16, 12, 8, 0][(phase + (0 if uniform else offset)) & 3]
                r, g, b = palette[index]
                colors[index] = tuple((v // 8 + ((31 - v // 8) * amount >> 4)) * 8 for v in (r, g)) + (b // 8 * 8,)
            sheet.paste(paint_4bpp(ball, colors, True), (0, (1 + phase + 4 * uniform) * 8))
    monitor = Image.new('RGBA', (24, 32))
    colors = read_palette(read('graphics/field_effects/palettes/general_0.pal'))
    for frame in range(2):
        image = Image.open(read(f'graphics/field_effects/pics/pokecenter_monitor/{frame}.png'))
        monitor.paste(paint_4bpp(image, colors, True), (0, frame * 16))
    output = {}
    for name, image in [('field-heal-ball.png', sheet), ('field-heal-monitor.png', monitor)]:
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        output['generated/assets/' + name] = buffer.getvalue()
    output['generated/assets/field-center-source.json'] = (json.dumps({'revision': revision, 'inputs': inputs}, indent=2) + '\n').encode()
    return output


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=ROOT / 'work/pokeemerald')
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    changes = []
    for relative, data in export(args.source).items():
        path = ROOT / relative
        if not path.exists() or path.read_bytes() != data:
            changes.append(relative)
            if not args.check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
    print(json.dumps({'changed': changes, 'check': args.check}))
    if args.check and changes:
        raise SystemExit(1)
