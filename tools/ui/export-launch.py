"""Export original title layers, movie graphics and main-menu policies, without a C runtime."""
import argparse
from pathlib import Path
import re
from PIL import Image
from native_art import NativeArt
from launch_movie_art import export_movie

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=ROOT / 'work/pokeemerald')
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
art = NativeArt(args.source, ROOT, 'launch')
for path in ['src/intro.c', 'src/title_screen.c', 'src/main_menu.c', 'src/intro_credits_graphics.c', 'src/data/graphics/intro_scene.h',
             'src/graphics.c', 'graphics_file_rules.mk']:
    art.read(path)

title = 'graphics/title_screen/'
# graphics_file_rules.mk exports only 224 logo colours. graphics.c appends the
# 16 Rayquaza/cloud colours at BG bank 14, rather than after the PNG's 256 slots.
colors = art.palette(title + 'pokemon_logo.pal')[:224] + art.palette(title + 'rayquaza_and_clouds.pal')
art.add('title-logo', art.tilemap(title + 'pokemon_logo.png', title + 'pokemon_logo.bin', colors, affine=True))
logo = art.tilemap(title + 'pokemon_logo.png', title + 'pokemon_logo.bin', colors, affine=True)
mask = art.indexed(title + 'logo_shine.png')
for name, count, speed, starts in [('shine-single', 69, 4, [0]), ('shine-double', 45, 8, [0, -80])]:
    sheet = Image.new('RGBA', (256, count * 256))
    for frame in range(count):
        out = logo.copy()
        for y in range(logo.height):
            for x in range(logo.width):
                if not logo.getpixel((x, y))[3]: continue
                if any(0 <= x + 29 - (start + speed * frame - 32) < 64 and
                       0 <= y + 32 - 36 < 64 and mask.getpixel((x + 29 - (start + speed * frame - 32), y - 4)) != 0 for start in starts):
                    rgb = logo.getpixel((x, y))[:3]
                    out.putpixel((x, y), (*(min(31, (v >> 3) + ((31 - (v >> 3)) * 12 >> 4)) << 3 for v in rgb), 255))
        sheet.paste(out, (0, frame * 256))
    art.add('title-' + name, sheet)
for name in ['rayquaza', 'clouds']:
    art.add('title-' + name, art.tilemap(title + name + '.png', title + name + '.bin', colors))
mark_colors = [(0, 0, 0)] * 256
mark_colors[239] = (248, 248, 248)
marking = art.tilemap(title + 'rayquaza.png', title + 'rayquaza.bin', mark_colors)
for y in range(marking.height):
    for x in range(marking.width):
        if marking.getpixel((x, y))[:3] == (0, 0, 0): marking.putpixel((x, y), (0, 0, 0, 0))
art.add('title-marking', marking)
# -mwidth/-mheight in graphics.c packs these images in sprite order.
version = art.indexed(title + 'emerald_version.png')
pal = art.palette(title + 'emerald_version.png')
rgba = Image.new('RGBA', version.size)
rgba.putdata([(*pal[v], 0 if v == 0 else 255) for v in version.getdata()])
art.add('title-version', rgba)
press = art.indexed(title + 'press_start.png')
pal = art.palette(title + 'press_start.png')
# The GBA export has a leading blank tile before 32x8 metasprite blocks.
raw = []
for y in range(0, press.height, 8):
    for x in range(0, press.width, 32):
        raw.extend(press.crop((x, y, x + 32, y + 8)).getdata())
tiles = Image.new('P', (8, len(raw) // 8))
# Reorder metasprite data into linear 8x8 tiles before applying native offsets 1..37.
tile_values = []
for y in range(0, press.height, 8):
    for x in range(0, press.width, 32):
        for tx in range(x, x + 32, 8): tile_values.extend(press.crop((tx, y, tx+8, y+8)).getdata())
tiles.putdata(tile_values)
for name, first in [('press-start', 1), ('title-copyright', 21)]:
    out = Image.new('RGBA', (160, 8))
    for i in range(5):
        part = art.raw_tiles(tiles, first + i * 4, 32, 8)
        layer = Image.new('RGBA', part.size); layer.putdata([(*pal[v], 0 if v == 0 else 255) for v in part.getdata()])
        out.paste(layer, (i * 32, 0))
    art.add(name, out)
art.add('solid', Image.new('RGBA', (240, 160), (0, 0, 0, 255)))
art.add('copyright', art.tilemap('graphics/intro/copyright.png', 'graphics/intro/copyright.bin', art.palette('graphics/intro/copyright.png'), transparent=False))

# Regional caught count uses the source's first 202 Hoenn entries.
source = art.read('src/pokemon.c').decode()
names = re.findall(r'HOENN_TO_NATIONAL\((\w+)\)', source.split('static const u16 sHoennToNationalOrder')[1].split('};')[0])[:202]
enum = art.read('include/constants/pokedex.h').decode().split('enum')[1].split('};')[0]
national = re.findall(r'NATIONAL_DEX_(\w+)', enum)
hoenn = [national.index(name) for name in names]
curves = export_movie(art)
art.finish('launch', {'LAUNCH_RESOURCES': art.resources, 'MOVIE_AFFINE_FRAMES': curves, 'HOENN_DEX': hoenn,
                     'LAUNCH_MENU_BACKGROUND': list(art.palette('graphics/interface/main_menu_bg.pal')[0])}, args.check)
