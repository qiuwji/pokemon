"""Import pinned wall-clock tilemaps, door animation frames and battle transition sprite; no source writes.

Door frames stay a visual metatile overlay: collision, behavior and warps keep the original
metatile. Which doors are shipped is derived from the tiles this content actually walks on.
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
        session.image(screen, session.target / f'assets/wallclock-{gender}-{mode}.png')
    session.image(paint(hands, palette('graphics/wallclock/male.pal'), True), session.target / f'assets/wallclock-{gender}-hands.png')

native = read('src/wallclock.c').read_text()
table = re.search(r'sClockHandCoords\[\]\[2\]\s*=\s*\{(.*?)\n\};', native, re.S)
if not table:
    raise ValueError('Missing native clock hand coordinates')
coordinates = [[int(x, 0), int(y, 0)] for x, y in re.findall(
    r'\{\s*(-?0x[0-9a-fA-F]+),\s*(-?0x[0-9a-fA-F]+)\s*\}', table[1])]
if len(coordinates) != 360:
    raise ValueError('Expected 360 native clock hand offsets')
session.text(session.target / 'packs/emerald/generated/wall-clock.js',
             generated_header('import-opening-art.py', source) +
             'export const WALL_CLOCK_HAND_OFFSETS = Object.freeze(' +
             json.dumps(coordinates, separators=(',', ':')) + '.map(Object.freeze));\n')

# Derived door metatiles: IDs 900+ are reserved inside the pack and never exist in the
# reference. Each door occupies three open frames of one top and one bottom metatile; the
# fully open appearance is the last frame, matching GetLastDoorFrame in src/field_door.c.
DOOR_BASE = 900
DOOR_BLOCK = 6
DOOR_TILES = 24
DOOR_FRAMES = 3
# Tiles are addressed as palette<<12 | tile, and the merged tileset leaves this palette free.
DOOR_TILE_PALETTE = 15
# MetatileBehavior_IsDoor accepts exactly these two codes.
DOOR_BEHAVIORS = (0x69, 0x8D)
# Published before this importer covered every door; story content already references them,
# so 584 keeps the 900-905 block and everything else is appended after it.
PINNED_DOORS = (584,)
layouts = {record['id']: record for record in json.loads(read('data/layouts/layouts.json').read_text())['layouts']}


def snake_case(name):
    return re.sub(r'(?<=[a-z0-9])(?=[A-Z])', '_', name).lower()


def native_door_table():
    native = read('src/field_door.c').read_text()
    labels = {name: int(value, 16) for name, value in re.findall(
        r'#define\s+(METATILE_\w+)\s+0x([0-9A-Fa-f]+)',
        read('include/constants/metatile_labels.h').read_text())}
    palettes = {name: [int(v) for v in body.split(',')] for name, body in re.findall(
        r'static const u8 sDoorAnimPalettes_(\w+)\[\]\s*=\s*\{([^}]*)\}', native)}
    table = {}
    for metatile, sound, size, tiles, pal in re.findall(
            r'\{\s*(METATILE_\w+)\s*,\s*(DOOR_SOUND_\w+)\s*,\s*(\d+)\s*,'
            r'\s*(sDoorAnimTiles_\w+)\s*,\s*(sDoorAnimPalettes_\w+)\s*\}',
            native.split('sDoorAnimGraphicsTable[] =')[1].split('{},')[0]):
        if metatile not in labels:
            continue
        table[labels[metatile]] = {
            'label': metatile,
            'sound': sound[len('DOOR_SOUND_'):].lower(),
            'size': int(size),
            'graphic': snake_case(tiles[len('sDoorAnimTiles_'):]),
            'palettes': palettes[pal[len('sDoorAnimPalettes_'):]],
        }
    return table


def content_doors(table):
    """Separate atlases by tileset: the same door metatile uses each map's palette."""
    found = {}
    for ident, record in data['maps'].items():
        tileset = record.get('tileset')
        blocks, behavior = record.get('blocks'), record.get('behavior')
        if not blocks or not behavior:
            continue
        header = json.loads(read(f'data/maps/{ident}/map.json').read_text())
        layout = layouts[header['layout']]
        directories = [f'data/tilesets/{kind}/{snake_case(layout[key].replace("gTileset_", ""))}/palettes'
                       for kind, key in [('primary', 'primary_tileset'), ('secondary', 'secondary_tileset')]]
        for index, value in enumerate(blocks):
            metatile = value & 1023
            if behavior[index] not in DOOR_BEHAVIORS or metatile not in table:
                continue
            found.setdefault(tileset, {}).setdefault(metatile, {'tileset': tileset, 'directories': directories})
    return found


def door_plan(table, found):
    order = [m for m in PINNED_DOORS if m in found] + sorted(
        m for m in found if m not in PINNED_DOORS)
    for position, metatile in enumerate(order):
        if metatile in PINNED_DOORS and DOOR_BASE + DOOR_BLOCK * position != DOOR_BASE:
            raise ValueError('Pinned door moved from its published metatiles: ' + str(metatile))
        found[metatile].update(**table[metatile],
                               base=DOOR_BASE + DOOR_BLOCK * position,
                               offset=DOOR_TILES * position)
    return order


table = native_door_table()
door_sets = content_doors(table)
all_animations = {}
for tileset, doors in sorted(door_sets.items()):
    order = door_plan(table, doors)
    pack = data['tilesets'][tileset]
    image = Image.open(session.target / f'assets/tiles-{tileset}.png').convert('RGBA')
    count = DOOR_TILES * len(order)
    # A raw tile number is 10 bits; the palette nibble above it is free here, so the whole door
    # block lives under one unused palette slot instead of overflowing into the flip bits.
    previous = sorted(int(key) for key in pack['lookup'] if int(key) >> 12 == DOOR_TILE_PALETTE)
    if previous:
        # On repeat import, replace our appended tiles instead of growing the atlas.
        start = pack['lookup'][str(previous[0])]
        if pack['atlas']['tileCount'] != start + len(previous):
            raise ValueError('Door atlas has additional downstream tiles; re-import grid before opening-art')
        for key in previous:
            del pack['lookup'][str(key)]
    else:
        start = pack['atlas']['tileCount']
    total = start + count
    atlas = Image.new('RGBA', (image.width, math.ceil(total / pack['columns']) * 8))
    atlas.paste(image.crop((0, 0, atlas.width, min(image.height, atlas.height))))
    animations = {}
    for metatile in order:
        plan = doors[metatile]
        palettes = {slot: palette(f"{plan['directories'][0 if slot < 6 else 1]}/{slot:02d}.pal") for slot in sorted(set(plan['palettes']))}
        art = Image.open(read(f"graphics/door_anims/{plan['graphic']}.png"))
        frames = []
        for frame in range(DOOR_FRAMES):
            tiles = []
            for i in range(8):
                key = (DOOR_TILE_PALETTE << 12) | (plan['offset'] + frame * 8 + i)
                index = start + plan['offset'] + frame * 8 + i
                tile = art.crop((i % 2 * 8, frame * 32 + i // 2 * 8,
                                 i % 2 * 8 + 8, frame * 32 + i // 2 * 8 + 8))
                atlas.paste(paint(tile, palettes[plan['palettes'][i]], True),
                            (index % pack['columns'] * 8, index // pack['columns'] * 8))
                pack['lookup'][str(key)] = index
                tiles.append(key)
            frames.append([])
            for half in range(2):
                ident = str(plan['base'] + frame * 2 + half)
                pack['metatiles'][ident] = tiles[half * 4:half * 4 + 4] + [0, 0, 0, 0]
                pack['attributes'][ident] = 0
                frames[-1].append(plan['base'] + frame * 2 + half)
        animations[metatile] = {'sound': plan['sound'], 'open': frames}
    pack['atlas'] = {'width': atlas.width, 'height': atlas.height, 'tileCount': total}
    session.image(atlas, session.target / f'assets/tiles-{tileset}.png')
    all_animations[tileset] = animations
animations = all_animations['general-petalburg']
ball = Image.open(read('graphics/battle_transitions/pokeball.png'))
session.image(paint(ball, palette('graphics/field_effects/palettes/pokeball.pal'), True),
              session.target / 'assets/battle-transition-pokeball.png')
def frozen_animations(records):
    return 'Object.freeze({' + ','.join(
        f'{metatile}:Object.freeze({{sound:{json.dumps(entry["sound"])},open:Object.freeze([' +
        ','.join('Object.freeze([' + ','.join(str(v) for v in pair) + '])' for pair in entry['open']) +
        '])})' for metatile, entry in sorted(records.items())) + '})'

session.text(session.target / 'packs/emerald/generated/door-anims.js',
             generated_header('import-opening-art.py', source) +
             'export const DOOR_ANIMATIONS_BY_TILESET = Object.freeze({' +
             ','.join(json.dumps(key) + ':' + frozen_animations(records) for key, records in sorted(all_animations.items())) +
             '});\nexport const DOOR_ANIMATIONS = DOOR_ANIMATIONS_BY_TILESET["general-petalburg"];\n')
session.text(session.target / 'assets/opening-art-source.json', json.dumps({
    'generator': 'tools/import.py opening-art', 'revision': source_revision(source),
    'inputs': sorted({x['path']: x for x in inputs}.values(), key=lambda x: x['path']),
    'doorTilesets': all_animations,
    'doorMetatiles': {str(metatile): [pair for pair in animations[metatile]['open']]
                      for metatile in sorted(animations)},
}, indent=2) + '\n')

session.content(data)
session.finish()
