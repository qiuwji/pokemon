"""Import original egg frames as transparent pixel assets."""
import argparse
from imports.context import ImportSession, arguments, source_argument
from PIL import Image
parser=argparse.ArgumentParser(description=__doc__);source_argument(parser);args=arguments(parser);session=ImportSession(args, 'import-egg-assets.py')
r=session.source/'graphics/pokemon/egg';d=session.dist/'assets'
palette=[tuple(map(int,v.split()))for v in (r/'normal.pal').read_text().splitlines()[3:19]]
for name in ['front','icon','hatch','shard']:
    image=Image.open(r/f'{name}.png');output=Image.new('RGBA',image.size);output.putdata([(*palette[int(v)%16],255 if int(v)%16 else 0)for v in image.getdata()]);session.image(output,d/f'egg-{name}.png');print(name,image.size)

session.finish()
