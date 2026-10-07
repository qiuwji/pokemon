"""Export native Emerald window/tilemap UI assets. Read-only reference; deterministic --check.

python3 tools/ui/export-theme.py [--source /path/pokeemerald] [--check]
No ROM/emulator, no game content or source modifications. Requires tools/requirements.txt.
"""
import argparse
import hashlib
import io
import json
import os
import re
import struct
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--source', type=Path, default=ROOT / 'work/pokeemerald')
parser.add_argument('--target', type=Path, default=ROOT / 'generated/assets/ui')
parser.add_argument('--metadata-target', type=Path, help='Default: generated/presentation, or TARGET/metadata for a custom target')
parser.add_argument('--check', action='store_true')
args = parser.parse_args()
inputs = {}
local_inputs = {}
outputs = {}
metadata_target = args.metadata_target or (ROOT / 'generated/presentation' if args.target.resolve() == (ROOT / 'generated/assets/ui').resolve() else args.target / 'metadata')
metadata_key = os.path.relpath(metadata_target / 'battle-assets.js', args.target)

def read(relative):
    data = (args.source / relative).read_bytes()
    inputs[relative] = hashlib.sha256(data).hexdigest()
    return data

def png(relative):
    return Image.open(io.BytesIO(read('graphics/' + relative)))

def colors(relative):
    return [tuple(map(int, line.split())) for line in read('graphics/' + relative).decode().splitlines()[3:] if line.strip()]

def screen(tiles, tilemap, palette=None, *, map_width=32, size=(240,160), bpp=4, transparent=False, tile_base=0, entry_bits=16, palette_base=0):
    image = png(tiles)
    data = read('graphics/' + tilemap)
    if entry_bits == 16 and len(data) % 2: raise ValueError('Invalid 16-bit tilemap length')
    entries = data if entry_bits == 8 else struct.unpack('<' + 'H' * (len(data)//2), data)
    if palette is None:
        raw = image.getpalette()
        palette = [tuple(raw[i:i+3]) for i in range(0,len(raw),3)]
    output = Image.new('RGBA',size)
    for y in range(size[1]//8):
        for x in range(size[0]//8):
            address = y * map_width + x
            if address >= len(entries): raise ValueError('Truncated native tilemap ' + tilemap)
            entry = entries[address]
            index, bank = (entry & 1023) - tile_base, ((entry >> 12) - palette_base) if bpp == 4 else 0
            if index < 0 or index >= image.width * image.height // 64:
                raise ValueError(f'Invalid native tile reference: {tilemap}/{x},{y}/{index}')
            tx,ty = index % (image.width // 8) * 8, index // (image.width // 8) * 8
            tile = image.crop((tx,ty,tx+8,ty+8))
            painted = Image.new('RGBA',(8,8))
            indices = [bank*16+int(v)%16 if bpp == 4 else int(v) for v in tile.getdata()]
            if min(indices) < 0 or max(indices) >= len(palette): raise ValueError('Invalid native palette ' + tilemap)
            painted.putdata([(*palette[v],0 if transparent and v % (16 if bpp == 4 else 256) == 0 else 255) for v in indices])
            if entry & 1024: painted = painted.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if entry & 2048: painted = painted.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
            output.paste(painted,(x*8,y*8))
    return output

def sprite(relative, palette=None):
    image = png(relative)
    if palette is None:
        raw = image.getpalette()
        palette = [tuple(raw[i:i+3]) for i in range(0,len(raw),3)]
    result = Image.new('RGBA', image.size)
    result.putdata([(*palette[int(v)],0 if int(v)==0 else 255) for v in image.getdata()])
    return result

def add(name,image):
    buffer=io.BytesIO();image.save(buffer,format='PNG');outputs[name]=buffer.getvalue()

# Native 3×3 eight-pixel window frame can be reused by CSS border-image without stretching corners.
window=png('text_window/1.png')
rgba=window.convert('RGBA')
rgba.putdata([(*color[:3],0 if int(index)==0 else 255) for color,index in zip(rgba.getdata(),window.getdata())])
add('window.png',rgba)
for number in range(1,21):
    indexed=png('text_window/'+str(number)+'.png')
    image=indexed.convert('RGBA')
    image.putdata([(*color[:3],0 if int(index)==0 else 255) for color,index in zip(image.getdata(),indexed.getdata())])
    add('window-'+str(number)+'.png',image)
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
# Full pages and sprites remain native resources. Layout/text overlays are authored in the pack.
for page in ['skills','battle_moves','contest_moves','info_egg']:
    image = screen('summary_screen/tiles.png','summary_screen/page_'+page+'.bin')
    if page != 'info_egg':
        image.paste(screen('summary_screen/tiles.png','summary_screen/page_info.bin').crop((0,0,80,160)),(0,0))
    add('summary-'+page.replace('_','-')+'.png',image)
for gender in ['male','female']:
    sheet = sprite('bag/bag_'+gender+'.png', colors('bag/bag.pal'))
    for pocket, frame in [('items',1),('balls',3),('machines',4),('berries',5),('key',2)]:
        add(f'bag-sprite-{gender}-{pocket}.png',sheet.crop((0,frame*64,64,(frame+1)*64)))
for kind, tilemap in [('list','list'),('info','info_screen')]:
    add('dex-'+kind+'.png',screen('pokedex/menu.png','pokedex/'+tilemap+'.bin',colors('pokedex/bg_hoenn.pal')))
for gender in ['male','female']:
    palette = colors('trainer_card/green.pal')
    if gender == 'female':
        replacement = colors('trainer_card/female_bg.pal')
        palette[:len(replacement)] = replacement
    bg = screen('trainer_card/tiles.png','trainer_card/bg.bin',palette,map_width=30)
    for face in ['front','back']:
        layer = screen('trainer_card/tiles.png','trainer_card/'+face+'.bin',palette,map_width=30,transparent=True)
        add(f'trainer-{gender}-{face}.png',Image.alpha_composite(bg,layer))
add('badges.png',sprite('trainer_card/badges.png'))
for gender, name in [('male','brendan'),('female','may')]:
    add('trainer-portrait-'+gender+'.png',sprite('trainers/front_pics/'+name+'.png',colors('trainers/palettes/'+name+'.pal')))
# Battle pictures are separate from overworld object sheets. Back pictures retain all
# four 64px frames; back_pic_anims.h uses 24/9/24/9/50 frames for the throw animation.
trainer_pictures = {}
for actor, name in [('BrendanNormal','brendan'), ('MayNormal','may'),
                    ('Youngster','youngster'), ('BugCatcher','bug_catcher'),
                    ('Lass','lass'), ('Norman','leader_norman'), ('Wally','wally')]:
    for side in ['front','back']:
        relative = 'trainers/'+side+'_pics/'+name+'.png'
        if not (args.source/'graphics'/relative).exists():
            continue
        palette_path = 'trainers/palettes/'+name+'.pal'
        image = sprite(relative, colors(palette_path) if (args.source/'graphics'/palette_path).exists() else None)
        resource = 'battle-trainer-'+actor+'-'+side
        add(resource+'.png', image)
        trainer_pictures[actor+':'+side] = {
            'resource':resource, 'width':64, 'height':64,
            'frames':image.height//64, 'rest':3 if side == 'back' else 0,
            'throw':[[0,24],[1,9],[2,24],[0,9],[3,50]] if side == 'back' else [],
        }
for terrain, folder in [('grass','tall_grass'),('long_grass','long_grass'),
                         ('pond','pond_water'),('water','water'),('cave','cave'),
                         ('sand','sand'),('mountain','rock'),('indoor','building'),
                         ('underwater','underwater'),('plain','building')]:
    add('battle-background-'+terrain+'.png',screen(
        'battle_environment/'+folder+'/tiles.png',
        'battle_environment/'+folder+'/map.bin',
        colors('battle_environment/'+folder+'/palette.pal'),size=(240,112),palette_base=2))
mon_offsets = {}
for side in ['front','back']:
    table = read('src/data/pokemon_graphics/'+side+'_pic_coordinates.h').decode()
    for species, offset in re.findall(r'\[SPECIES_(\w+)\]\s*=\s*\{[^}]*\.y_offset\s*=\s*(\d+)',table):
        mon_offsets.setdefault(species.lower(),{})[side] = int(offset)
table = read('src/data/pokemon_graphics/enemy_mon_elevation.h').decode()
for species, offset in re.findall(r'\[SPECIES_(\w+)\]\s*=\s*(\d+)',table):
    mon_offsets.setdefault(species.lower(),{})['elevation'] = int(offset)
# Keep the source frame layout. The renderer mirrors the same frame and uses these
# palettes, rather than applying a generic blue/transparent filter to every NPC.
info = read('src/data/object_events/object_event_graphics_info.h').decode()
graphics = read('src/data/object_events/object_event_graphics.h').decode()
actor_bytes = (ROOT/'src/content/actors.json').read_bytes()
local_inputs['src/content/actors.json'] = hashlib.sha256(actor_bytes).hexdigest()
actors = json.loads(actor_bytes)
reflection_pictures = {}
aliases = {'BrendanRun':'BrendanNormal','MayRun':'MayNormal',
           'BrendanSurf':'BrendanSurfing','MaySurf':'MaySurfing'}
for actor in actors:
    key = aliases.get(actor,actor)
    match = re.search(r'gObjectEventGraphicsInfo_'+key+r'\s*=\s*\{(.*?)\};',info,re.S)
    if not match:
        continue
    palette_name = re.search(r'\.paletteTag = OBJ_EVENT_PAL_TAG_(\w+)',match[1])[1].lower()
    if palette_name == 'none':
        slot = re.search(r'\.paletteSlot = PALSLOT_(NPC_\d)',match[1])
        if not slot:
            continue
        palette_name = slot[1].lower()
    reflection_palette = 'object_events/palettes/'+palette_name+'_reflection.pal'
    if not (args.source/'graphics'/reflection_palette).exists():
        continue
    picture_key = actor.replace('Run','Running').replace('Surf','Surfing')
    pic = re.search(r'gObjectEventPic_'+picture_key+r'\[\].*?INCGFX_U32\("graphics/([^" ]+)',graphics)
    if not pic:
        continue
    resource = 'reflection-'+actor
    add(resource+'.png',sprite(pic[1],colors(reflection_palette)))
    reflection_pictures[actor] = resource
outputs[metadata_key] = ('// @generated by tools/ui/export-theme.py; do not edit.\n'+
    'export const TRAINER_PICTURES = Object.freeze('+json.dumps(trainer_pictures,sort_keys=True)+');\n'+
    'export const MON_PICTURE_OFFSETS = Object.freeze('+json.dumps(mon_offsets,sort_keys=True)+');\n'+
    'export const REFLECTION_PICTURES = Object.freeze('+json.dumps(reflection_pictures,sort_keys=True)+');\n').encode()
# Forest build rule concatenates exactly 55 frame tiles and eight background tiles.
# Tilemap banks 1/2 refer to frame/background; bank zero is the clear tile.
frame = png('pokemon_storage/wallpapers/forest/frame.png')
bg = png('pokemon_storage/wallpapers/forest/bg.png')
entries = struct.unpack('<360H',read('graphics/pokemon_storage/wallpapers/forest/tilemap.bin'))
forest = Image.new('RGBA',(160,144))
for address, entry in enumerate(entries):
    index, bank = entry & 1023, entry >> 12
    atlas = frame if index < 55 else bg
    index = index if index < 55 else index - 55
    if index >= atlas.width * atlas.height // 64: raise ValueError('Invalid forest wallpaper tile')
    tile = atlas.crop((index % (atlas.width//8)*8,index // (atlas.width//8)*8,index % (atlas.width//8)*8+8,index // (atlas.width//8)*8+8))
    palette = (frame if bank == 1 else bg).getpalette()
    painted = Image.new('RGBA',(8,8));painted.putdata([(*palette[int(v)*3:int(v)*3+3],255) for v in tile.getdata()])
    if entry & 1024: painted = painted.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    if entry & 2048: painted = painted.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
    forest.paste(painted,(address%20*8,address//20*8))
add('storage-forest.png',forest)
add('storage.png',screen('pokemon_storage/menu.png','pokemon_storage/display_menu.bin',colors('pokemon_storage/interface.pal'),tile_base=256))
add('shop.png',screen('shop/menu.png','shop/menu.bin',transparent=True))
grass = screen('starter_choose/tiles.png','starter_choose/birch_grass.bin')
bag = screen('starter_choose/tiles.png','starter_choose/birch_bag.bin',transparent=True)
add('starter.png',Image.alpha_composite(grass,bag))
add('starter-balls.png',sprite('starter_choose/pokeball_selection.png').crop((0,0,32,96)))
add('starter-hand.png',sprite('starter_choose/pokeball_selection.png').crop((0,96,32,128)))
add('starter-circle.png',sprite('starter_choose/starter_circle.png'))
add('region-map.png',screen('pokenav/region_map/map.png','pokenav/region_map/map.bin',[(0,0,0)]*112+colors('pokenav/region_map/map.pal'),bpp=8,entry_bits=8,map_width=64))
add('region-frame.png',screen('pokenav/region_map/frame.png','pokenav/region_map/frame.bin',transparent=True,palette_base=1))
for ball in ['poke','great','safari','ultra','master','net','dive','nest','repeat','timer','luxury','premier']:
    add('ball-'+ball+'.png',sprite('balls/'+ball+'.png').crop((0,0,16,16)))
for kind in ['singles_player','singles_opponent','doubles_player','doubles_opponent']:
    add('healthbox-'+kind.replace('_','-')+'.png',sprite('battle_interface/healthbox_'+kind+'.png').crop((0,0,104,40 if kind=='singles_player' else 32)))
# Item icon ID and palette pairing are taken from the source tables (shared icons keep their own palette).
constants = read('src/data/graphics/items.h').decode()
paths = dict(re.findall(r'(gItemIcon(?:Palette)?_\w+)\[\]\s*=\s*INCGFX_U32\("graphics/([^" ]+)', constants))
table = read('src/data/item_icon_table.h').decode()
icon_map = {}
for item, graphic, palette in re.findall(r'\[ITEM_(\w+)\]\s*=\s*\{(gItemIcon_\w+),\s*(gItemIconPalette_\w+)\}',table):
    if graphic not in paths or palette not in paths: raise ValueError('Unknown item icon symbol '+item)
    filename = 'items/'+item.lower()+'.png'
    add(filename,sprite(paths[graphic],colors(paths[palette])))
    icon_map[item.lower()] = 'generated/assets/ui/'+filename
outputs['item-icons.json']=(json.dumps(icon_map,sort_keys=True,indent=2)+'\n').encode()
# Browser-ready lookup avoids an asynchronous asset fetch during a menu click.
lookup = {key.replace('_',''):value for key,value in icon_map.items()}
outputs['item-icons.js']=('// @generated by tools/ui/export-theme.py; do not edit.\nexport const ITEM_ICONS = Object.freeze('+json.dumps(lookup,sort_keys=True,indent=2)+');\n').encode()
outputs['source.json']=(json.dumps({'source':'pret/pokeemerald','revision':'731ad5bfd6e6f265508d0efcca0ba42f9dcf5881','inputs':inputs,'localInputs':local_inputs,'outputs':{
    key:hashlib.sha256(data).hexdigest() for key,data in outputs.items()}},indent=2)+'\n').encode()
changed=[]
for name,data in outputs.items():
    target=args.target/name
    if not target.exists() or target.read_bytes()!=data:
        changed.append(name)
        if not args.check:
            target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
print(json.dumps({'check':args.check,'files':changed},indent=2))
