"""Import native directional movement frames and their anchors, without touching map atlases."""
from imports.context import ImportSession, arguments
import argparse, json
from pathlib import Path
from PIL import Image
parser=argparse.ArgumentParser(); parser.add_argument('source'); args=arguments(parser);session=ImportSession(args,"import-movement.py")
r=Path(args.source); d=session.dist; data=session.load()
palette=[tuple(map(int,line.split())) for line in (r/'graphics/object_events/palettes/brendan.pal').read_text().splitlines()[3:19]]
for id,file in [('BrendanMachBike','mach_bike'),('BrendanAcroBike','acro_bike'),('BrendanSurf','surfing')]:
    image=Image.open(r/f'graphics/object_events/pics/people/brendan/{file}.png')
    output=Image.new('RGBA',image.size);output.putdata([(*palette[int(v)%16],255 if int(v)%16 else 0) for v in image.getdata()]);session.image(output,d/f'assets/actor-{id}.png')
    entry={'w':32,'h':32,'offsetX':-8}
    if id=='BrendanSurf':
        entry['frames']={'facing':{'down':0,'up':2,'left':4,'right':4},'walk':{'down':[0,1],'up':[2,3],'left':[4,5],'right':[4,5]}}
    data['actors'][id]={**data['actors'].get(id,{}),**entry}
    print(id,image.size)
image=Image.open(r/'graphics/field_effects/pics/surf_blob.png')
output=Image.new('RGBA',image.size);output.putdata([(*palette[int(v)%16],255 if int(v)%16 else 0) for v in image.getdata()]);session.image(output,d/'assets/actor-SurfBlob.png')
data['actors']['SurfBlob']={'w':32,'h':32,'offsetX':-8,'frames':{'facing':{'down':0,'up':1,'left':2,'right':2},'walk':{'down':[0],'up':[1],'left':[2],'right':[2]}}}
data['actors']['BrendanSurf']['underlay']={'actor':'SurfBlob','offsetY':8}
image=Image.open(r/'graphics/field_effects/pics/bird.png')
output=Image.new('RGBA',image.size);output.putdata([(*palette[int(v)%16],255 if int(v)%16 else 0) for v in image.getdata()]);session.image(output,d/'assets/actor-FlyBird.png')
data['actors']['FlyBird']={'w':32,'h':32,'offsetX':-8,'frames':{'facing':dict.fromkeys(['down','up','left','right'],0),'walk':{v:[0] for v in ['down','up','left','right']}}}
session.content(data)

session.finish()
