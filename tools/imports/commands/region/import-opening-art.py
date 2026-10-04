"""Import pinned wall-clock tilemaps and Littleroot door frames; no source writes.

The door remains a visual metatile overlay: collision and warps are untouched.
Re-run after grid import. --check uses the same ownership and validation pipeline.
"""
import argparse
import hashlib
import json
import math
import re
import struct
from PIL import Image
from imports.context import ImportSession, arguments, source_argument, source_revision, generated_header
from imports.pixel_assets import paint_4bpp as paint

parser = argparse.ArgumentParser(description=__doc__)
source_argument(parser)
args = arguments(parser)
session = ImportSession(args, 'import-opening-art.py')
source = session.source
data = session.load()
inputs = []


def read(path):
    full = source / path
    inputs.append({'path': path, 'sha256': hashlib.sha256(full.read_bytes()).hexdigest()})
    return full


def palette(path):
    return [tuple(map(int, line.split())) for line in read(path).read_text().splitlines()[3:19]]


clock = Image.open(read('graphics/wallclock/clock.png'))
hands = Image.open(read('graphics/wallclock/hand.png'))
for gender in ('male', 'female'):
    pal = palette(f'graphics/wallclock/{gender}.pal')
    for mode in ('start', 'view'):
        raw = read(f'graphics/wallclock/clock_{mode}.bin').read_bytes()
        words = struct.unpack('<640H', raw)
        screen = Image.new('RGBA', (240, 160))
        for y in range(20):
            for x in range(30):
                word = words[y * 32 + x]
                index = word & 1023
                tx, ty = index % 16 * 8, index // 16 * 8
                if ty + 8 > clock.height:
                    raise ValueError(f'Clock tile out of bounds: {index}')
                tile = paint(clock.crop((tx, ty, tx + 8, ty + 8)), pal)
                if word & 1024:
                    tile = tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                if word & 2048:
                    tile = tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
                screen.paste(tile, (x * 8, y * 8))
        session.image(screen, session.dist / f'assets/wallclock-{gender}-{mode}.png')
    session.image(paint(hands, palette('graphics/wallclock/male.pal'), True), session.dist / f'assets/wallclock-{gender}-hands.png')

native = read('src/wallclock.c').read_text()
table = re.search(r'sClockHandCoords\[\]\[2\]\s*=\s*\{(.*?)\n\};', native, re.S)
if not table:
    raise ValueError('Missing native clock hand coordinates')
coordinates = [[int(x, 0), int(y, 0)] for x, y in re.findall(
    r'\{\s*(-?0x[0-9a-fA-F]+),\s*(-?0x[0-9a-fA-F]+)\s*\}', table[1])]
if len(coordinates) != 360:
    raise ValueError('Expected 360 native clock hand offsets')
session.text(session.dist / 'packs/emerald/generated/wall-clock.js',
             generated_header('import-opening-art.py', source) +
             'export const WALL_CLOCK_HAND_OFFSETS = Object.freeze(' +
             json.dumps(coordinates, separators=(',', ':')) + '.map(Object.freeze));\n')

# These IDs are reserved for this derived animation in the pack, never in the source.
pack = data['tilesets']['general-petalburg']
image = Image.open(session.dist / 'assets/tiles-general-petalburg.png').convert('RGBA')
start = pack['atlas']['tileCount']
# On repeat import, replace our appended tiles instead of growing the atlas.
keys = [str((15 << 12) | (960 + i)) for i in range(24)]
if keys[0] in pack['lookup']:
    start = pack['lookup'][keys[0]]
    if pack['atlas']['tileCount'] != start + 24:
        raise ValueError('Door atlas has additional downstream tiles; re-import grid before opening-art')
count = start + 24
atlas = Image.new('RGBA', (image.width, math.ceil(count / pack['columns']) * 8))
atlas.paste(image.crop((0, 0, atlas.width, min(image.height, atlas.height))))
door = Image.open(read('graphics/door_anims/littleroot.png'))
palettes = {i: palette(f'data/tilesets/secondary/petalburg/palettes/{i:02d}.pal') for i in (6, 10)}
for frame in range(3):
    tiles = []
    for i in range(8):
        key = keys[frame * 8 + i]
        tile = door.crop((i % 2 * 8, frame * 32 + i // 2 * 8,
                          i % 2 * 8 + 8, frame * 32 + i // 2 * 8 + 8))
        output = paint(tile, palettes[10 if i < 2 else 6], True)
        index = start + frame * 8 + i
        atlas.paste(output, (index % pack['columns'] * 8, index // pack['columns'] * 8))
        pack['lookup'][key] = index
        tiles.append(int(key))
    for half in range(2):
        ident = str(900 + frame * 2 + half)
        pack['metatiles'][ident] = tiles[half * 4:half * 4 + 4] + [0, 0, 0, 0]
        pack['attributes'][ident] = 0
pack['atlas'] = {'width': atlas.width, 'height': atlas.height, 'tileCount': count}
session.image(atlas, session.dist / 'assets/tiles-general-petalburg.png')
session.text(session.dist / 'assets/opening-art-source.json', json.dumps({
    'generator': 'tools/import.py opening-art', 'revision': source_revision(source),
    'inputs': sorted({x['path']: x for x in inputs}.values(), key=lambda x: x['path']),
    'doorMetatiles': [[900, 901], [902, 903], [904, 905]],
}, indent=2) + '\n')
session.content(data)
session.finish()
