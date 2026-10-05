"""Decode native gbagfx 4bpp PNG inputs; indexed and grayscale have different semantics."""
from PIL import Image
from functools import lru_cache
import re


@lru_cache(maxsize=8)
def icon_palette_sources(source):
    """Resolve the native shared icon banks; normal.pal is battle art only."""
    table = (source / 'src/pokemon_icon.c').read_text()
    block = re.search(r'gMonIconPaletteIndices\[\]\s*=\s*\{(.*?)\};', table, re.S)
    graphics = (source / 'src/graphics.c').read_text()
    palettes = re.search(r'gMonIconPalettes\[\]\[16\]\s*=\s*\{(.*?)\};', graphics, re.S)
    if not block or not palettes:
        raise ValueError('Missing native icon palette tables')
    return (dict(re.findall(r'\[SPECIES_(\w+)\]\s*=\s*(\d+)', block[1])),
            re.findall(r'INCGFX_U16\("([^"]+)"', palettes[1]))


def icon_palette_path(source, species):
    indices, paths = icon_palette_sources(source)
    index = indices.get(species.upper())
    if index is None or int(index) >= len(paths):
        raise ValueError(f'Unknown native icon palette: {species}')
    return source / paths[int(index)]


def read_palette(path):
    return [tuple(map(int, line.split())) for line in path.read_text().splitlines()[3:19]]


def paint_4bpp(image, palette, transparent=False):
    if image.mode not in ('P', 'L'):
        raise ValueError(f'Unsupported source image mode: {image.mode}')
    if len(palette) != 16:
        raise ValueError('A 4bpp palette needs 16 colors')
    # gbagfx first truncates to 4bpp, then inverts non-indexed images.
    indices = [int(v) % 16 if image.mode == 'P' else 15 - int(v) % 16
               for v in image.getdata()]
    output = Image.new('RGBA', image.size)
    output.putdata([(*palette[v], 0 if transparent and v == 0 else 255) for v in indices])
    return output
