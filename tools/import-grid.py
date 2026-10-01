"""Build 8x8 palette-aware tile atlases and 16x16 metatile definitions, never scene images."""
import argparse,json,re,struct,math
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('source');args=parser.parse_args();R=Path(args.source);D=Path(__file__).resolve().parents[1]/'dist';A=D/'assets';db=json.loads((D/'content.json').read_text());layouts={l['id']:l for l in json.loads((R/'data/layouts/layouts.json').read_text())['layouts']}
def pal(p):return [tuple(map(int,l.split())) for l in p.read_text().splitlines()[3:19]]
def words(p):b=p.read_bytes();return list(struct.unpack('<'+'H'*(len(b)//2),b))
def painted(im,palette):
 out=Image.new('RGBA',im.size);out.putdata([(*palette[int(v)%16],255 if int(v)%16 else 0) for v in im.getdata()]);return out
packs={}
for name,m in db['maps'].items():
 src=json.loads((R/f'data/maps/{name}/map.json').read_text());layout=layouts[src['layout']];names=[re.sub(r'(?<!^)(?=[A-Z])','_',layout[k].replace('gTileset_','')).lower() for k in ['primary_tileset','secondary_tileset']];key='-'.join(names);m['tileset']=key;m['border']=words(R/layout['border_filepath']);
 if key in packs:continue
 dirs=[R/f'data/tilesets/{kind}/{n}' for kind,n in zip(['primary','secondary'],names)];pals=[pal(dirs[0 if i<6 else 1]/f'palettes/{i:02d}.pal') for i in range(16)];imgs=[Image.open(d/'tiles.png') for d in dirs];meta={};attrs={}
 for side,d in enumerate(dirs):
  values=words(d/'metatiles.bin');ats=words(d/'metatile_attributes.bin')
  for i,a in enumerate(ats):meta[i+side*512]=values[i*8:i*8+8];attrs[i+side*512]=a
 ids=sorted({v&~3072 for row in meta.values() for v in row});tiles=[];lookup={};animations={}
 def append(im):i=len(tiles);tiles.append(im);return i
 for v in ids:
  idx=v&1023;pi=v>>12;side=0 if idx<512 else 1;idx=idx if side==0 else idx-512;im=imgs[side];x=idx%(im.width//8)*8;y=idx//(im.width//8)*8;lookup[v]=append(painted(im.crop((x,y,x+8,y+8)),pals[pi]));
  if names[0]=='general':
   for kind,start,count,ms in [('flower',508,4,240),('water',432,30,160),('sand_water_edge',464,10,160),('land_water_edge',480,10,160),('waterfall',496,6,80)]:
    if not start<=idx<start+count or side!=0:continue
    files=sorted((dirs[0]/f'anim/{kind}').glob('*.png'),key=lambda p:int(p.stem));frames=[]
    for file in files:
     anim=Image.open(file);n=idx-start;x=n%(anim.width//8)*8;y=n//(anim.width//8)*8;frames.append(append(painted(anim.crop((x,y,x+8,y+8)),pals[pi])))
    if kind=='flower':frames=[frames[0],frames[1],frames[0],frames[2]]
    animations[v]={'frames':frames,'ms':ms}
 width=256;height=math.ceil(len(tiles)/32)*8;atlas=Image.new('RGBA',(width,height))
 for i,tile in enumerate(tiles):atlas.alpha_composite(tile,(i%32*8,i//32*8))
 atlas.save(A/f'tiles-{key}.png');packs[key]={'tileSize':8,'gridSize':16,'columns':32,'lookup':lookup,'metatiles':meta,'attributes':attrs,'animations':animations,'background':list(pals[0][0])};print(key,len(tiles),'8x8 tiles',len(meta),'metatiles')
db['tilesets']=packs
# Include the native running poses, which share the same directional frame layout.
run=painted(Image.open(R/'graphics/object_events/pics/people/brendan/running.png'),pal(R/'graphics/object_events/palettes/brendan.pal'));run.save(A/'actor-BrendanRun.png');db['actors']['BrendanRun']={'w':16,'h':32}
(D/'content.json').write_text(json.dumps(db,ensure_ascii=False,separators=(',',':')))
