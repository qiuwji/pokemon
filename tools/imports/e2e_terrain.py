"""Tracked E2E terrain semantics. No dependency on work/ or the C reference.

Appearance choices originate in the user's visually verified table. Automated checks
prove atlas availability and open-water animation references, not visual realism.
"""
import json
from imports.context import PROJECT

CONFIG = PROJECT / 'tools/imports/config'
TERRAIN = json.loads((CONFIG / 'e2e-terrain.json').read_text())
ANIMATIONS = json.loads((CONFIG / 'tile-animations.json').read_text())
TILESET = TERRAIN['tileset']
METATILES = TERRAIN['metatiles']
WATER_TILE_IDS = frozenset(n for value in ANIMATIONS.values() if value['semantic']=='water'
                          for n in range(value['start'],value['start']+value['count']))


def metatile_tiles(pack, ident):
    return pack['metatiles'].get(str(ident),[])


def water_animated(pack, ident):
    tiles = [value & 1023 for value in metatile_tiles(pack,ident) if value]
    return bool(tiles) and all(value in WATER_TILE_IDS for value in tiles)


def verify_metatiles(content):
    pack = content['tilesets'][TILESET]
    errors = []
    for name,ident in METATILES.items():
        values = metatile_tiles(pack,ident)
        if len(values)!=8:
            errors.append(f'{name}: missing complete metatile {ident}')
        if water_animated(pack,ident)!=(name=='water'):
            errors.append(f'{name}: incorrect open-water semantics {ident}')
        expected = TERRAIN.get('expectedBehaviors',{}).get(name)
        if expected is not None and pack['attributes'].get(str(ident),0)&255 != expected:
            errors.append(f'{name}: source attribute does not match {expected}')
        for value in values:
            base = str(value & ~3072)
            if base not in pack['lookup']:
                errors.append(f'{name}: missing atlas tile {base}')
            if (value & 1023) in WATER_TILE_IDS and base not in pack['animations']:
                errors.append(f'{name}: missing water animation {base}')
    return errors


def render(content, resources, ident, frame=0, zoom=6):
    """Match canvas grid's background, two layers and flip bits for visual review."""
    from PIL import Image
    pack = content['tilesets'][TILESET]
    atlas = Image.open(resources / f'assets/tiles-{TILESET}.png').convert('RGBA')
    out = Image.new('RGBA',(16,16),(*pack['background'],255))
    for i,value in enumerate(metatile_tiles(pack,ident)):
        base = str(value & ~3072)
        animation = pack['animations'].get(base)
        index = animation['frames'][frame % len(animation['frames'])] if animation else pack['lookup'][base]
        x,y = index % pack['columns']*8,index // pack['columns']*8
        tile = atlas.crop((x,y,x+8,y+8))
        if value & 1024:tile = tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        if value & 2048:tile = tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        out.alpha_composite(tile,((i%2)*8,(i%4//2)*8))
    return out.resize((16*zoom,16*zoom),Image.Resampling.NEAREST)
