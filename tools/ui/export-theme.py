"""Export native Emerald window/tilemap UI assets. Read-only reference; deterministic --check.

python3 tools/ui/export-theme.py [--source /path/pokeemerald] [--check]
No ROM/emulator, no game content or source modifications. Requires tools/requirements.txt.
"""
import argparse
import hashlib
import io
import json
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=ROOT / 'work/pokeemerald')
parser.add_argument('--target', type=Path, default=ROOT / 'dist/assets/ui')
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
inputs = {}
outputs = {}

def read(relative):
    data = (args.source / relative).read_bytes()
    inputs[relative] = hashlib.sha256(data).hexdigest()
    return data

def png(relative):
    return Image.open(io.BytesIO(read('graphics/' + relative)))

def colors(relative):
    return [tuple(map(int, line.split())) for line in read('graphics/' + relative).decode().splitlines()[3:] if line.strip()]

def screen(tiles, tilemap, palette=None):
    image = png(tiles)
    entries = struct.unpack('<' + 'H' * 1024, read('graphics/' + tilemap))
    if palette is None:
        raw = image.getpalette()
        palette = [tuple(raw[i:i+3]) for i in range(0,len(raw),3)]
    output = Image.new('RGBA',(240,160))
    for y in range(20):
        for x in range(30):
            entry = entries[y * 32 + x]
            index, bank = entry & 1023, entry >> 12
            if index >= image.width * image.height // 64 or bank * 16 + 15 >= len(palette):
                raise ValueError(f'Invalid native tile/palette reference: {tilemap}/{x},{y}')
            tx,ty = index % (image.width // 8) * 8, index // (image.width // 8) * 8
            tile = image.crop((tx,ty,tx+8,ty+8))
            painted = Image.new('RGBA',(8,8))
            painted.putdata([(*palette[bank*16+int(v)%16],255) for v in tile.getdata()])
            if entry & 1024: painted = painted.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if entry & 2048: painted = painted.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            output.paste(painted,(x*8,y*8))
    return output

def add(name,image):
    buffer=io.BytesIO();image.save(buffer,format='PNG');outputs[name]=buffer.getvalue()

# Native 3×3 eight-pixel window frame can be reused by CSS border-image without stretching corners.
window=png('text_window/1.png')
rgba=window.convert('RGBA')
rgba.putdata([(*color[:3],0 if int(index)==0 else 255) for color,index in zip(rgba.getdata(),window.getdata())])
add('window.png',rgba)
add('party-background.png',screen('party_menu/bg.png','party_menu/bg.bin'))

def party_slot(name, width, height, selected=False, empty=False):
    """Party windows use byte tile indices and a private, remapped 16-color bank.

    Palette substitutions are from sPartyBox*PalIds in src/data/party_menu.h.
    """
    atlas = png('party_menu/bg.png')
    raw = atlas.getpalette()
    palette = [tuple(raw[i:i+3]) for i in range(0, len(raw), 3)]
    bank = palette[48:64]
    remap = ({1:17, 11:27, 12:28} if empty else
             dict(zip([4,5,6,1,7,8], [116,117,118,97,103,104] if selected else [52,53,54,49,55,56])))
    for local, original in remap.items(): bank[local] = palette[original]
    entries = read('graphics/party_menu/' + name + '.bin')
    if len(entries) != width * height: raise ValueError('Invalid party slot tilemap size')
    output = Image.new('RGBA', (width*8, height*8))
    for i, index in enumerate(entries):
        if index >= atlas.width * atlas.height // 64: raise ValueError('Invalid party slot tile')
        x, y = index % (atlas.width//8)*8, index // (atlas.width//8)*8
        tile = atlas.crop((x,y,x+8,y+8))
        painted = Image.new('RGBA', (8,8))
        painted.putdata([(*bank[int(v)%16], 0 if int(v)%16 == 0 else 255) for v in tile.getdata()])
        output.paste(painted, (i%width*8, i//width*8))
    return output

for name, width, height in [('slot_main',10,7), ('slot_main_no_hp',10,7), ('slot_wide',18,3), ('slot_wide_no_hp',18,3)]:
    for selected in [False, True]:
        add('party-' + name.replace('_','-') + ('-selected' if selected else '') + '.png',
            party_slot(name,width,height,selected))
add('party-slot-wide-empty.png', party_slot('slot_wide_empty',18,3,empty=True))

for gender in ['male','female']:
    add(f'bag-{gender}.png',screen('bag/menu.png','bag/menu.bin',colors(f'bag/menu_{gender}.pal')))
add('summary-background.png',screen('summary_screen/tiles.png','summary_screen/page_info.bin'))
outputs['source.json']=(json.dumps({'source':'pret/pokeemerald','inputs':inputs,'outputs':{
    key:hashlib.sha256(data).hexdigest() for key,data in outputs.items()}},indent=2)+'\n').encode()
changed=[]
for name,data in outputs.items():
    target=args.target/name
    if not target.exists() or target.read_bytes()!=data:
        changed.append(name)
        if not args.check:
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
print(json.dumps({'check':args.check,'files':changed},indent=2))
