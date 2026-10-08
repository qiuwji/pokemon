"""Build 8x8 palette-aware tile atlases and 16x16 metatile definitions, never scene images."""
from imports.context import PROJECT, ImportSession, arguments, source_argument
import argparse,json,re,struct,math
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser();source_argument(parser);args=arguments(parser, selectors=('maps',), profile=True);session=ImportSession(args,"import-grid.py");R=Path(args.source);D=session.target;A=D/'assets';db=session.load();layouts={l['id']:l for l in json.loads((R/'data/layouts/layouts.json').read_text())['layouts']}
def pal(p):return [tuple(map(int,l.split())) for l in p.read_text().splitlines()[3:19]]
def words(p):b=p.read_bytes();return list(struct.unpack('<'+'H'*(len(b)//2),b))
def painted(im,palette):
 out=Image.new('RGBA',im.size);out.putdata([(*palette[int(v)%16],255 if int(v)%16 else 0) for v in im.getdata()]);return out
packs={}
for name in session.select('maps', db['maps']):
 m=db['maps'][name]
 source_map=R/f'data/maps/{name}/map.json'
 if not source_map.exists():raise ValueError('Map has no reference header: '+name)
 src=json.loads(source_map.read_text());layout=layouts[src['layout']];names=[re.sub(r'(?<!^)(?=[A-Z])','_',layout[k].replace('gTileset_','')).lower() for k in ['primary_tileset','secondary_tileset']];key='-'.join(names);m['tileset']=key;m['border']=words(R/layout['border_filepath']);m.pop('pendingGrid',None);
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
   for kind,animation in session.configuration('tileAnimations').items():
    start,count,ms=animation['start'],animation['count'],animation['ms']
    if not start<=idx<start+count or side!=animation.get('side',0) or names[side]!=animation.get('tileset','general'):continue
    files=sorted((dirs[side]/f'anim/{kind}').glob('*.png'),key=lambda p:int(p.stem));frames=[]
    for file in files:
     anim=Image.open(file);n=(idx-start)%animation.get('groupTiles',count);x=n%(anim.width//8)*8;y=n//(anim.width//8)*8;frames.append(append(painted(anim.crop((x,y,x+8,y+8)),pals[pi])))
    if not frames:raise ValueError('Missing tile animation: '+kind)
    if 'order' in animation:frames=[frames[n] for n in animation['order']]
    group=(idx-start)//animation.get('groupTiles',count)
    phase=group*animation.get('phaseStep',0)
    frames=[frames[(i+phase)%len(frames)] for i in range(len(frames))]
    animations[v]={'frames':frames,'ms':ms,'offsetMs':animation.get('offsetMs',0)+group*animation.get('staggerMs',0)}
 width=256;height=math.ceil(len(tiles)/32)*8;atlas=Image.new('RGBA',(width,height))
 for i,tile in enumerate(tiles):atlas.alpha_composite(tile,(i%32*8,i//32*8))
 session.image(atlas,A/f'tiles-{key}.png');packs[key]={'tileSize':8,'gridSize':16,'columns':32,'atlas':{'width':width,'height':height,'tileCount':len(tiles)},'lookup':lookup,'metatiles':meta,'attributes':attrs,'animations':animations,'background':list(pals[0][0])};print(key,len(tiles),'8x8 tiles',len(meta),'metatiles')
db['tilesets'].update(packs)
# Include the native running poses, which share the same directional frame layout.
run=painted(Image.open(R/'graphics/object_events/pics/people/brendan/running.png'),pal(R/'graphics/object_events/palettes/brendan.pal'));session.image(run,A/'actor-BrendanRun.png');db['actors']['BrendanRun']={**db['actors'].get('BrendanRun',{}),'w':16,'h':32}
session.content(db)

session.finish()
